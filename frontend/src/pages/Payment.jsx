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

    const [status, setStatus] = useState('pending'); // pending | paid | failed | cash
    const [order, setOrder] = useState(null);
    const [checking, setChecking] = useState(false);
    const pollRef = useRef(null);

    useEffect(() => {
        if (!orderId) { navigate('/'); return; }

        if (method === 'cash') {
            setStatus('cash');
            return;
        }

        // Start polling for payment status
        const poll = async () => {
            try {
                const r = await api.get(`/orders/${orderId}`);
                const o = r.data;
                setOrder(o);
                if (o.paymentStatus === 'paid') {
                    setStatus('paid');
                    clearInterval(pollRef.current);
                } else if (o.paymentStatus === 'failed') {
                    setStatus('failed');
                    clearInterval(pollRef.current);
                }
            } catch {}
        };

        poll();
        pollRef.current = setInterval(poll, 3000);
        return () => clearInterval(pollRef.current);
    }, [orderId, method]);

    const handleManualConfirm = async () => {
        setChecking(true);
        try {
            const r = await api.get(`/orders/${orderId}`);
            if (r.data.paymentStatus === 'paid') {
                setStatus('paid');
                setOrder(r.data);
            } else {
                alert(t('paymentNotConfirmed'));
            }
        } catch {
            alert(t('serverConnectError'));
        } finally {
            setChecking(false);
        }
    };

    // ── Cash ──
    if (status === 'cash') {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>{t('orderSuccess')}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
                    {t('pay_cash')} — {t('status_pending_operator')}
                </div>
                <button onClick={() => navigate('/orders')} style={btnStyle}>
                    📋 {t('viewOrders')}
                </button>
                <button onClick={() => navigate('/')} style={{ ...btnStyle, background: 'var(--bg-secondary)', marginTop: 10 }}>
                    🏠 Bosh sahifaga
                </button>
            </div>
        );
    }

    // ── Paid ──
    if (status === 'paid') {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>{t('paymentReceived')}</div>
                {order?.bonusEarned > 0 && (
                    <div style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                        +{order.bonusEarned} {t('bonusBall')} 🎁
                    </div>
                )}
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
                    {t('status_preparing')} 🍳
                </div>
                <button onClick={() => navigate('/orders')} style={btnStyle}>
                    📋 {t('viewOrders')}
                </button>
            </div>
        );
    }

    // ── Failed ──
    if (status === 'failed') {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 72, marginBottom: 20 }}>❌</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 10 }}>{t('paymentFailed')}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>{t('paymentError')}</div>
                <button onClick={() => navigate(-1)} style={{ ...btnStyle, background: 'var(--accent)' }}>
                    🔄 {t('tryAgain')}
                </button>
                <button onClick={() => navigate('/cart')} style={{ ...btnStyle, background: 'var(--bg-secondary)', marginTop: 10 }}>
                    ← {t('backToCart')}
                </button>
            </div>
        );
    }

    // ── Pending ──
    const providerName = method === 'payme' ? 'Payme' : 'Click';
    const payUrl = method === 'payme'
        ? `https://checkout.paycom.uz/${import.meta.env.VITE_PAYME_ID}?amount=${total * 100}&order=${orderId}`
        : `https://my.click.uz/services/pay?service_id=${import.meta.env.VITE_CLICK_SERVICE_ID}&merchant_id=${import.meta.env.VITE_CLICK_MERCHANT_ID}&amount=${total}&transaction_param=${orderId}`;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>
                {method === 'payme' ? '💳' : '💙'}
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
                {t('paymentSystem')}: {providerName}
            </div>
            <div style={{ fontWeight: 800, fontSize: 24, color: 'var(--primary)', marginBottom: 12 }}>
                {total.toLocaleString()} so'm
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
                {providerName} {t('paymentProviderMsg')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 28 }}>
                🔄 {t('autoUpdateMsg')}
            </div>

            {/* Open payment */}
            <a href={payUrl} target="_blank" rel="noreferrer" style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginBottom: 10 }}>
                💳 {providerName} orqali to'lash
            </a>

            <button onClick={handleManualConfirm} disabled={checking} style={{ ...btnStyle, background: 'var(--bg-secondary)', color: 'var(--text)', marginBottom: 10 }}>
                {checking ? `⏳ ${t('confirmingPayment')}` : `✅ ${t('confirmPayment')}`}
            </button>

            <button onClick={() => navigate('/cart')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
                ← {t('backToCart')}
            </button>
        </div>
    );
}

const btnStyle = {
    width: '100%', maxWidth: 360, padding: '16px 24px',
    background: 'var(--primary)', border: 'none', borderRadius: 14,
    color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
};
