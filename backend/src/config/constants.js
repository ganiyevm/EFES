// EFES Kategoriya kalitlari
const CATEGORY_KEYS = [
    'kebab',          // Kebab va grilllar
    'doner',          // Döner va wraps
    'pide',           // Pide va Lahmacun
    'corba',          // Sho'rvalar
    'salat',          // Salatlar
    'izgara',         // Izgara (grilled meats)
    'manti',          // Manti va chuchvara
    'burger',         // Burgerlar
    'pizza',          // Pizza
    'hot_dog',        // Hot Dog
    'drink',          // Ichimliklar
    'dessert',        // Desertlar
    'set_menu',       // Set menyu
    'garnir',         // Garnirlar
    'sous',           // Sous va qo'shimchalar
    'other',          // Boshqa
];

const CATEGORY_NAMES = {
    kebab: { uz: 'Kebab', ru: 'Кебаб', en: 'Kebab' },
    doner: { uz: 'Döner', ru: 'Донер', en: 'Döner' },
    pide: { uz: 'Pide & Lahmacun', ru: 'Пиде и Лахмаджун', en: 'Pide & Lahmacun' },
    corba: { uz: "Sho'rva", ru: 'Суп', en: 'Soup' },
    salat: { uz: 'Salatlar', ru: 'Салаты', en: 'Salads' },
    izgara: { uz: 'Izgara', ru: 'Гриль', en: 'Grilled' },
    manti: { uz: 'Manti', ru: 'Манты', en: 'Manti' },
    burger: { uz: 'Burger', ru: 'Бургер', en: 'Burger' },
    pizza: { uz: 'Pizza', ru: 'Пицца', en: 'Pizza' },
    hot_dog: { uz: 'Hot Dog', ru: 'Хот Дог', en: 'Hot Dog' },
    drink: { uz: 'Ichimliklar', ru: 'Напитки', en: 'Drinks' },
    dessert: { uz: 'Desertlar', ru: 'Десерты', en: 'Desserts' },
    set_menu: { uz: 'Set menyu', ru: 'Сет меню', en: 'Set Menu' },
    garnir: { uz: 'Garnirlar', ru: 'Гарниры', en: 'Sides' },
    sous: { uz: "Souslar", ru: 'Соусы', en: 'Sauces' },
    other: { uz: 'Boshqa', ru: 'Другое', en: 'Other' },
};

module.exports = { CATEGORY_KEYS, CATEGORY_NAMES };
