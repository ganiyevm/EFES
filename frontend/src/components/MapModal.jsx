import { useEffect, useRef, useState, useCallback } from 'react';

// Yandex Maps API ni dynamik yuklash
let ymapsLoaded = false;
let ymapsLoading = false;
const ymapsCallbacks = [];

function loadYmaps() {
    return new Promise((resolve) => {
        if (ymapsLoaded && window.ymaps) { resolve(window.ymaps); return; }
        ymapsCallbacks.push(resolve);
        if (ymapsLoading) return;
        ymapsLoading = true;

        window.__ymapsReady = () => {
            window.ymaps.ready(() => {
                ymapsLoaded = true;
                ymapsLoading = false;
                ymapsCallbacks.forEach(cb => cb(window.ymaps));
                ymapsCallbacks.length = 0;
            });
        };

        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&onload=__ymapsReady';
        script.async = true;
        document.head.appendChild(script);
    });
}

export default function MapModal({ onConfirm, onClose, initialAddress = '' }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const geocodeTimer = useRef(null);

    const [address, setAddress] = useState(initialAddress || 'Aniqlanmoqda...');
    const [loading, setLoading] = useState(true);
    const [moving, setMoving] = useState(false);
    const [coords, setCoords] = useState({ lat: 41.2995, lng: 69.2401 });
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);

    const reverseGeocode = useCallback(async (lat, lng) => {
        setLoading(true);
        try {
            if (window.ymaps) {
                const res = await window.ymaps.geocode([lat, lng], { results: 1 });
                const obj = res.geoObjects.get(0);
                if (obj) {
                    const meta = obj.properties.get('metaDataProperty.GeocoderMetaData');
                    const addr = meta?.Address?.formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    // Qisqa manzil: ko'cha + uy
                    const comps = meta?.Address?.Components || [];
                    const street = comps.find(c => c.kind === 'street')?.name || '';
                    const house  = comps.find(c => c.kind === 'house')?.name  || '';
                    setAddress(street && house ? `${street}, ${house}` : street || addr.split(',').slice(0,2).join(',').trim());
                } else {
                    setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }
            } else {
                // fallback — nominatim
                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`);
                const d = await r.json();
                const a = d.address || {};
                const parts = [a.road || a.pedestrian, a.house_number].filter(Boolean);
                setAddress(parts.length ? parts.join(', ') : d.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
        } catch {
            setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let map;

        const init = async () => {
            const ymaps = await loadYmaps();

            if (mapInstanceRef.current) return;

            const defaultLat = 41.2995, defaultLng = 69.2401;

            map = new ymaps.Map(mapRef.current, {
                center: [defaultLat, defaultLng],
                zoom: 16,
                controls: [],
            });

            mapInstanceRef.current = map;

            // Zoom tugmalari
            map.controls.add('zoomControl', { position: { right: 12, top: 80 } });

            // Harakatlanish hodisalari
            map.events.add('actionbegin', () => setMoving(true));
            map.events.add('actionend', () => {
                setMoving(false);
                const center = map.getCenter();
                const lat = center[0], lng = center[1];
                setCoords({ lat, lng });
                clearTimeout(geocodeTimer.current);
                geocodeTimer.current = setTimeout(() => reverseGeocode(lat, lng), 400);
            });

            // GPS lokatsiya so'rash
            navigator.geolocation?.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    map.setCenter([lat, lng], 17, { duration: 600 });
                },
                () => reverseGeocode(defaultLat, defaultLng),
                { timeout: 8000, enableHighAccuracy: true }
            );
        };

        init();

        return () => {
            clearTimeout(geocodeTimer.current);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.destroy();
                mapInstanceRef.current = null;
            }
        };
    }, [reverseGeocode]);

    const handleSearch = async () => {
        if (!search.trim() || !window.ymaps) return;
        setSearching(true);
        try {
            const res = await window.ymaps.geocode(search + ', Toshkent', { results: 1 });
            const obj = res.geoObjects.get(0);
            if (obj) {
                const coords = obj.geometry.getCoordinates();
                mapInstanceRef.current?.setCenter(coords, 17, { duration: 600 });
            }
        } catch { }
        finally { setSearching(false); }
    };

    const handleMyLocation = () => {
        navigator.geolocation?.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                mapInstanceRef.current?.setCenter([lat, lng], 17, { duration: 600 });
            },
            () => alert('Lokatsiyani aniqlab bo\'lmadi'),
            { timeout: 8000, enableHighAccuracy: true }
        );
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', height: 60, flexShrink: 0,
                background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
                zIndex: 10001,
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

            {/* Map container */}
            <div style={{ flex: 1, position: 'relative' }}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

                {/* Center pin */}
                <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: `translate(-50%, ${moving ? '-130%' : '-100%'})`,
                    zIndex: 10002, pointerEvents: 'none',
                    transition: 'transform 0.15s ease',
                    fontSize: 40, lineHeight: 1,
                    filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.6))',
                }}>📍</div>

                {/* Shadow dot */}
                <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10001, pointerEvents: 'none',
                    width: moving ? 6 : 10, height: moving ? 3 : 5,
                    borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
                    transition: 'all 0.15s ease',
                }} />

                {/* My location button */}
                <button onClick={handleMyLocation} style={{
                    position: 'absolute', right: 12, bottom: 16,
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    cursor: 'pointer', zIndex: 10003,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                }}>🎯</button>
            </div>

            {/* Bottom panel */}
            <div style={{
                padding: '14px 16px 28px',
                background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
                flexShrink: 0, zIndex: 10002,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 13, padding: '11px 14px', marginBottom: 12, minHeight: 46,
                }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        {(loading || moving) ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Aniqlanmoqda...</div>
                        ) : (
                            <div style={{
                                fontWeight: 600, fontSize: 14,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{address}</div>
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
