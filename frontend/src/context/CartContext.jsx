import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem('efes_cart') || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('efes_cart', JSON.stringify(items));
    }, [items]);

    const addItem = (product, qty = 1, note = '') => {
        setItems(prev => {
            const idx = prev.findIndex(i => i.productId === product._id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx].qty += qty;
                return updated;
            }
            return [...prev, { productId: product._id, name: product.name, price: product.price, qty, note, imageUrl: product.imageUrl }];
        });
    };

    const removeItem = (productId) => setItems(prev => prev.filter(i => i.productId !== productId));
    const updateQty = (productId, qty) => {
        if (qty <= 0) return removeItem(productId);
        setItems(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
    };
    const updateNote = (productId, note) => setItems(prev => prev.map(i => i.productId === productId ? { ...i, note } : i));
    const clearCart = () => setItems([]);
    const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQty, updateNote, clearCart, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
}
