import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export const MAX_QTY = 50;

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('efes_cart') || '[]');
            return Array.isArray(saved) ? saved.filter(i => i?.productId && i.qty > 0) : [];
        } catch { return []; }
    });

    useEffect(() => {
        try { localStorage.setItem('efes_cart', JSON.stringify(items)); } catch { /* xotira to'la */ }
    }, [items]);

    const addItem = useCallback((product, qty = 1, note = '') => {
        setItems(prev => {
            const idx = prev.findIndex(i => i.productId === product._id);
            if (idx >= 0) {
                // Holatni o'zgartirmasdan yangi obyekt (avval mavjud obyekt mutatsiya qilinardi)
                return prev.map((i, n) => n === idx
                    ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty), note: note || i.note, price: product.price }
                    : i);
            }
            return [...prev, {
                productId: product._id, name: product.name, price: product.price,
                qty: Math.min(MAX_QTY, qty), note, imageUrl: product.imageUrl, category: product.category,
            }];
        });
    }, []);

    const removeItem = useCallback((productId) => setItems(prev => prev.filter(i => i.productId !== productId)), []);
    const updateQty = useCallback((productId, qty) => {
        if (qty <= 0) return removeItem(productId);
        setItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i));
    }, [removeItem]);
    const updateNote = useCallback((productId, note) => setItems(prev => prev.map(i => i.productId === productId ? { ...i, note: note.slice(0, 200) } : i)), []);
    const clearCart = useCallback(() => setItems([]), []);

    // Serverdagi joriy holat bilan solishtirish: sotuvdan olinganlar o'chiriladi, narx yangilanadi.
    // Qaytaradi: true — agar savat o'zgargan bo'lsa.
    const syncWithServer = useCallback((products) => {
        const map = Object.fromEntries(products.map(p => [p._id, p]));
        let changed = false;
        const next = [];
        for (const i of items) {
            const p = map[i.productId];
            if (!p) { changed = true; continue; }
            if (p.price !== i.price || p.name !== i.name) changed = true;
            next.push({ ...i, price: p.price, name: p.name, imageUrl: p.imageUrl, category: p.category });
        }
        if (changed) setItems(next);
        return changed;
    }, [items]);

    const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQty, updateNote, clearCart, syncWithServer, totalItems, totalPrice }}>
            {children}
        </CartContext.Provider>
    );
}
