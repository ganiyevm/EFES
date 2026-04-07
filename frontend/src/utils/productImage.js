// Mahsulot nomiga va kategoriyasiga qarab rasm qaytaradi
// /menu/ papkasidagi rasmlar frontend/public/menu/ da joylashgan

const NAME_MAP = [
    { keys: ['arab', 'araб'], img: 'arabkebab.jpg' },
    { keys: ['iskandar', 'искандар'], img: 'iskandarkebab.jpg' },
    { keys: ['kebab', 'кебаб', 'кабоб', 'kabob'], img: 'arabkebab.jpg' },
    { keys: ['donar', 'донер', 'doner'], img: 'donar.jpg' },
    { keys: ['shaurma', 'shawarma', 'шаурма'], img: 'shaurma.jpg' },
    { keys: ['lavash', 'лаваш'], img: 'lavash.jpg' },
    { keys: ['tandir', 'тандир'], img: 'tandirlavash.jpg' },
    { keys: ['twister', 'твистер'], img: 'twister.jpg' },
    { keys: ['black burger', 'black', 'блэк'], img: 'blackburger.jpg' },
    { keys: ['chicken burger', 'chikken', 'chickenburger', 'chicken'], img: 'chikkenburger.jpg' },
    { keys: ['club', 'klab', 'клаб'], img: 'klab.jpg' },
    { keys: ['stack', 'стэк'], img: 'stackbirger.jpg' },
    { keys: ['hamburger', 'gamburger', 'гамбургер'], img: 'gamuburger.jpg' },
    { keys: ['burger', 'бургер'], img: 'gamuburger.jpg' },
    { keys: ['nagets', 'nugget', 'наггетс', 'нагетс'], img: 'nagetsi.jpg' },
    { keys: ['salat', 'salad', 'салат'], img: 'salat.jpg' },
    { keys: ['assort', 'ассорт', 'set', 'сет', 'combo'], img: 'assartitaom.jpg' },
    { keys: ['guruch', 'rice', 'рис', 'плов', 'palov'], img: 'guruch.jpg' },
    { keys: ['xaggi', 'хагги'], img: 'xaggi.jpg' },
];

const CATEGORY_MAP = {
    kebab: 'arabkebab.jpg',
    doner: 'donar.jpg',
    pide: 'tandirlavash.jpg',
    izgara: 'iskandarkebab.jpg',
    burger: 'gamuburger.jpg',
    salat: 'salat.jpg',
    garnir: 'guruch.jpg',
    set_menu: 'assartitaom.jpg',
    other: 'assartitaom.jpg',
};

const DEFAULT_IMG = 'assartitaom.jpg';

export function getProductImage(product) {
    if (!product) return `/uploads/menu/${DEFAULT_IMG}`;

    // 1. Agar allaqachon imageUrl bo'lsa — uni ishlatamiz
    if (product.imageUrl && product.imageUrl.trim()) return product.imageUrl;

    const name = (product.name || '').toLowerCase();

    // 2. Nom bo'yicha qidiramiz
    for (const entry of NAME_MAP) {
        if (entry.keys.some(k => name.includes(k.toLowerCase()))) {
            return `/uploads/menu/${entry.img}`;
        }
    }

    // 3. Kategoriya bo'yicha
    const cat = (product.category || '').toLowerCase();
    if (CATEGORY_MAP[cat]) return `/uploads/menu/${CATEGORY_MAP[cat]}`;

    // 4. Default
    return `/uploads/menu/${DEFAULT_IMG}`;
}

// Admin panel uchun — barcha mavjud rasmlar ro'yxati
export const MENU_IMAGES = [
    { file: 'arabkebab.jpg', label: 'Arab Kebab' },
    { file: 'iskandarkebab.jpg', label: 'Iskandar Kebab' },
    { file: 'donar.jpg', label: 'Donar' },
    { file: 'shaurma.jpg', label: 'Shaurma' },
    { file: 'lavash.jpg', label: 'Lavash' },
    { file: 'tandirlavash.jpg', label: 'Tandir Lavash' },
    { file: 'twister.jpg', label: 'Twister' },
    { file: 'blackburger.jpg', label: 'Black Burger' },
    { file: 'chikkenburger.jpg', label: 'Chicken Burger' },
    { file: 'klab.jpg', label: 'Club Burger' },
    { file: 'stackbirger.jpg', label: 'Stack Burger' },
    { file: 'gamuburger.jpg', label: 'Hamburger' },
    { file: 'nagetsi.jpg', label: 'Nagets' },
    { file: 'salat.jpg', label: 'Salat' },
    { file: 'assartitaom.jpg', label: 'Assort / Set' },
    { file: 'guruch.jpg', label: 'Guruch / Palov' },
    { file: 'xaggi.jpg', label: 'Xaggi' },
];
