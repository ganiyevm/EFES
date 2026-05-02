/**
 * Rasm yuklash servisi.
 * CLOUDINARY_URL env o'rnatilgan bo'lsa — Cloudinary ishlatadi.
 * Aks holda eski local disk saqlash ishlaydi.
 *
 * Cloudinary sozlash:
 *   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
 *   yoki alohida:
 *   CLOUDINARY_CLOUD_NAME=...
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

// ─── Cloudinary mavjudligini tekshirish ───
function isCloudinaryConfigured() {
    return !!(
        process.env.CLOUDINARY_URL ||
        (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    );
}

// ─── Cloudinary uploader (lazy-load, paket o'rnatilmagan bo'lsa xato bermaydi) ───
let _cloudinary = null;
function getCloudinary() {
    if (_cloudinary) return _cloudinary;
    try {
        _cloudinary = require('cloudinary').v2;
        _cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
    } catch {
        throw new Error('cloudinary paketi o\'rnatilmagan. npm install cloudinary --save');
    }
    return _cloudinary;
}

// ─── Multer: vaqtinchalik disk saqlash (keyinchalik Cloudinary ga ko'chiriladi) ───
const tmpStorage = multer.diskStorage({
    destination(req, file, cb) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        cb(null, UPLOAD_DIR);
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `tmp_${Date.now()}${ext}`);
    },
});

const imageFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Faqat rasm fayllari: jpeg, png, webp, gif'), false);
};

const upload = multer({
    storage: tmpStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: imageFilter,
});

// ─── Rasmni saqlash: Cloudinary yoki local ───
async function saveImage(file, folder = 'efes/products') {
    if (!isCloudinaryConfigured()) {
        // Local saqlash — faqat serverda ishlaydi
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `product_${Date.now()}${ext}`;
        const dest = path.join(UPLOAD_DIR, filename);
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.renameSync(file.path, dest);
        return `/uploads/${filename}`;
    }

    // Cloudinary ga yuklash
    const cloudinary = getCloudinary();
    const result = await cloudinary.uploader.upload(file.path, {
        folder,
        transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
        ],
    });

    // Vaqtinchalik faylni o'chirish
    try { fs.unlinkSync(file.path); } catch { /* ahamiyatsiz */ }

    return result.secure_url;
}

// ─── Cloudinary dan rasmni o'chirish ───
async function deleteImage(imageUrl) {
    if (!imageUrl || !isCloudinaryConfigured()) return;
    if (!imageUrl.includes('cloudinary.com')) return;

    try {
        const cloudinary = getCloudinary();
        // URL dan public_id ni ajratib olish
        const parts = imageUrl.split('/');
        const uploadIdx = parts.indexOf('upload');
        if (uploadIdx === -1) return;
        const withExt = parts.slice(uploadIdx + 2).join('/');
        const publicId = withExt.replace(/\.[^.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
    } catch (e) {
        console.error('[CLOUDINARY DELETE]', e.message);
    }
}

module.exports = { upload, saveImage, deleteImage, isCloudinaryConfigured };
