import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import LangSelect from './components/LangSelect';
import Home from './pages/Home';
import Menu from './pages/Menu';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Payment from './pages/Payment';
import Branches from './pages/Branches';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Onboarding from './pages/Onboarding';

export default function App() {
    const [langChosen, setLangChosen] = useState(!!localStorage.getItem('efes_lang'));

    if (!langChosen) {
        return (
            <AuthProvider>
                <LangSelect onSelect={() => setLangChosen(true)} />
            </AuthProvider>
        );
    }

    return (
        <AuthProvider>
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
                        <Route path="/onboarding" element={<Onboarding />} />
                    </Routes>
                </BrowserRouter>
            </CartProvider>
        </AuthProvider>
    );
}
