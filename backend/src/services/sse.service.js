/**
 * Server-Sent Events (SSE) xizmati.
 * Mijoz buyurtma sahifasini ochganida ulanadi va holat o'zgarganda
 * yangilashni oladi — polling kerak emas.
 *
 * Ishlatish:
 *   SseService.subscribe(orderId, res)   — yangi client ulanganda
 *   SseService.emit(orderId, payload)    — holat o'zgarganda
 *   SseService.unsubscribe(orderId, res) — client uzilganda
 */
class SseService {
    constructor() {
        // orderId → Set<res> ko'rinishida saqlanadi
        this._clients = new Map();
    }

    subscribe(orderId, res) {
        const key = String(orderId);
        if (!this._clients.has(key)) this._clients.set(key, new Set());
        this._clients.get(key).add(res);
    }

    unsubscribe(orderId, res) {
        const key = String(orderId);
        const set = this._clients.get(key);
        if (!set) return;
        set.delete(res);
        if (set.size === 0) this._clients.delete(key);
    }

    emit(orderId, payload) {
        const key = String(orderId);
        const set = this._clients.get(key);
        if (!set || set.size === 0) return;
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        for (const res of set) {
            try { res.write(data); } catch { set.delete(res); }
        }
    }

    clientCount(orderId) {
        return this._clients.get(String(orderId))?.size || 0;
    }
}

module.exports = new SseService();
