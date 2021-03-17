import crypto from 'crypto';

export class History {
    
    #history = {}
    
    /** Pushes a new history object */
    push(url, response) {
        const hash = this.hash(url);
        this.#history[hash] = response;
        return Promise.resolve();
    }

    /** Gets the history for a specific url or hash */
    get(url) {
        const hash = url.startsWith('http') ? this.hash(url) : url;
        return Promise.resolve(this.#history[hash] ?? null);
    }

    /** Gets all the histroy */
    getAll() {
        const h = this.#history;
        return Promise.resolve(h);
    }
    
    /** Hashes the payload with md5 */
    hash(payload) {
        return crypto.createHash('md5').update(payload).digest('hex');
    }
}