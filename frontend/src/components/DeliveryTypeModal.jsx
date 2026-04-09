import { useState } from 'react';
import MapModal from './MapModal';

export default function DeliveryTypeModal({ onSelect }) {
    const [showMap, setShowMap] = useState(false);

    const handleDelivery = () => {
        setShowMap(true);
    };

    const handlePickup = () => {
        localStorage.setItem('efes_delivery_type', 'pickup');
        localStorage.removeItem('efes_address');
        onSelect('pickup', '');
    };

    const handleMapConfirm = (address, coords) => {
        localStorage.setItem('efes_delivery_type', 'delivery');
        localStorage.setItem('efes_address', address);
        localStorage.setItem('efes_coords', JSON.stringify(coords));
        onSelect('delivery', address);
    };

    if (showMap) {
        return (
            <MapModal
                onConfirm={handleMapConfirm}
                onClose={() => setShowMap(false)}
            />
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                width: '100%', maxWidth: 480,
                background: 'var(--bg-card)',
                borderRadius: '24px 24px 0 0',
                padding: '28px 24px 40px',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
                animation: 'slideUp 0.3s ease',
            }}>
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); opacity: 0; }
                        to   { transform: translateY(0);    opacity: 1; }
                    }
                `}</style>

                {/* Handle */}
                <div style={{
                    width: 40, height: 4, borderRadius: 2,
                    background: 'var(--border)',
                    margin: '0 auto 24px',
                }} />

                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, textAlign: 'center' }}>
                    Buyurtma turi
                </div>

                {/* Yetkazib berish */}
                <button onClick={handleDelivery} style={{
                    width: '100%', padding: '18px 20px',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    border: 'none', borderRadius: 16, color: '#1a1a24',
                    fontSize: 17, fontWeight: 800, cursor: 'pointer',
                    fontFamily: 'inherit', marginBottom: 12,
                    boxShadow: '0 4px 20px rgba(212,160,23,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                    <span style={{ fontSize: 22 }}>🚗</span>
                    Yetkazib berish
                </button>

                {/* Olib ketish */}
                <button onClick={handlePickup} style={{
                    width: '100%', padding: '18px 20px',
                    background: 'var(--bg-secondary)',
                    border: '1.5px solid var(--border)', borderRadius: 16,
                    color: 'var(--text)',
                    fontSize: 17, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                    <span style={{ fontSize: 22 }}>🏃</span>
                    Olib ketish
                </button>
            </div>
        </div>
    );
}
