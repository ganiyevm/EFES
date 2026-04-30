import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import LangSelect from './components/LangSelect';
import DeliveryTypeModal from './components/DeliveryTypeModal';
import Home from './pages/Home';
import Menu from './pages/Menu';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Payment from './pages/Payment';
import Branches from './pages/Branches';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Onboarding from './pages/Onboarding';

// AuthContext ga kirish uchun alohida inner komponent
function AppInner() {
    const { user, loading } = useAuth();
    const [langChosen, setLangChosen] = useState(!!localStorage.getItem('efes_lang'));
    const [deliveryChosen, setDeliveryChosen] = useState(!!localStorage.getItem('efes_delivery_type'));

    // 1-qadam: Til tanlash
    if (!langChosen) {
        return <LangSelect onSelect={() => setLangChosen(true)} />;
    }

    // 2-qadam: Buyurtma turi
    if (!deliveryChosen) {
        return <DeliveryTypeModal onSelect={() => setDeliveryChosen(true)} />;
    }

    // Auth yuklanmoqda
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div className="spinner" />
            </div>
        );
    }

    // Yangi foydalanuvchi — telefon raqamini tasdiqlashi kerak
    if (user && !user.isProfileComplete) {
        return <Onboarding />;
    }

    return (
        <CartProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/menu/:category" element={<Menu />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/branches" element={<Branches />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/onboarding" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </CartProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppInner />
        </AuthProvider>
    );
}
