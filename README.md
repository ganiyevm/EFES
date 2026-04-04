# 🍽 EFES — Fast Food & Turk Taomlari Yetkazib Berish

Toshkent bo'ylab fast food va turk taomlarini yetkazib berish tizimi.

## Tizim tarkibi

| Qism | Texnologiya | Port |
|------|-------------|------|
| **Backend API** | Node.js + Express + MongoDB | 3000 |
| **Mini App** | React (Vite) — Telegram WebApp | 5173 |
| **Admin Panel** | React (Vite) + Recharts | 5174 |
| **Telegram Bot** | Grammy | 3001 |
| **Database** | MongoDB | 27017 |

## 🚀 Ishga tushirish

### 1. Talablar
- Node.js 20+
- MongoDB 7+
- Telegram Bot Token

### 2. Sozlash

```bash
cp .env.example backend/.env
# backend/.env ni tahrirlang
```

### 3. Backend

```bash
cd backend
npm install
npm start
```

### 4. Frontend (Telegram Mini App)

```bash
cd frontend
npm install
npm run dev
```

### 5. Admin Panel

```bash
cd admin
npm install
npm run dev
```

### 6. Bot

```bash
cd bot
npm install
npm start
```

### 7. Docker bilan

```bash
docker-compose up -d
```

## 📡 API Endpoints

| Yo'l | Tavsif |
|------|--------|
| `POST /api/auth/telegram` | Telegram WebApp auth |
| `POST /api/auth/admin/login` | Admin login |
| `GET /api/products` | Mahsulotlar (search, filter) |
| `GET /api/categories` | Kategoriyalar |
| `GET /api/branches` | Filiallar |
| `POST /api/orders` | Buyurtma yaratish |
| `POST /api/payment/click/*` | Click webhook |
| `POST /api/payment/payme` | Payme JSON-RPC |
| `POST /api/import/excel` | Excel import |
| `GET /api/analytics/*` | Dashboard statistika |

## 🍽 Menyu Kategoriyalari

| Kategoriya | Tavsif |
|-----------|--------|
| 🥙 Kebab | Kebab va grilllar |
| 🌯 Döner | Döner va wraps |
| 🫓 Pide | Pide va Lahmacun |
| 🍲 Sho'rva | Sho'rvalar |
| 🥗 Salatlar | Turli salatlar |
| 🔥 Izgara | Grilled meats |
| 🥟 Manti | Manti va chuchvara |
| 🍔 Burger | Burgerlar |
| 🍕 Pizza | Pizzalar |
| 🌭 Hot Dog | Hot Doglar |
| 🥤 Ichimliklar | Ichimliklar |
| 🍰 Desertlar | Turk desertlari |
| 📦 Set Menyu | Komplekt taomlar |

## 💳 To'lov usullari

- **Click** — Onlayn to'lov
- **Payme** — Onlayn to'lov
- **Naqd** — Yetkazib berish vaqtida to'lov

## Admin kirish

```
Login: admin
Parol: efes2026
```

## 🔄 Buyurtma oqimi

```
awaiting_payment → pending_operator → confirmed → preparing → ready → on_the_way → delivered
                 → cancelled         → rejected
```

Naqd to'lovda: `pending_operator` dan boshlanadi (to'lov kutilmaydi)

## ⭐ Bonus tizimi

- Har 10,000 so'mga → 100 ball
- 1 ball = 1 so'm, max 20% chegirma
- 🥉 Bronza (0–1,999) → 🥈 Kumush (2,000–4,999) → 🥇 Oltin (5,000+)

## 📞 Aloqa

| | |
|---|---|
| **Ishlab chiquvchi** | Xusniddin Ganiyev |
| **Telegram** | @ganniyev |
| **Telefon** | +998 98 177 09 19 |
| **LinkedIn** | linkedin.com/in/xusniddinganiyev |
