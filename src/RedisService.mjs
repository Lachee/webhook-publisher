import Redis from 'ioredis';
import { EventRequest, Executor } from './Executor.mjs';
import { History } from './History.mjs';
export class RedisService {

    /** @var {Redis} redis the redis connection. */
    #redis;

    /** @var {String[]} channels list of channels subscribed. */
    #channels;

    /** @var {Executor} executor the executor of the webhooks. */
    #executor; 

    /** @var {String[]} channels list of channels to publish. */
    #callbacks;

    /**
     * Creates a new Redis service
     * @param {Executor} executor the queue that will invoke the events
     * @param {Redis} redis Redis connection
     */
    constructor(executor, redis = null) {
        this.#executor  = executor;
        this.#redis     = redis || new Redis();
        this.#channels  = [];
        this.#callbacks = [];
        this.#executor.history = new History(this.#redis);

        //Define the redis events
        const self = this;
        this.#redis.on('message', (channel, message) => {
            self.#handleMessage(message);
        });

        //Define callbacks
        this.#executor.on('executed', (eventRequest, axiosResponses) => {
            console.log('executed', eventRequest, axiosResponses);
            for(let i in self.#callbacks) {
                const channel = self.#callbacks[i];
                if (channel) self.#redis.publish(channel, eventRequest);
            }
        }); 
    }

    /** Defines the channel to push executor events too
     * @return this
     */
    callback(channel) {
        this.#callbacks.push(channel);
        return this;
    }

    /** Removes a callback 
     * @return this
    */
    removeCallback(channel) {
        this.#redis.unsubscribe(channel);
        const index = this.#callbacks.indexOf(channel);
        if (index > -1) this.#callbacks.splice(index, 1);
        return this;
    }

    /** Subscribes to a Redis Pub/Sub channel
     * @return this
     */
    subscribe(channel) {
        this.#redis.subscribe(channel, () => {
            console.log(`Subscribed to channel ${channel}`);
            this.#channels.push(channel);
        });
        return this;
    }

    /** Unsubscribes to a Redis Pub/Sub channel
     * @return this */
    unsubscribe(channel) {
        this.#redis.unsubscribe(channel);
        const index = this.#channels.indexOf(channel);
        if (index > -1) this.#channels.splice(index, 1);
        return this;
    }

    /** Stops the service */
    stop() {
        this.#redis.disconnect();
    }

    /** Handle the message */
    #handleMessage(message) {

        try {  
            //Parse the data
            const eventRequestData = JSON.parse(message); 
                
            //Push to the invoker
            console.log('Handling new request', eventRequestData.event);
            const req = new EventRequest(eventRequestData);
            this.#executor.enqueue(req);
            
        } catch(e) { 
            console.error('Something went wrong', e.message);
        }
    }
}

export class RedisHistory extends History {
        
    /** @var {Redis} redis the redis connection. */
    #redis;

    prefix = '';
    lifetime = 31 * 24 * 60 * 60;

    constructor(redis, prefix = 'webhook:history:') {
        super();
        this.#redis = redis || new Redis();
        this.prefix = prefix;
    }

    /** Pushes a new history object */
    async push(url, response) {
        const hash = this.prefix + this.hash(url);
        await this.#redis.set(hash, JSON.stringify(response));
        await this.#redis.expire(hash, this.lifetime);
    }

    /** Gets the history for a specific url or hash */
    async get(url) {
        const hash = this.prefix + (url.startsWith('http') ? this.hash(url) : url);
        const str = await this.#redis.get(hash);
        return JSON.parse(str);
    }

    /** Gets all the histroy */
    getAll() {
        return Promise.resolve([]);
    }
}