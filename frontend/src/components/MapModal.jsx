import { useEffect, useRef, useState } from 'react';

export default function MapModal({ onConfirm, onClose, initialAddress = '' }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const geocodeTimer = useRef(null);

    const [address, setAddress] = useState(initialAddress || 'Manzil aniqlanmoqda...');
    const [loading, setLoading] = useState(true);
    const [moving, setMoving] = useState(false);
    const [coords, setCoords] = useState({ lat: 41.2995, lng: 69.2401 });
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setLoading(true);
        try {
            const r = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`,
                { headers: { 'Accept-Language': 'ru' } }
            );
            const data = await r.json();
            const a = data.address || {};
            const parts = [
                a.road || a.pedestrian || a.footway || a.path,
                a.house_number,
            ].filter(Boolean);
            setAddress(
                parts.length > 0
                    ? parts.join(', ')
                    : a.suburb || a.neighbourhood || a.city_district || data.display_name?.split(',')[0] || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            );
        } catch {
            setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let L;
        const init = async () => {
            L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');

            if (mapInstanceRef.current) return;

            const defaultLat = 41.2995, defaultLng = 69.2401;

            const map = L.default.map(mapRef.current, {
                center: [defaultLat, defaultLng],
                zoom: 16,
                zoomControl: false,
                attributionControl: true,
            });

            L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(map);

            L.default.control.zoom({ position: 'topright' }).addTo(map);

            mapInstanceRef.current = map;

            // Xarita harakatlanayotganda — pin animatsiyasi
            map.on('movestart', () => setMoving(true));

            // Xarita to'xtaganda — markazdan koordinat olinadi
            map.on('moveend', () => {
                setMoving(false);
                const center = map.getCenter();
                const lat = center.lat, lng = center.lng;
                setCoords({ lat, lng });

                // Debounce reverse geocoding
                clearTimeout(geocodeTimer.current);
                geocodeTimer.current = setTimeout(() => {
                    reverseGeocode(lat, lng);
                }, 400);
            });

            // GPS lokatsiya
            navigator.geolocation?.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    map.setView([lat, lng], 17);
                    // moveend avtomatik ishlaydi
                },
                () => {
                    reverseGeocode(defaultLat, defaultLng);
                },
                { timeout: 6000, enableHighAccuracy: true }
            );
        };

        init();

        return () => {
            clearTimeout(geocodeTimer.current);
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
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search + ', Toshkent')}&format=json&limit=1`
            );
            const data = await r.json();
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
                mapInstanceRef.current?.setView([lat, lng], 17);
            }
        } catch { }
        finally { setSearching(false); }
    };

    // Header + bottom panel balandliklarini hisobga olgan holda pin markazini topish
    const HEADER_HEIGHT = 62;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: '#000' }}>

            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                height: HEADER_HEIGHT,
                flexShrink: 0,
                zIndex: 1002,
            }}>
                <button onClick={onClose} style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
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
                            width: '100%', padding: '9px 40px 9px 13px',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            borderRadius: 11, color: 'var(--text)', fontSize: 14,
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
            <div ref={mapRef} style={{ flex: 1, position: 'relative' }} />

            {/* Center pin — doim ekran markazida (header + bottom = 50% of map area) */}
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, ${moving ? '-130%' : '-100%'})`,
                zIndex: 1002,
                pointerEvents: 'none',
                transition: 'transform 0.15s ease',
                fontSize: 40,
                lineHeight: 1,
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
            }}>
                📍
            </div>

            {/* Shadow dot under pin */}
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1001,
                pointerEvents: 'none',
                width: moving ? 6 : 10,
                height: moving ? 3 : 5,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.25)',
                transition: 'all 0.15s ease',
            }} />

            {/* Bottom panel */}
            <div style={{
                padding: '14px 16px 28px',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
                flexShrink: 0,
                zIndex: 1002,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 13, padding: '11px 14px', marginBottom: 12,
                    minHeight: 46,
                }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        {(loading || moving) ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Aniqlanmoqda...</div>
                        ) : (
                            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {address}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onConfirm(address, coords)}
                    disabled={loading || moving}
                    style={{
                        width: '100%', padding: '15px',
                        background: (loading || moving) ? '#333' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        border: 'none', borderRadius: 14,
                        color: (loading || moving) ? '#666' : '#1a1a24',
                        fontSize: 16, fontWeight: 800,
                        cursor: (loading || moving) ? 'default' : 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: (loading || moving) ? 'none' : '0 4px 18px rgba(212,160,23,0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    Manzilni tasdiqlash
                </button>
            </div>
        </div>
    );
}
