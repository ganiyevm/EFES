import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT, fmt } from '../i18n';
import api from '../api';

// Telegram ichida tashqi havolani to'g'ri ochish (<a target=_blank> ba'zi
// klientlarda ishlamaydi)
export function openExternal(url) {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank', 'noopener');
}

export default function Payment() {
    const { t } = useT();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const orderId = params.get('orderId');
    const method = params.get('method');
    const total = parseInt(params.get('total') || '0', 10);
    const orderNum = params.get('orderNum') || orderId?.slice(-6).toUpperCase();
    const payUrlFromServer = params.get('payUrl') || '';
    const eta = parseInt(params.get('eta') || '30', 10);
    const type = params.get('type') || 'delivery';
    const when = params.get('when') || '';

    const [status, setStatus] = useState(method === 'cash' ? 'cash' : 'pending');
    const [order, setOrder] = useState(null);
    const [checking, setChecking] = useState(false);
    const pollRef = useRef(null);

    useEffect(() => {
        if (!orderId) { navigate('/', { replace: true }); return; }
        if (method === 'cash') return;

        const poll = async () => {
            if (document.hidden) return; // fon rejimida so'rov yubormaymiz
            try {
                const r = await api.get(`/payment/status/${orderId}`);
                setOrder(r.data);
                if (r.data.paymentStatus === 'paid') {
                    setStatus('paid');
                    clearInterval(pollRef.current);
                } else if (r.data.paymentStatus === 'failed' || r.data.status === 'cancelled') {
                    setStatus('failed');
                    clearInterval(pollRef.current);
                }
            } catch { }
        };

        poll();
        pollRef.current = setInterval(poll, 4000);
        const onVisible = () => { if (!document.hidden) poll(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(pollRef.current);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [orderId, method]);

    const handleManualConfirm = async () => {
        setChecking(true);
        try {
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

    const successProps = { navigate, t, eta, type, when };

    // ── Cash ──
    if (status === 'cash') {
        return <SuccessScreen orderNum={orderNum} bonusEarned={0} {...successProps} />;
    }

    // ── Paid ──
    if (status === 'paid') {
        return <SuccessScreen orderNum={order?.orderNumber || orderNum} bonusEarned={order?.bonusEarned || 0} {...successProps} />;
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
                <button onClick={() => navigate('/menu', { replace: true })} style={{ ...goldBtnStyle, background: 'linear-gradient(135deg, var(--accent), #FF8C42)' }}>
                    🔄 {t('tryAgain')}
                </button>
                <button onClick={() => navigate('/orders', { replace: true })} style={{ ...secondaryBtnStyle, marginTop: 10 }}>
                    📋 {t('myOrdersBtn')}
                </button>
            </div>
        );
    }

    // ── Pending ──
    const providerName = method === 'payme' ? 'Payme' : 'Click';
    // payUrlFromServer — backend tomonidan generatsiya qilingan URL (to'g'ri format)
    // Fallback faqat server URL bo'lmagan holda ishlatiladi
    const payUrl = payUrlFromServer || null;

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
                {fmt(order?.total ?? total)} {t('sum')}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
                {providerName} {t('paymentProviderMsg')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                {t('autoUpdateMsg')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 320, lineHeight: 1.5 }}>
                {t('payUnpaidHint')}
            </div>

            {/* Open payment */}
            {payUrl ? (
                <button onClick={() => openExternal(payUrl)} style={{
                    ...goldBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, marginBottom: 10,
                }}>
                    💳 {t('payVia', { provider: providerName })}
                </button>
            ) : (
                <div style={{ color: '#e74c3c', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                    {t('payLinkMissing')}
                </div>
            )}

            <button onClick={handleManualConfirm} disabled={checking} style={{ ...secondaryBtnStyle, marginBottom: 10 }}>
                {checking ? `⏳ ${t('confirmingPayment')}` : `✅ ${t('confirmPayment')}`}
            </button>

            <button onClick={() => navigate('/orders', { replace: true })} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: 13, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit',
            }}>
                📋 {t('myOrdersBtn')}
            </button>
        </div>
    );
}

function SuccessScreen({ orderNum, navigate, bonusEarned, t, eta, type, when }) {
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
                {t('orderAccepted')}
            </div>

            {/* Order number */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '14px 28px', marginBottom: 16,
                display: 'inline-block',
            }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('orderNumberLabel')}</div>
                <div style={{
                    fontWeight: 900, fontSize: 28,
                    background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>#{orderNum}</div>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 8, maxWidth: 280 }}>
                {when
                    ? t('scheduledMsg', { when })
                    : type === 'pickup'
                        ? t('pickupReadyMsg')
                        : <span dangerouslySetInnerHTML={{ __html: t('deliverWithin', { min: Number(eta) || 30 }) }} />}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>
                {t('thanks')}
            </div>

            {bonusEarned > 0 && (
                <div style={{
                    background: 'rgba(46,204,113,0.08)', color: '#2ecc71',
                    borderRadius: 14, padding: '10px 20px', fontSize: 14, fontWeight: 700, marginBottom: 20,
                    border: '1px solid rgba(46,204,113,0.2)',
                }}>
                    {t('bonusEarnedMsg', { n: bonusEarned })}
                </div>
            )}

            <button onClick={() => navigate('/', { replace: true })} style={{
                width: '100%', maxWidth: 360, padding: '16px 24px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                border: 'none', borderRadius: 16, color: '#1a1a24',
                fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(212,160,23,0.3)', marginBottom: 10,
            }}>🏠 {t('toHome')}</button>

            <button onClick={() => navigate('/orders', { replace: true })} style={{
                width: '100%', maxWidth: 360, padding: '14px 24px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 16, color: 'var(--text)', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
            }}>📋 {t('myOrdersBtn')}</button>
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
