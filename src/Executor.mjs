import axios from 'axios';
import crypto from 'crypto';
import ObjectId from 'node-time-uuid';
import Queue from 'double-ended-queue';
import { EventEmitter } from 'events';
export class Executor extends EventEmitter {

    userAgent = 'WebhookPub/1.0';
    timeout = 3000;

    #privateKey;
    #queue;
    #processing;

    constructor(privateKey) {
        super();
        this.#privateKey = privateKey;
        this.#queue = new Queue();
        this.#processing = false;
    }

    /** Enqueues a PublishRequest to be processed in the background */
    enqueue(request) {
        this.#queue.push(request);
        this.emit('queued', request);
        this.tryProcessQueue();
    }

    /** Attempts to process the current queue. Returns true if the queue is processing*/
    tryProcessQueue() {
        if (this.#processing) {
            console.log('Cannot process as we are waiting. Queue Size: ', this.#queue.length);
            return true;
        }

        const request = this.#queue.pop();
        if (request === undefined) return false;
        this.emit('dequeued', request);

        console.log('Processing. Queue Size: ', this.#queue.length);
        this.#process(request);
        return this.#processing;
    }

    /** Invokes the request, calling all the webhook urls
     * @param { EventRequest } request
     */
    async #process(request) {
        console.log(`Invoking request ${request.id}`);

        //We have started processing
        this.#processing = true;
        this.emit('beforeExecuted', request);

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
            'Content-Type':         'application/json',
            'User-Agent':           this.userAgent,
            'X-Hook-Signature':     signature,
            'X-Hook-Event':         request.event,
            'X-Hook-Author':        request.author,
            'X-Hook-Time':          request.timestamp,
            'X-Hook-ID':            request.id
        };

        let axiosReqs = [];

        //Iterate over all the hosts, generating the appropriate requests
        for(let i in request.hooks) {
            const hook = request.hooks[i];
            try {
                const url = hook;
                console.log(`${request.id}: ${request.event} - ${url}`);
                const req = axios.post(url, json, {
                    timeout: this.timeout, 
                    headers: headers, 
                });   
                axiosReqs.push(req);
            }catch(e) {
                console.error(`failed executing hook:`, e, hook);
            }
        }

        //Wait all
        const responses = await axios.all(axiosReqs);

        //Clean up and try again.
        this.#processing = false;
        this.emit('executed', request, responses);
        this.tryProcessQueue();
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
        this.id         = data.id || (new ObjectId()).toString();
        this.hooks      = data.hooks; //data.hooks.map(h => h instanceof Hook ? h : new Hook(h));
        this.event      = data.event;
        this.author     = data.author;
        this.payload    = data.payload;     
        this.timestamp  = Date.now();

        if (typeof this.author !== 'string') throw new Error('author must be a string');
        if (typeof this.event !== 'string') throw new Error('event must be a string');
        if (typeof this.id !== 'string') throw new Error('id must be a string');
    }
}