// Brand logolari — public/logo/ dan haqiqiy rasmlar.

const LOGOS = {
    payme: '/logo/payme.png',
    click: '/logo/click.png',
    yandex: '/logo/yandex.png',
};

function BrandImg({ src, alt, size, style }) {
    return (
        <img
            src={src}
            alt={alt}
            width={size}
            height={size}
            style={{ objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', ...style }}
        />
    );
}

export function PaymeIcon({ size = 20, style }) {
    return <BrandImg src={LOGOS.payme} alt="Payme" size={size} style={style} />;
}

export function ClickIcon({ size = 20, style }) {
    return <BrandImg src={LOGOS.click} alt="Click" size={size} style={style} />;
}

export function YandexIcon({ size = 20, style }) {
    return <BrandImg src={LOGOS.yandex} alt="Yandex" size={size} style={style} />;
}

export function CashIcon({ size = 20, style }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={style}>
            <rect width="32" height="32" rx="7" fill="#2ECC71" />
            <rect x="6" y="10" width="20" height="12" rx="2" fill="none" stroke="#fff" strokeWidth="1.8" />
            <circle cx="16" cy="16" r="3" fill="none" stroke="#fff" strokeWidth="1.8" />
        </svg>
    );
}

export function PaymentIcon({ method, size = 20, style }) {
    if (method === 'payme') return <PaymeIcon size={size} style={style} />;
    if (method === 'click') return <ClickIcon size={size} style={style} />;
    if (method === 'cash') return <CashIcon size={size} style={style} />;
    return null;
}

export function PaymentBadge({ method, size = 16 }) {
    const labels = { payme: 'Payme', click: 'Click', cash: 'Naqd' };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <PaymentIcon method={method} size={size} />
            {labels[method] || method}
        </span>
    );
}
