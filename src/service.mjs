import http from 'http';
import { PublishRequest, Publisher } from './entities.mjs';
import { Invoker } from './invoker.mjs';

export class Service {
    
    #port;
    #server;
    #publishers;
    #invoker; 

    constructor(privateKey, port = 80) {
        this.#port = port;
        this.#publishers = {};
        this.#invoker = new Invoker(privateKey);
    }

    /** Registers a new publisher
     * @param {Publisher} publisher
     * @return this 
     */
    addPublisher(publisher) {
        if (!publisher instanceof Publisher) throw Error('publisher must be of type Publisher');
        this.#publishers[publisher.name] = publisher;
        return this;
    }

    listen() {
        if (this.#server) throw Error('Already listening to a server');
    
        const self = this;
        this.#server = http.createServer(async function(req, res) { 
            await self.#handle(req, res);
        });
        this.#server.listen(this.#port);
        console.log(`Listening on http://localhost:${this.#port}/`);
    }

    /** Validates the request and publishes it to the invoker */
    async #publishRequest(data) {
        const req = new PublishRequest(data);
        console.log(`New PublishRequest ${req.id}`);
        
        this.#invoker.enqueue(req);
        return req.id;
    }

    /** Handles a request from the http server and gives a response. */
    async #handle(req, res) {
        try {
            if (req.url == '/publish') {
                //Validate the request
                if (req.method != 'POST')
                    return this.#respond(res, 405, { 'error': 'Method not allowed' });
                
                const signature = req.headers['x-signature'];
                const pubname   = req.headers['x-publisher'];
                if (!signature || !pubname)
                    return this.#respond(res, 400, { 'error': 'Missing X-Signature or X-Publisher headers.' });

                //Get the publisher
                const publisher = this.#publishers[pubname];
                if (!publisher) 
                    return this.#respond(res, 401, { 'error': 'Invalid publisher' });

                //Consume the body
                let body = await new Promise((resolve, reject) => {
                    let contents = '';
                    req.on('data', chunk => { contents += chunk.toString(); });                
                    req.on('end', () => { resolve(contents) });
                });
                if (!body) 
                    return this.#respond(res, 400, { 'error': 'Body is required' });

                //Verify the body with the publisher
                if (!publisher.verify(body, signature))
                    return this.#respond(res, 400, { 'error': 'Invalid signature' });

                //Get the request object
                let publishRequest = null;
                try { 
                    publishRequest = JSON.parse(body); 
                } catch(e) { 
                    return this.#respond(res, 422, { 'error': 'Invalid JSON payload' }) 
                }
                if (!publishRequest) 
                    return this.#respond(res, 400, { 'error': 'Body is required' })

                //Publish the request and get the snowflake for it
                const snowflake = await this.#publishRequest(publishRequest);
                if (snowflake == false) return this.#respond(res, 400, { 'error': 'Failed to process publication' });

                //Return the snowflake as a response.
                return this.#respond(res, 200, { 'id': snowflake });
            }

            //Send a 404 request otherwise.
            return this.#respond(res, 404, { 'error': 'Resource not found' });
        } catch(error) {
            //Catch any unhandled exceptions and return the message
            return this.#respond(res, 500, { 'error': error.message, 'stack': error.stack  });  
        }
    }

    #respond(res, statusCode, payload) {
        if (payload == null) throw new Error('Cannot have a null payload');
        const body = JSON.stringify(payload);
        const length = body ? body.length : 0;
        res.writeHead(statusCode, {
            'Content-Length': length,
            'Content-Type': 'application/json'
        });
        res.end(body || '');
        return true;
    }
}