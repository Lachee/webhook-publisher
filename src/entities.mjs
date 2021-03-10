import crypto from 'crypto';
import ObjectId from 'node-time-uuid';

export class Publisher {
    
    name;
    publicKey;
    
    constructor(options) {
        this.name = options.name;
        this.publicKey = options.publicKey;
    }

    verify(data, signature) {
        const verify = crypto.createVerify('SHA256');
        verify.write(data);
        verify.end();
        return verify.verify(this.publicKey, signature, 'hex');
    }
}

/** A publish request */
export class PublishRequest {
    
    id;
    timestamp;
    hooks;
    event;
    author;
    payload;

    constructor(data) { 
        this.id         = (new ObjectId()).toString();
        this.hooks      = data.hooks; //data.hooks.map(h => h instanceof Hook ? h : new Hook(h));
        this.event      = data.event;
        this.author     = data.author;
        this.payload    = data.payload;     
        this.timestamp  = Date.now();
    }
}

/** Hook to execute. Contains the URL, the precomputed signature and the additional headers
 * @deprecated no longer in use. Hooks are plain URLs now
 */
export class Hook {

    url;
    hmac;

    constructor(data) {
        this.url    = data.url;
        this.hmac   = data.hmac;
    }
}