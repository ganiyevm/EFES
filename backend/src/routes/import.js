const router = require('express').Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const Product = require('../models/Product');
const ImportLog = require('../models/ImportLog');
const { authAdmin } = require('../middleware/auth');
const { CATEGORY_KEYS, CATEGORY_NAMES } = require('../config/constants');

// Excel'dagi kategoriya kalit ('kebab') yoki nom ('Kebab', 'Кебаб') bo'lishi mumkin
function normalizeCategory(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) return 'other';
    if (CATEGORY_KEYS.includes(v)) return v;
    for (const key of CATEGORY_KEYS) {
        const names = Object.values(CATEGORY_NAMES[key] || {}).map(n => n.toLowerCase());
        if (names.includes(v)) return key;
    }
    return 'other';
}

// ExcelJS katak qiymatini oddiy skalyarga aylantiradi
// (formula natijasi, rich-text, hyperlink kabi obyektlarni ham hisobga oladi).
function cellToValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        if (value.result !== undefined) return value.result;      // formula
        if (Array.isArray(value.richText)) return value.richText.map(t => t.text).join('');
        if (value.text !== undefined) return value.text;          // hyperlink
        if (value instanceof Date) return value;
        return '';
    }
    return value;
}

// ExcelJS worksheet'ni xlsx.sheet_to_json kabi obyektlar ro'yxatiga aylantiradi:
// birinchi qator — sarlavhalar, qolganlari — qiymatlar.
function sheetToRows(sheet) {
    const rows = [];
    if (!sheet || sheet.rowCount < 2) return rows;

    const headers = {};
    sheet.getRow(1).eachCell((cell, col) => {
        const name = String(cellToValue(cell.value) ?? '').trim();
        if (name) headers[col] = name;
    });

    for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const obj = {};
        let hasValue = false;
        row.eachCell((cell, col) => {
            const key = headers[col];
            if (!key) return;
            const val = cellToValue(cell.value);
            obj[key] = val;
            if (val !== '' && val !== null && val !== undefined) hasValue = true;
        });
        if (hasValue) rows.push(obj);
    }
    return rows;
}

// ExcelJS faqat OOXML (.xlsx) va CSV o'qiydi — eski BIFF (.xls) qo'llab-quvvatlanmaydi.
const ALLOWED_MIMETYPES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/octet-stream', // ba'zi browserlar
]);
const ALLOWED_EXTS = ['.xlsx'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = (file.originalname.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
        if (!ALLOWED_EXTS.includes(ext)) {
            return cb(new Error('Faqat .xlsx fayllar qabul qilinadi. Eski .xls faylni Excel\'da "Saqlash → .xlsx" orqali o\'zgartiring.'));
        }
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
            return cb(new Error('Yaroqsiz fayl turi'));
        }
        cb(null, true);
    },
});

router.use(authAdmin);

// ─── Excel import ───
router.post('/excel', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Fayl hajmi 5 MB dan oshmasligi kerak' : err.message });
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Fayl topilmadi' });

        const workbook = new ExcelJS.Workbook();
        try {
            await workbook.xlsx.load(req.file.buffer);
        } catch {
            return res.status(400).json({ error: 'Faylni o\'qib bo\'lmadi. Iltimos haqiqiy .xlsx (Excel) faylini yuklang.' });
        }
        const sheet = workbook.worksheets[0];
        if (!sheet) return res.status(400).json({ error: 'Excel faylida varaq topilmadi' });
        const rows = sheetToRows(sheet);

        let imported = 0;
        let errors = 0;

        for (const row of rows) {
            try {
                const name = String(row['Nomi'] || row['Name'] || row['name'] || '').trim();
                if (!name) { errors++; continue; }

                const price = parseInt(String(row['Narx'] ?? row['Price'] ?? '').replace(/[\s,]/g, ''), 10);
                if (!Number.isFinite(price) || price <= 0) { errors++; continue; }

                await Product.findOneAndUpdate(
                    { name },
                    {
                        name,
                        category: normalizeCategory(row['Kategoriya'] || row['Category']),
                        price,
                        weight: String(row['Vazn'] || row['Weight'] || '').trim(),
                        calories: parseInt(row['Kaloriya'] || row['Calories'] || 0) || 0,
                        prepTime: parseInt(row['Vaqt'] || row['PrepTime'] || 15) || 15,
                        ingredients: String(row['Tarkibi'] || row['Ingredients'] || '').trim(),
                        description: {
                            uz: String(row['Tavsif_uz'] || row['Description_uz'] || '').trim(),
                            ru: String(row['Tavsif_ru'] || row['Description_ru'] || '').trim(),
                        },
                        isActive: true,
                    },
                    { upsert: true, new: true, runValidators: true }
                );
                imported++;
            } catch (e) {
                errors++;
            }
        }

        const log = await ImportLog.create({
            filename: req.file.originalname,
            totalRows: rows.length,
            imported,
            errors,
        });

        res.json({ success: true, totalRows: rows.length, imported, errors, logId: log._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Import tarixi ───
router.get('/logs', async (req, res) => {
    try {
        const logs = await ImportLog.find().sort({ createdAt: -1 }).limit(20);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
