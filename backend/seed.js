require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// ─── Models ───
const Product = require('./src/models/Product');
const AdminAccount = require('./src/models/AdminAccount');
const Branch = require('./src/models/Branch');

const products = [
    // ── Kebab ──
    { name: 'Arab Kebab', category: 'kebab', price: 45000, weight: '350g', prepTime: 20, isPopular: true, imageUrl: '/uploads/menu/arabkebab.jpg', ingredients: 'Mol go\'shti, piyoz, ziravorlar, lavash', description: { uz: 'An\'anaviy arab uslubidagi lazzatli kebab', ru: 'Традиционный арабский кебаб' } },
    { name: 'Iskandar Kebab', category: 'kebab', price: 55000, weight: '400g', prepTime: 25, isPopular: true, imageUrl: '/uploads/menu/iskandarkebab.jpg', ingredients: 'Mol go\'shti, qo\'ziqorin sousi, yogurt, lavash', description: { uz: 'Yogurt va qo\'ziqorin sousi bilan servis qilingan kebab', ru: 'Кебаб с йогуртом и грибным соусом' } },
    // ── Döner ──
    { name: 'Donar', category: 'doner', price: 35000, weight: '300g', prepTime: 10, isPopular: true, imageUrl: '/uploads/menu/donar.jpg', ingredients: 'Tovuq go\'shti, sabzavotlar, sous, lavash', description: { uz: 'Yangi sabzavotlar va maxsus sous bilan', ru: 'С овощами и фирменным соусом' } },
    { name: 'Shaurma', category: 'doner', price: 32000, weight: '280g', prepTime: 10, imageUrl: '/uploads/menu/shaurma.jpg', ingredients: 'Tovuq go\'shti, sabzavotlar, ketchup, lavash', description: { uz: 'Klassik shaurma', ru: 'Классическая шаурма' } },
    // ── Pide/Lavash ──
    { name: 'Lavash', category: 'pide', price: 28000, weight: '250g', prepTime: 12, imageUrl: '/uploads/menu/lavash.jpg', ingredients: 'Go\'sht, piyoz, ziravorlar, lavash', description: { uz: 'Yupqa lavashda tayyorlangan taom', ru: 'Блюдо в тонком лаваше' } },
    { name: 'Tandir Lavash', category: 'pide', price: 30000, weight: '280g', prepTime: 15, imageUrl: '/uploads/menu/tandirlavash.jpg', ingredients: 'Tandirda pishirilgan go\'sht, lavash', description: { uz: 'Tandirda pishirilgan lazzatli lavash', ru: 'Лаваш из тандыра' } },
    { name: 'Twister', category: 'doner', price: 32000, weight: '270g', prepTime: 10, imageUrl: '/uploads/menu/twister.jpg', ingredients: 'Tovuq go\'shti, sabzavotlar, sous, lavash', description: { uz: 'Tovuq go\'shti bilan twister', ru: 'Твистер с курицей' } },
    // ── Burger ──
    { name: 'Black Burger', category: 'burger', price: 48000, weight: '350g', prepTime: 18, isPopular: true, imageUrl: '/uploads/menu/blackburger.jpg', ingredients: 'Mol go\'shti, qora non, salat, pomidor, sous', description: { uz: 'Qora nonli premium burger', ru: 'Премиум бургер с чёрной булкой' } },
    { name: 'Chicken Burger', category: 'burger', price: 42000, weight: '320g', prepTime: 15, imageUrl: '/uploads/menu/chikkenburger.jpg', ingredients: 'Tovuq go\'shti, salat, pomidor, sous', description: { uz: 'Mazali tovuq burgeri', ru: 'Вкусный куриный бургер' } },
    { name: 'Club Burger', category: 'burger', price: 50000, weight: '380g', prepTime: 18, imageUrl: '/uploads/menu/klab.jpg', ingredients: 'Ikki qavat mol go\'shti, bacon, salat, pomidor', description: { uz: 'Ikki qavat go\'shtli klub burgeri', ru: 'Клаб-бургер с двойной котлетой' } },
    { name: 'Stack Burger', category: 'burger', price: 52000, weight: '400g', prepTime: 20, imageUrl: '/uploads/menu/stackbirger.jpg', ingredients: 'Uch qavat go\'sht, pishloq, sous', description: { uz: 'Uch qavat go\'shtli ulkan burger', ru: 'Тройной стек бургер' } },
    { name: 'Hamburger', category: 'burger', price: 38000, weight: '300g', prepTime: 15, imageUrl: '/uploads/menu/gamuburger.jpg', ingredients: 'Mol go\'shti, salat, pomidor, ketchup', description: { uz: 'Klassik hamburger', ru: 'Классический гамбургер' } },
    // ── Boshqa ──
    { name: 'Nagets', category: 'other', price: 28000, weight: '200g', prepTime: 12, imageUrl: '/uploads/menu/nagetsi.jpg', ingredients: 'Tovuq go\'shti, kraker, sous', description: { uz: 'Mazali tovuq nagetslari', ru: 'Куриные наггетсы' } },
    { name: 'Salat', category: 'salat', price: 22000, weight: '250g', prepTime: 8, imageUrl: '/uploads/menu/salat.jpg', ingredients: 'Yangi sabzavotlar, zaytun moyi', description: { uz: 'Yangi sabzavotlar salati', ru: 'Салат из свежих овощей' } },
    { name: 'Assort Set', category: 'set_menu', price: 120000, weight: '1kg', prepTime: 30, isPopular: true, imageUrl: '/uploads/menu/assartitaom.jpg', ingredients: 'Turli kebablar, garnirlari bilan', description: { uz: 'Katta kompaniya uchun assort set', ru: 'Ассорти сет для компании' } },
    { name: 'Guruch', category: 'garnir', price: 18000, weight: '300g', prepTime: 15, imageUrl: '/uploads/menu/guruch.jpg', ingredients: 'Guruch, sabzavotlar, ziravorlar', description: { uz: 'Garnir sifatida guruch', ru: 'Рис на гарнир' } },
    { name: 'Xaggi', category: 'other', price: 25000, weight: '200g', prepTime: 12, imageUrl: '/uploads/menu/xaggi.jpg', ingredients: 'Maxsus tarkib', description: { uz: 'Lazzatli xaggi', ru: 'Хагги' } },
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    // Mahsulotlar
    const existing = await Product.countDocuments();
    if (existing === 0) {
        await Product.insertMany(products.map(p => ({ ...p, isActive: true })));
        console.log(`✅ ${products.length} ta mahsulot qo'shildi`);
    } else {
        console.log(`ℹ️ ${existing} ta mahsulot allaqachon bor — o'tkazildi`);
    }

    // Default filial
    const branchExists = await Branch.countDocuments();
    if (branchExists === 0) {
        await Branch.create({
            number: 1,
            name: 'Chilonzor',
            address: 'Toshkent, Chilonzor tumani',
            phone: '+998 71 200 00 00',
            hours: '10:00 — 23:00',
            location: { lat: 41.2995, lng: 69.2401 },
            deliveryRadius: 10,
            minOrderAmount: 30000,
            isActive: true,
            isOpen: true,
        });
        console.log("✅ Default filial qo'shildi: Chilonzor");
    } else {
        console.log(`ℹ️ ${branchExists} ta filial allaqachon bor`);
    }

    // Admin hisob
    const adminExists = await AdminAccount.findOne({ username: 'admin' });
    if (!adminExists) {
        const hashed = await bcrypt.hash('efes2024', 10);
        await AdminAccount.create({ username: 'admin', password: hashed, role: 'admin' });
        console.log('✅ Admin hisob yaratildi: admin / efes2024');
    } else {
        console.log('ℹ️ Admin hisob allaqachon bor');
    }

    await mongoose.disconnect();
    console.log('✅ Seed tugadi');
}

seed().catch(e => { console.error(e); process.exit(1); });
