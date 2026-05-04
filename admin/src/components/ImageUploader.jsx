import { useState, useRef } from 'react';
import api from '../api/axios';

export default function ImageUploader({ value, onChange, uploadPath = '/products/upload-image', label = 'Rasm' }) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(value || '');
    const inputRef = useRef(null);

    const handleFile = async (file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        setUploading(true);
        try {
            const { data } = await api.post(uploadPath, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPreview(data.imageUrl);
            onChange(data.imageUrl);
        } catch (err) {
            alert(err.response?.data?.error || 'Yuklashda xatolik');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleUrlChange = (e) => {
        setPreview(e.target.value);
        onChange(e.target.value);
    };

    const currentImg = preview || value;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="form-label">{label}</label>

            {/* Preview */}
            {currentImg && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                        src={currentImg}
                        alt="preview"
                        style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)', display: 'block' }}
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    <button
                        onClick={() => { setPreview(''); onChange(''); }}
                        style={{
                            position: 'absolute', top: -6, right: -6,
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#e74c3c', color: '#fff', border: 'none',
                            cursor: 'pointer', fontSize: 12, lineHeight: '22px', textAlign: 'center',
                        }}
                    >×</button>
                </div>
            )}

            {/* Upload area */}
            <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                style={{
                    border: '2px dashed var(--border)', borderRadius: 12,
                    padding: '16px 12px', textAlign: 'center',
                    cursor: 'pointer', background: 'var(--bg-secondary)',
                    transition: 'border-color 0.2s',
                    fontSize: 13, color: 'var(--text-secondary)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => handleFile(e.target.files[0])}
                />
                {uploading ? (
                    <span>⏳ Yuklanmoqda...</span>
                ) : (
                    <>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>📁</div>
                        <div>Rasm tanlash yoki bu yerga tashlang</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WEBP · max 5MB</div>
                    </>
                )}
            </div>

            {/* URL input */}
            <input
                className="form-input"
                value={value || ''}
                onChange={handleUrlChange}
                placeholder="Yoki rasm URL ni kiriting..."
                style={{ fontSize: 12 }}
            />
        </div>
    );
}
