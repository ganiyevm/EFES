/**
 * PM2 ekotizim konfiguratsiyasi.
 * Backend va bot alohida jarayonlar sifatida ishlaydi.
 * Birining tushib qolishi ikkinchisiga ta'sir qilmaydi.
 *
 * Ishga tushirish:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save && pm2 startup
 */
module.exports = {
    apps: [
        {
            name: 'efes-api',
            script: './server.js',
            instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
            exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
            watch: false,
            max_memory_restart: '512M',
            restart_delay: 3000,
            max_restarts: 10,
            exp_backoff_restart_delay: 100,
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            error_file: './logs/api-error.log',
            out_file: './logs/api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
        },
        {
            name: 'efes-bot',
            script: process.env.BOT_SCRIPT || '../bot/bot.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '256M',
            restart_delay: 5000,
            max_restarts: 10,
            exp_backoff_restart_delay: 200,
            env: {
                NODE_ENV: 'development',
                PORT: 3001,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3001,
            },
            error_file: './logs/bot-error.log',
            out_file: './logs/bot-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
