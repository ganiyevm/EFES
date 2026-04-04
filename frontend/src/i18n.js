import { useAuth } from './context/AuthContext';

const translations = {
    uz: {
        // ── BottomNav ──────────────────────────────────────────────────────
        home: 'Bosh sahifa', menu: 'Menyu', cart: 'Savat',
        orders: 'Buyurtmalar', profile: 'Profil',

        // ── App ────────────────────────────────────────────────────────────
        appName: 'EFES',
        appSubtitle: 'Toshkentdagi eng yaxshi Turk taomlari',

        // ── Categories ─────────────────────────────────────────────────────
        allCategories: 'Barchasi',
        cat_kebab: 'Kebab', cat_doner: 'Döner', cat_pide: 'Pide',
        cat_corba: "Sho'rva", cat_salat: 'Salatlar', cat_izgara: 'Izgara',
        cat_manti: 'Manti', cat_burger: 'Burger', cat_pizza: 'Pizza',
        cat_hot_dog: 'Hot Dog', cat_drink: 'Ichimliklar', cat_dessert: 'Desertlar',
        cat_set_menu: 'Set menyu', cat_garnir: 'Garnirlar',
        cat_sous: 'Souslar', cat_other: 'Boshqa',

        // ── Home ───────────────────────────────────────────────────────────
        popularDishes: 'Mashhur taomlar',
        quickOrder: 'Tez buyurtma',
        promoTitle: '🎉 Birinchi buyurtmada',
        promoText: 'Bepul yetkazib berish + 200 bonus ball!',
        deliveryInfo: 'Yetkazib berish',
        workHours: 'Ish vaqti',
        minOrder: 'Minimal buyurtma',

        // ── Menu / Search ──────────────────────────────────────────────────
        searchPlaceholder: 'Taom qidiring...',
        noProducts: 'Taom topilmadi',
        foundCount: '{n} ta taom topildi',
        tryOtherSearch: "Boshqa so'z bilan qidiring",
        spicy: '🌶 Achchiq', vegetarian: '🥗 Vegetarian', popular: '⭐ Mashhur',

        // ── Product Detail ─────────────────────────────────────────────────
        weight: 'Vazn', calories: 'Kaloriya', prepTime: 'Tayyorlanish',
        ingredients: 'Tarkibi',
        itemNote: "Maxsus so'rov (ixtiyoriy)",
        itemNotePlaceholder: "Masalan: achchiqlisiz, ko'p sous...",
        addToCart: "Savatga qo'shish",
        inCart: 'Savatda',

        // ── Cart ───────────────────────────────────────────────────────────
        cartEmpty: "Savat bo'sh",
        cartEmptyText: "Menyudan taom qo'shing",
        goToMenu: "Menyuga o'tish",
        delivery: 'Yetkazib berish', pickup: 'Olib ketish',
        deliveryCost: 'Yetkazib berish narxi', free: 'Bepul',
        paymentTitle: "To'lov usuli",
        useBonus: 'Bonus ball ishlatish',
        yourName: 'Ismingiz', yourPhone: 'Telefon raqamingiz',
        yourAddress: 'Manzilingiz', comment: 'Izoh (ixtiyoriy)',
        selectBranch: 'Filial tanlang', branch: 'Filial',
        placeOrder: 'Buyurtma berish', ordering: 'Bajarilmoqda...',
        orderSuccess: 'Buyurtma qabul qilindi!',
        getLocation: 'Joylashuvni aniqlash',
        geoNotSupported: "Qurilmangiz geolokatsiyani qo'llab-quvvatlamaydi",
        geoError: "Joylashuvni aniqlash imkonsiz. Qo'lda kiriting.",
        namePhoneRequired: "Ism va telefon raqami kiritilmagan",
        addressRequired: "Manzil kiritilmagan",
        branchRequired: "Filial tanlanmagan",
        grandTotal: 'JAMI',
        cartItemsLabel: 'Taomlar', calculating: 'Hisoblanmoqda...',
        outOfRangeLabel: 'Yetkazilmaydi',
        outOfRangeWarn: "Manzilingiz yetkazib berish chegarasidan tashqarida ({km} km)",
        pickupHint: "Iltimos, \"Olib ketish\" rejimini tanlang",
        pay_cash: 'Naqd pul', pay_card: 'Karta',
        bonusAvailable: "ball mavjud",
        errorOccurred: "Xatolik yuz berdi",
        addressPlaceholder: "Tuman, ko'cha, uy raqami...",
        geoHint: 'Tugma orqali joylashuvingizni avtomatik aniqlang',

        // ── Payment ────────────────────────────────────────────────────────
        paymentReceived: "To'lov qabul qilindi!",
        bonusBall: 'bonus ball',
        viewOrders: "Buyurtmalarni ko'rish",
        paymentFailed: "To'lov amalga oshmadi",
        paymentError: "To'lovda xatolik yuz berdi. Qayta urinib ko'ring.",
        tryAgain: 'Qayta urinish',
        paymentVerifying: "To'lov tekshirilmoqda",
        paymentProviderMsg: "orqali to'lov amalga oshgan bo'lsa, buyurtma tez orada yangilanadi.",
        backToCart: 'Savatga qaytish',
        confirmingPayment: "To'lov tasdiqlanmoqda...",
        paymentSystem: "To'lov tizimi",
        autoUpdateMsg: 'Bu sahifa avtomatik yangilanadi.',
        confirmPayment: "To'lovni tasdiqlash",
        paymentNotConfirmed: "To'lov tasdiqlanmadi",
        serverConnectError: "Serverga ulanishda xato. Qayta urinib ko'ring.",

        // ── Orders ─────────────────────────────────────────────────────────
        myOrders: 'Buyurtmalarim', noOrders: "Buyurtmalar yo'q",
        orderItems: 'Taomlar', orderProduct: 'Taom',
        orderBranchPhone: 'Filial telefoni',
        orderAddr: 'Manzil', orderNote: 'Izoh', orderTotal: 'Jami',
        statusHistory: 'Status tarixi',
        status_awaiting_payment: "To'lov kutilmoqda",
        status_pending_operator: 'Operator kutilmoqda',
        status_confirmed: 'Tasdiqlandi',
        status_preparing: 'Tayyorlanmoqda 🍳',
        status_ready: 'Tayyor ✅',
        status_on_the_way: "Yo'lda 🚗",
        status_delivered: 'Yetkazildi',
        status_rejected: 'Rad etildi',
        status_cancelled: 'Bekor qilindi',
        estimatedTime: 'Taxminiy vaqt',
        minutes: 'daqiqa',

        // ── Branches ───────────────────────────────────────────────────────
        openText: 'Ochiq', closedText: 'Yopiq',
        navigate: "Yo'nalish",
        noAddress: "Manzil ko'rsatilmagan",
        noBranches: "Filiallar topilmadi",
        nearest: 'Eng yaqin', away: 'uzoqlikda',
        getDirections: "Yo'nalish olish",
        locating: 'Joylashuv aniqlanmoqda...',
        locationFound: 'Joylashuv aniqlandi',

        // ── Profile ────────────────────────────────────────────────────────
        favorites: 'Sevimlilar', myAddresses: 'Manzillarim',
        bonusLabel: 'Bonus', settings: 'Sozlamalar',
        ordersCount: 'Buyurtma', ballCount: 'Ball',
        favoritesEmpty: "Sevimlilar ro'yxati bo'sh",
        bonusPoints: 'bonus ball',
        addressesTitle: 'Manzillar',
        addrName: 'Nomi', addrNamePlaceholder: 'Uy, Ish...',
        addrAddr: 'Manzil', addrAddrPlaceholder: "To'liq manzil",
        addAddress: "Manzil qo'shish",
        bonusPageTitle: 'Bonus ballar',
        bonusBallsLabel: 'bonus ball',
        ballHistory: 'Ball tarixi',
        noTransactions: "Hali tranzaksiyalar yo'q",
        tierBronze: 'Bronza', tierSilver: 'Kumush', tierGold: 'Oltin',
        pointsToNext: '{tier} darajaga {n} ball qoldi',
        phone: 'Telefon', editProfile: 'Profilni tahrirlash',
        logout: 'Chiqish',

        // ── Common ─────────────────────────────────────────────────────────
        loading: 'Yuklanmoqda...', back: '←', close: 'Yopish',
        save: 'Saqlash', cancel: 'Bekor qilish',
        darkMode: 'Dark mode', language: 'Til',
        min: 'daq', kcal: 'kkal', g: 'g', ml: 'ml',
    },

    ru: {
        // ── BottomNav ──────────────────────────────────────────────────────
        home: 'Главная', menu: 'Меню', cart: 'Корзина',
        orders: 'Заказы', profile: 'Профиль',

        // ── App ────────────────────────────────────────────────────────────
        appName: 'EFES',
        appSubtitle: 'Лучшая турецкая кухня в Ташкенте',

        // ── Categories ─────────────────────────────────────────────────────
        allCategories: 'Все',
        cat_kebab: 'Кебаб', cat_doner: 'Донер', cat_pide: 'Пиде',
        cat_corba: 'Суп', cat_salat: 'Салаты', cat_izgara: 'Гриль',
        cat_manti: 'Манты', cat_burger: 'Бургер', cat_pizza: 'Пицца',
        cat_hot_dog: 'Хот Дог', cat_drink: 'Напитки', cat_dessert: 'Десерты',
        cat_set_menu: 'Сет меню', cat_garnir: 'Гарниры',
        cat_sous: 'Соусы', cat_other: 'Другое',

        // ── Home ───────────────────────────────────────────────────────────
        popularDishes: 'Популярные блюда',
        quickOrder: 'Быстрый заказ',
        promoTitle: '🎉 На первый заказ',
        promoText: 'Бесплатная доставка + 200 бонусных баллов!',
        deliveryInfo: 'Доставка',
        workHours: 'Время работы',
        minOrder: 'Минимальный заказ',

        // ── Menu / Search ──────────────────────────────────────────────────
        searchPlaceholder: 'Поиск блюда...',
        noProducts: 'Блюда не найдены',
        foundCount: 'Найдено {n} блюд',
        tryOtherSearch: 'Попробуйте другой запрос',
        spicy: '🌶 Острое', vegetarian: '🥗 Вегетарианское', popular: '⭐ Популярное',

        // ── Product Detail ─────────────────────────────────────────────────
        weight: 'Вес', calories: 'Калории', prepTime: 'Приготовление',
        ingredients: 'Состав',
        itemNote: 'Особые пожелания (необязательно)',
        itemNotePlaceholder: 'Например: без острого, больше соуса...',
        addToCart: 'В корзину',
        inCart: 'В корзине',

        // ── Cart ───────────────────────────────────────────────────────────
        cartEmpty: 'Корзина пуста',
        cartEmptyText: 'Добавьте блюда из меню',
        goToMenu: 'Перейти в меню',
        delivery: 'Доставка', pickup: 'Самовывоз',
        deliveryCost: 'Стоимость доставки', free: 'Бесплатно',
        paymentTitle: 'Способ оплаты',
        useBonus: 'Использовать бонусные баллы',
        yourName: 'Ваше имя', yourPhone: 'Номер телефона',
        yourAddress: 'Ваш адрес', comment: 'Комментарий (необязательно)',
        selectBranch: 'Выберите ресторан', branch: 'Ресторан',
        placeOrder: 'Оформить заказ', ordering: 'Оформление...',
        orderSuccess: 'Заказ принят!',
        getLocation: 'Определить местоположение',
        geoNotSupported: 'Ваше устройство не поддерживает геолокацию',
        geoError: 'Невозможно определить местоположение. Введите вручную.',
        namePhoneRequired: 'Введите имя и номер телефона',
        addressRequired: 'Введите адрес',
        branchRequired: 'Выберите ресторан',
        grandTotal: 'ИТОГО',
        cartItemsLabel: 'Блюда', calculating: 'Подсчёт...',
        outOfRangeLabel: 'Не доставляем',
        outOfRangeWarn: 'Ваш адрес находится за зоной доставки ({km} км)',
        pickupHint: 'Выберите режим «Самовывоз»',
        pay_cash: 'Наличные', pay_card: 'Карта',
        bonusAvailable: 'баллов доступно',
        errorOccurred: 'Произошла ошибка',
        addressPlaceholder: 'Район, улица, дом...',
        geoHint: 'Нажмите кнопку для автоматического определения',

        // ── Payment ────────────────────────────────────────────────────────
        paymentReceived: 'Оплата принята!',
        bonusBall: 'бонусных баллов',
        viewOrders: 'Мои заказы',
        paymentFailed: 'Оплата не прошла',
        paymentError: 'Ошибка оплаты. Попробуйте снова.',
        tryAgain: 'Попробовать снова',
        paymentVerifying: 'Проверка оплаты',
        paymentProviderMsg: 'Если оплата через {provider} прошла, заказ скоро обновится.',
        backToCart: 'Вернуться в корзину',
        confirmingPayment: 'Подтверждение оплаты...',
        paymentSystem: 'Платёжная система',
        autoUpdateMsg: 'Страница обновляется автоматически.',
        confirmPayment: 'Подтвердить оплату',
        paymentNotConfirmed: 'Оплата не подтверждена',
        serverConnectError: 'Ошибка соединения с сервером.',

        // ── Orders ─────────────────────────────────────────────────────────
        myOrders: 'Мои заказы', noOrders: 'Нет заказов',
        orderItems: 'Блюда', orderProduct: 'Блюдо',
        orderBranchPhone: 'Телефон ресторана',
        orderAddr: 'Адрес', orderNote: 'Комментарий', orderTotal: 'Итого',
        statusHistory: 'История статусов',
        status_awaiting_payment: 'Ожидает оплаты',
        status_pending_operator: 'Ожидает оператора',
        status_confirmed: 'Подтверждён',
        status_preparing: 'Готовится 🍳',
        status_ready: 'Готов ✅',
        status_on_the_way: 'В пути 🚗',
        status_delivered: 'Доставлен',
        status_rejected: 'Отклонён',
        status_cancelled: 'Отменён',
        estimatedTime: 'Ожидаемое время',
        minutes: 'мин',

        // ── Branches ───────────────────────────────────────────────────────
        openText: 'Открыт', closedText: 'Закрыт',
        navigate: 'Маршрут',
        noAddress: 'Адрес не указан',
        noBranches: 'Рестораны не найдены',
        nearest: 'Ближайший', away: 'от вас',
        getDirections: 'Построить маршрут',
        locating: 'Определяем местоположение...',
        locationFound: 'Местоположение найдено',

        // ── Profile ────────────────────────────────────────────────────────
        favorites: 'Избранное', myAddresses: 'Мои адреса',
        bonusLabel: 'Бонусы', settings: 'Настройки',
        ordersCount: 'Заказов', ballCount: 'Баллов',
        favoritesEmpty: 'Список избранного пуст',
        bonusPoints: 'бонусных баллов',
        addressesTitle: 'Адреса',
        addrName: 'Название', addrNamePlaceholder: 'Дом, Работа...',
        addrAddr: 'Адрес', addrAddrPlaceholder: 'Полный адрес',
        addAddress: 'Добавить адрес',
        bonusPageTitle: 'Бонусные баллы',
        bonusBallsLabel: 'бонусных баллов',
        ballHistory: 'История баллов',
        noTransactions: 'Нет транзакций',
        tierBronze: 'Бронза', tierSilver: 'Серебро', tierGold: 'Золото',
        pointsToNext: 'До уровня {tier} осталось {n} баллов',
        phone: 'Телефон', editProfile: 'Редактировать профиль',
        logout: 'Выйти',

        // ── Common ─────────────────────────────────────────────────────────
        loading: 'Загрузка...', back: '←', close: 'Закрыть',
        save: 'Сохранить', cancel: 'Отмена',
        darkMode: 'Тёмная тема', language: 'Язык',
        min: 'мин', kcal: 'ккал', g: 'г', ml: 'мл',
    },

    en: {
        // ── BottomNav ──────────────────────────────────────────────────────
        home: 'Home', menu: 'Menu', cart: 'Cart',
        orders: 'Orders', profile: 'Profile',

        // ── App ────────────────────────────────────────────────────────────
        appName: 'EFES',
        appSubtitle: 'Best Turkish food in Tashkent',

        // ── Categories ─────────────────────────────────────────────────────
        allCategories: 'All',
        cat_kebab: 'Kebab', cat_doner: 'Döner', cat_pide: 'Pide',
        cat_corba: 'Soup', cat_salat: 'Salads', cat_izgara: 'Grilled',
        cat_manti: 'Manti', cat_burger: 'Burger', cat_pizza: 'Pizza',
        cat_hot_dog: 'Hot Dog', cat_drink: 'Drinks', cat_dessert: 'Desserts',
        cat_set_menu: 'Set Menu', cat_garnir: 'Sides',
        cat_sous: 'Sauces', cat_other: 'Other',

        // ── Home ───────────────────────────────────────────────────────────
        popularDishes: 'Popular Dishes',
        quickOrder: 'Quick Order',
        promoTitle: '🎉 First order',
        promoText: 'Free delivery + 200 bonus points!',
        deliveryInfo: 'Delivery',
        workHours: 'Working hours',
        minOrder: 'Minimum order',

        // ── Menu / Search ──────────────────────────────────────────────────
        searchPlaceholder: 'Search dishes...',
        noProducts: 'No dishes found',
        foundCount: '{n} dishes found',
        tryOtherSearch: 'Try another search',
        spicy: '🌶 Spicy', vegetarian: '🥗 Vegetarian', popular: '⭐ Popular',

        // ── Product Detail ─────────────────────────────────────────────────
        weight: 'Weight', calories: 'Calories', prepTime: 'Prep time',
        ingredients: 'Ingredients',
        itemNote: 'Special request (optional)',
        itemNotePlaceholder: 'E.g.: no spicy, extra sauce...',
        addToCart: 'Add to Cart',
        inCart: 'In Cart',

        // ── Cart ───────────────────────────────────────────────────────────
        cartEmpty: 'Cart is empty',
        cartEmptyText: 'Add dishes from the menu',
        goToMenu: 'Go to Menu',
        delivery: 'Delivery', pickup: 'Pickup',
        deliveryCost: 'Delivery cost', free: 'Free',
        paymentTitle: 'Payment method',
        useBonus: 'Use bonus points',
        yourName: 'Your name', yourPhone: 'Phone number',
        yourAddress: 'Your address', comment: 'Comment (optional)',
        selectBranch: 'Select restaurant', branch: 'Restaurant',
        placeOrder: 'Place Order', ordering: 'Processing...',
        orderSuccess: 'Order placed!',
        getLocation: 'Get location',
        geoNotSupported: 'Your device does not support geolocation',
        geoError: 'Cannot get location. Enter manually.',
        namePhoneRequired: 'Enter name and phone number',
        addressRequired: 'Enter address',
        branchRequired: 'Select a restaurant',
        grandTotal: 'TOTAL',
        cartItemsLabel: 'Dishes', calculating: 'Calculating...',
        outOfRangeLabel: 'Out of range',
        outOfRangeWarn: 'Your address is outside delivery zone ({km} km)',
        pickupHint: 'Please select Pickup mode',
        pay_cash: 'Cash', pay_card: 'Card',
        bonusAvailable: 'points available',
        errorOccurred: 'An error occurred',
        addressPlaceholder: 'District, street, house number...',
        geoHint: 'Press button to detect location automatically',

        // ── Payment ────────────────────────────────────────────────────────
        paymentReceived: 'Payment received!',
        bonusBall: 'bonus points',
        viewOrders: 'My Orders',
        paymentFailed: 'Payment failed',
        paymentError: 'Payment error. Please try again.',
        tryAgain: 'Try again',
        paymentVerifying: 'Verifying payment',
        paymentProviderMsg: 'If payment was made, your order will be updated soon.',
        backToCart: 'Back to Cart',
        confirmingPayment: 'Confirming payment...',
        paymentSystem: 'Payment system',
        autoUpdateMsg: 'This page updates automatically.',
        confirmPayment: 'Confirm payment',
        paymentNotConfirmed: 'Payment not confirmed',
        serverConnectError: 'Server connection error. Please try again.',

        // ── Orders ─────────────────────────────────────────────────────────
        myOrders: 'My Orders', noOrders: 'No orders yet',
        orderItems: 'Dishes', orderProduct: 'Dish',
        orderBranchPhone: 'Restaurant phone',
        orderAddr: 'Address', orderNote: 'Comment', orderTotal: 'Total',
        statusHistory: 'Status history',
        status_awaiting_payment: 'Awaiting payment',
        status_pending_operator: 'Waiting for operator',
        status_confirmed: 'Confirmed',
        status_preparing: 'Preparing 🍳',
        status_ready: 'Ready ✅',
        status_on_the_way: 'On the way 🚗',
        status_delivered: 'Delivered',
        status_rejected: 'Rejected',
        status_cancelled: 'Cancelled',
        estimatedTime: 'Estimated time',
        minutes: 'min',

        // ── Branches ───────────────────────────────────────────────────────
        openText: 'Open', closedText: 'Closed',
        navigate: 'Directions',
        noAddress: 'No address',
        noBranches: 'No restaurants found',
        nearest: 'Nearest', away: 'away',
        getDirections: 'Get directions',
        locating: 'Getting location...',
        locationFound: 'Location found',

        // ── Profile ────────────────────────────────────────────────────────
        favorites: 'Favorites', myAddresses: 'My Addresses',
        bonusLabel: 'Bonus', settings: 'Settings',
        ordersCount: 'Orders', ballCount: 'Points',
        favoritesEmpty: 'Favorites list is empty',
        bonusPoints: 'bonus points',
        addressesTitle: 'Addresses',
        addrName: 'Name', addrNamePlaceholder: 'Home, Work...',
        addrAddr: 'Address', addrAddrPlaceholder: 'Full address',
        addAddress: 'Add address',
        bonusPageTitle: 'Bonus Points',
        bonusBallsLabel: 'bonus points',
        ballHistory: 'Points history',
        noTransactions: 'No transactions yet',
        tierBronze: 'Bronze', tierSilver: 'Silver', tierGold: 'Gold',
        pointsToNext: '{n} points to {tier}',
        phone: 'Phone', editProfile: 'Edit profile',
        logout: 'Logout',

        // ── Common ─────────────────────────────────────────────────────────
        loading: 'Loading...', back: '←', close: 'Close',
        save: 'Save', cancel: 'Cancel',
        darkMode: 'Dark mode', language: 'Language',
        min: 'min', kcal: 'kcal', g: 'g', ml: 'ml',
    },
};

export function useT() {
    const { user } = useAuth();
    const lang = user?.language || localStorage.getItem('efes_lang') || 'uz';
    const t = (key) => {
        const val = translations[lang]?.[key] ?? translations['uz']?.[key] ?? key;
        return val;
    };
    return { t, lang };
}
