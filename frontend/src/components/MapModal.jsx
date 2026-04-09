import { useEffect, useRef, useState } from 'react';

export default function MapModal({ onConfirm, onClose, initialAddress = '' }) {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [address, setAddress] = useState(initialAddress || 'Manzil aniqlanmoqda...');
    const [coords, setCoords] = useState({ lat: 41.2995, lng: 69.2401 }); // Tashkent default
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setLoading(true);
        try {
            const r = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`
            );
            const data = await r.json();
            const addr = data.address;
            const parts = [
                addr.road || addr.pedestrian || addr.footway,
                addr.house_number,
            ].filter(Boolean);
            const short = parts.length > 0
                ? parts.join(', ')
                : (addr.suburb || addr.neighbourhood || data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setAddress(short);
        } catch {
            setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let L;
        const init = async () => {
            L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');

            // Fix default icon
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            if (mapInstanceRef.current) return;

            const map = L.default.map(mapRef.current, {
                center: [coords.lat, coords.lng],
                zoom: 15,
                zoomControl: false,
            });

            L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
            }).addTo(map);

            L.default.control.zoom({ position: 'topright' }).addTo(map);

            const marker = L.default.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
            markerRef.current = marker;
            mapInstanceRef.current = map;

            // Get user location
            navigator.geolocation?.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    map.setView([lat, lng], 16);
                    marker.setLatLng([lat, lng]);
                    setCoords({ lat, lng });
                    reverseGeocode(lat, lng);
                },
                () => reverseGeocode(coords.lat, coords.lng),
                { timeout: 5000 }
            );

            marker.on('dragend', () => {
                const { lat, lng } = marker.getLatLng();
                setCoords({ lat, lng });
                reverseGeocode(lat, lng);
            });

            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                setCoords({ lat, lng });
                reverseGeocode(lat, lng);
            });
        };

        init();
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const handleSearch = async () => {
        if (!search.trim()) return;
        setSearching(true);
        try {
            const r = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search + ', Toshkent')}&format=json&limit=1&accept-language=ru`
            );
            const data = await r.json();
            if (data.length > 0) {
                const { lat, lon } = data[0];
                const latN = parseFloat(lat), lngN = parseFloat(lon);
                mapInstanceRef.current?.setView([latN, lngN], 16);
                markerRef.current?.setLatLng([latN, lngN]);
                setCoords({ lat: latN, lng: lngN });
                reverseGeocode(latN, lngN);
            }
        } catch { } finally {
            setSearching(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
            }}>
                <button onClick={onClose} style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text)', fontSize: 18, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>←</button>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Qidirish..."
                        style={{
                            width: '100%', padding: '10px 44px 10px 14px',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            borderRadius: 12, color: 'var(--text)', fontSize: 14,
                            outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                    <button onClick={handleSearch} disabled={searching} style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                    }}>{searching ? '⏳' : '🔍'}</button>
                </div>
            </div>

            {/* Map */}
            <div ref={mapRef} style={{ flex: 1 }} />

            {/* Center pin overlay */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none', zIndex: 1001,
                fontSize: 36, lineHeight: 1,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}>📍</div>

            {/* Address bar + Confirm */}
            <div style={{
                padding: '16px 16px 28px',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '10px 14px', marginBottom: 14,
                }}>
                    <span style={{ fontSize: 18 }}>📍</span>
                    <div style={{ flex: 1 }}>
                        {loading ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Aniqlanmoqda...</div>
                        ) : (
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{address}</div>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onConfirm(address, coords)}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '15px',
                        background: loading ? '#333' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        border: 'none', borderRadius: 15, color: loading ? '#666' : '#1a1a24',
                        fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
                        fontFamily: 'inherit', boxShadow: '0 4px 18px rgba(212,160,23,0.3)',
                    }}
                >
                    Manzilni tasdiqlash
                </button>
            </div>
        </div>
    );
}
