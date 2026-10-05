const errorHandler = (err, req, res, next) => {
    // CORS / JSON parse xatolari 500 emas
    const status = err.status || err.statusCode || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('❌ Error:', err.message);
    res.status(status).json({
        error: status >= 500 ? 'Server xatosi' : (err.message || 'So\'rov xatosi'),
    });
};

module.exports = errorHandler;
