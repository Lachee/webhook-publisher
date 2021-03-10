import axios from 'axios';
import crypto from 'crypto';
import ObjectId from 'node-time-uuid';

export class Executor {

    #privateKey;
    timeout = 3000;


    constructor(privateKey) {
        this.#privateKey = privateKey;
    }

    /** Enqueues a PublishRequest to be processed in the background */
    enqueue(request) {
        // im to lazy to implement a queue, so we just invoke it and ignore the async
        const _ = this.#invoke(request);
    }

    /** Invokes the request, calling all the webhook urls
     * @param { PublishRequest } request
     */
    async #invoke(request) {
        console.log(`Invoking request ${request.id}`);

        //Build the string payload
        const data = {
            id:         request.id,
            event:      request.event,
            author:     request.author,
            payload:    request.payload
        };

        const json      = JSON.stringify(data);
        const signature = this.#sign(json); 
        const headers = {
            'Content-Type':     'application/json',
            'X-Hook-Signature': signature,
            'X-Hook-Event':     request.event,
            'X-Hook-Time':      request.timestamp,
            'X-Hook-ID':        request.id
        };

        let axiosReqs = [];

        //Iterate over all the hosts, generating the appropriate requests
        for(let i in request.hooks) {
            const hook = request.hooks[i];
            const url = hook;
            console.log(`${request.id}: ${request.event} - ${url}`);
            const req = axios.post(url, json, {
                timeout: this.timeout, 
                headers: headers, 
            });   
            axiosReqs.push(req);
        }

        //Wait all
        return await axios.all(axiosReqs);
    }

    /** Signs the payload */
    #sign(payload) {
        const sign = crypto.createSign('SHA256');
        sign.write(payload);
        sign.end();
        return sign.sign(this.#privateKey, 'hex');
    }
}

/** A event request that we need to publish */
export class EventRequest {
    
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