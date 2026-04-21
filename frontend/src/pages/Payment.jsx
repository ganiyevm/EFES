import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import api from '../api';

export default function Payment() {
    const { t } = useT();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const orderId = params.get('orderId');
    const method = params.get('method');
    const total = parseInt(params.get('total') || '0');
    const orderNum = params.get('orderNum') || orderId?.slice(-6).toUpperCase();
    const payUrlFromServer = decodeURIComponent(params.get('payUrl') || '');

    const [status, setStatus] = useState('pending');
    const [order, setOrder] = useState(null);
    const [checking, setChecking] = useState(false);
    const pollRef = useRef(null);

    useEffect(() => {
        if (!orderId) { navigate('/'); return; }

        if (method === 'cash') {
            setStatus('cash');
            return;
        }

        const poll = async () => {
            try {
                const r = await api.get(`/payment/status/${orderId}`);
                setOrder(r.data);
                if (r.data.paymentStatus === 'paid') {
                    setStatus('paid');
                    clearInterval(pollRef.current);
                } else if (r.data.paymentStatus === 'failed') {
                    setStatus('failed');
                    clearInterval(pollRef.current);
                }
            } catch { }
        };

        poll();
        pollRef.current = setInterval(poll, 3000);
        return () => clearInterval(pollRef.current);
    }, [orderId, method]);

    const handleManualConfirm = async () => {
        setChecking(true);
        try {
            // Payme: local state check. Click: Click API orqali tekshirish
            const checkEndpoint = method === 'click' ? `/payment/click/check/${orderId}` : `/payment/payme/check/${orderId}`;
            const r = await api.get(checkEndpoint);
            if (r.data.paid) {
                setStatus('paid');
                const s = await api.get(`/payment/status/${orderId}`);
                setOrder(s.data);
            } else {
                alert(r.data.message || t('paymentNotConfirmed'));
            }
        } catch {
            alert(t('serverConnectError'));
        } finally {
            setChecking(false);
        }
    };

    // ── Cash ──
    if (status === 'cash') {
        return <SuccessScreen orderNum={orderNum} navigate={navigate} bonusEarned={0} />;
    }

    // ── Paid ──
    if (status === 'paid') {
        return <SuccessScreen orderNum={order?.orderNumber || orderNum} navigate={navigate} bonusEarned={order?.bonusEarned || 0} />;
    }

    // ── Failed ──
    if (status === 'failed') {
        return (
            <div style={pageStyle}>
                <div style={{ ...iconContainerStyle, background: 'rgba(231,76,60,0.1)' }}>
                    <span style={{ fontSize: 52 }}>❌</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 10 }}>{t('paymentFailed')}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 36 }}>{t('paymentError')}</div>
                <button onClick={() => navigate(-1)} style={{ ...goldBtnStyle, background: 'linear-gradient(135deg, var(--accent), #FF8C42)' }}>
                    🔄 {t('tryAgain')}
                </button>
                <button onClick={() => navigate('/cart')} style={{ ...secondaryBtnStyle, marginTop: 10 }}>
                    ← {t('backToCart')}
                </button>
            </div>
        );
    }

    // ── Pending ──
    const providerName = method === 'payme' ? 'Payme' : 'Click';
    const payUrl = payUrlFromServer || (method === 'payme'
        ? `https://checkout.paycom.uz/${import.meta.env.VITE_PAYME_ID}?amount=${total * 100}&order=${orderId}`
        : `https://my.click.uz/services/pay?service_id=${import.meta.env.VITE_CLICK_SERVICE_ID}&merchant_id=${import.meta.env.VITE_CLICK_MERCHANT_ID}&amount=${total}&transaction_param=${orderId}`);

    return (
        <div style={pageStyle}>
            <div style={iconContainerStyle}>
                <span style={{ fontSize: 48 }}>{method === 'payme' ? '💳' : '💙'}</span>
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
                {t('paymentSystem')}: {providerName}
            </div>
            <div style={{
                fontWeight: 900, fontSize: 28, marginBottom: 14,
                background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
                {total.toLocaleString()} so'm
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
                {providerName} {t('paymentProviderMsg')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 30, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                {t('autoUpdateMsg')}
            </div>

            {/* Open payment */}
            <a href={payUrl} target="_blank" rel="noreferrer" style={{
                ...goldBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, textDecoration: 'none', marginBottom: 10,
            }}>
                💳 {providerName} orqali to'lash
            </a>

            <button onClick={handleManualConfirm} disabled={checking} style={{ ...secondaryBtnStyle, marginBottom: 10 }}>
                {checking ? `⏳ ${t('confirmingPayment')}` : `✅ ${t('confirmPayment')}`}
            </button>

            <button onClick={() => navigate('/cart')} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: 13, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit',
            }}>
                ← {t('backToCart')}
            </button>
        </div>
    );
}

function SuccessScreen({ orderNum, navigate, bonusEarned }) {
    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 24, textAlign: 'center',
        }}>
            {/* Animated check */}
            <div style={{
                width: 110, height: 110, borderRadius: 32,
                background: 'linear-gradient(135deg, rgba(46,204,113,0.15), rgba(46,204,113,0.05))',
                border: '2px solid rgba(46,204,113,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 52, marginBottom: 24,
                boxShadow: '0 8px 32px rgba(46,204,113,0.15)',
            }}>✅</div>

            <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 8 }}>
                Buyurtma qabul qilindi!
            </div>

            {/* Order number */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '14px 28px', marginBottom: 16,
                display: 'inline-block',
            }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Buyurtma raqami</div>
                <div style={{
                    fontWeight: 900, fontSize: 28,
                    background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>#{orderNum}</div>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 8, maxWidth: 280 }}>
                Buyurtmangiz muvaffaqiyatli qabul qilindi!<br />
                Buyurtmangizni <strong style={{ color: 'var(--text)' }}>35 daqiqa</strong> ichida yetkazib beramiz.
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>
                Tanlovingiz uchun tashakkur! 🙏
            </div>

            {bonusEarned > 0 && (
                <div style={{
                    background: 'rgba(46,204,113,0.08)', color: '#2ecc71',
                    borderRadius: 14, padding: '10px 20px', fontSize: 14, fontWeight: 700, marginBottom: 20,
                    border: '1px solid rgba(46,204,113,0.2)',
                }}>
                    +{bonusEarned} bonus ball olindi 🎁
                </div>
            )}

            <button onClick={() => navigate('/')} style={{
                width: '100%', maxWidth: 360, padding: '16px 24px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                border: 'none', borderRadius: 16, color: '#1a1a24',
                fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(212,160,23,0.3)', marginBottom: 10,
            }}>🏠 Bosh sahifaga</button>

            <button onClick={() => navigate('/orders')} style={{
                width: '100%', maxWidth: 360, padding: '14px 24px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 16, color: 'var(--text)', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
            }}>📋 Buyurtmalarim</button>
        </div>
    );
}

const pageStyle = {
    minHeight: '100vh', background: 'var(--bg)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 24, textAlign: 'center',
};

const iconContainerStyle = {
    width: 100, height: 100, borderRadius: 28,
    background: 'rgba(212,160,23,0.08)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
};

const goldBtnStyle = {
    width: '100%', maxWidth: 360, padding: '16px 24px',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
    border: 'none', borderRadius: 16, color: '#1a1a24',
    fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(212,160,23,0.3)',
};

const secondaryBtnStyle = {
    width: '100%', maxWidth: 360, padding: '14px 24px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 16, color: 'var(--text)', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
};
