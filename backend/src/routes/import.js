const router = require('express').Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Product = require('../models/Product');
const ImportLog = require('../models/ImportLog');
const { authAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authAdmin);

// ─── Excel import ───
router.post('/excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Fayl topilmadi' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        let imported = 0;
        let errors = 0;

        for (const row of rows) {
            try {
                const name = row['Nomi'] || row['Name'] || row['name'];
                if (!name) { errors++; continue; }

                await Product.findOneAndUpdate(
                    { name: name.trim() },
                    {
                        name: name.trim(),
                        category: row['Kategoriya'] || row['Category'] || 'other',
                        price: parseInt(row['Narx'] || row['Price'] || 0),
                        weight: row['Vazn'] || row['Weight'] || '',
                        calories: parseInt(row['Kaloriya'] || row['Calories'] || 0),
                        prepTime: parseInt(row['Vaqt'] || row['PrepTime'] || 15),
                        ingredients: row['Tarkibi'] || row['Ingredients'] || '',
                        description: {
                            uz: row['Tavsif_uz'] || row['Description_uz'] || '',
                            ru: row['Tavsif_ru'] || row['Description_ru'] || '',
                        },
                        isActive: true,
                    },
                    { upsert: true, new: true }
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
