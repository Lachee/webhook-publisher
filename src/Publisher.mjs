import axios from 'axios';
import crypto from 'crypto';
import ObjectId from 'node-time-uuid';
import Queue from 'double-ended-queue';
import { EventEmitter } from 'events';
import { EventRequest } from './EventRequest.mjs';

/**
 * Sends all the webhook requests out via axios.
 * 
 */
export class Publisher extends EventEmitter {

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

        // If event was cancelled, then do nothing
        const beforePublishEvent = { request: request };
        this.emit('beforePublish', beforePublishEvent);
        
        //setTimeout(async () => {
            //Build the string payload
            const data = {
                id:         request.id,
                event:      request.event,
                author:     request.author,
                payload:    request.payload
            };

            const json      = JSON.stringify(data);
            const signature = this.sign(json); 
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
                
                // Invoke the publish event
                const publishEvent = { 
                    cancelled:  false,
                    target:     hook,
                    data:       data,
                    body:       body,
                    signature:  signature,
                };
                this.emit('publish', publishEvent);

                // If it wasn't cancelled, then send hte axios request
                if (!publishEvent.cancelled) {
                    try {
                        console.log(`AXIOS ${request.id}: ${request.event} - ${hook}`);
                        const req = axios.post(hook, json, {
                            timeout: this.timeout, 
                            headers: headers, 
                        });   
                        axiosReqs.push(req);
                    }catch(e) {
                        console.error(`failed executing hook:`, e, hook);
                    }
                } else {
                    console.log(`Cancelled ${request.id}: ${request.event} - ${hook}`);
                }
            }

            //Wait all
            const responses = await axios.all(axiosReqs);

            //Clean up and try again.
            this.#processing = false;

            // emit the published event
            const publishedEvent = { request, responses };
            this.emit('published', publishedEvent);

            this.tryProcessQueue();
        //}, 100); //Artifically delay the process for testing purposes.
    }

    /** Signs the payload */
    sign(payload) {
        const sign = crypto.createSign('SHA256');
        sign.write(payload);
        sign.end();
        return sign.sign(this.#privateKey, 'hex');
    }
}
