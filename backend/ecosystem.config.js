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
            script: '/app/backend/server.js',
            // 1 instance (cluster mode emas) — RAM tejash uchun.
            // Trafik oshsa, qayta 2 ga ko'tariladi.
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            // RAM cheklash: 256MB dan oshsa qayta start
            max_memory_restart: '256M',
            // Node.js heap'ni cheklash — RSS o'sib ketishini oldini oladi
            node_args: '--max-old-space-size=200',
            restart_delay: 3000,
            max_restarts: 10,
            exp_backoff_restart_delay: 100,
            env: { NODE_ENV: 'development', PORT: 3000 },
            env_production: { NODE_ENV: 'production', PORT: 3000 },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
        },
        {
            name: 'efes-bot',
            script: '/app/bot/bot.js',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '128M',
            node_args: '--max-old-space-size=100',
            restart_delay: 5000,
            max_restarts: 10,
            exp_backoff_restart_delay: 200,
            env: { NODE_ENV: 'development', PORT: 3001 },
            env_production: { NODE_ENV: 'production', PORT: 3001 },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
