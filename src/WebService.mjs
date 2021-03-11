import http from 'http';
import crypto from 'crypto';
import { EventRequest, Executor } from './Executor.mjs';

export class WebService {
    
    #port;
    #server;
    #credentials;
    #executor; 

    endpoint = '/publish';

    /**
     * Creates a new webservice
     * @param {Executor} executor the queue that will invoke the events
     * @param {number} port the port to host the service on 
     */
    constructor(executor, port = 80) {
        this.#port          = port;
        this.#credentials   = {};
        this.#executor      = executor;
    }

    /** Registers new valid credentials
     * @param {Credential} credential
     * @return this 
     */
    addCredential(credential) {
        if (!credential instanceof Credential) throw Error('credential must be of type Credential');
        this.#credentials[credential.name] = credential;
        return this;
    }

    /** Runs the web service */
    listen() {
        if (this.#server) throw Error('Already listening to a server');
    
        //create the server and handle the requests
        const self = this;
        this.#server = http.createServer(async function(req, res) { 
            await self.#handleRequest(req, res);
        });

        //Listen on the open port
        this.#server.listen(this.#port);
        console.log(`Listening on http://localhost:${this.#port}/`);
    }

    /** Stops accepting new services */
    stop() {
        if (this.#server == null) throw Error('Server already stopped');
        this.#server.stop();
        this.#server = null;
    }

    /** Validates the request and publishes it to the invoker */
    async #enqueueEvent(data) {
        const req = new EventRequest(data);
        this.#executor.enqueue(req);
        return req.id;
    }

    /** Handles a request from the http server and gives a response. */
    async #handleRequest(req, res) {
        try {
            if (req.url === this.endpoint) {
                // Validate: POST only
                if (req.method != 'POST')
                    return this.#respond(res, 405, { 'error': 'Method not allowed' });
                
                // Validate: Signature and Credentials
                const signature = req.headers['x-signature'];
                const credname  = req.headers['x-credential'];
                if (!signature || !credname)
                    return this.#respond(res, 400, { 'error': 'Missing X-Signature or X-Credential headers.' });

                // Validate: Credentials
                const credential = this.#credentials[credname];
                if (!credential) 
                    return this.#respond(res, 401, { 'error': 'Invalid credentials' });

                // Validate: The Body
                let body = await new Promise((resolve, reject) => {
                    let contents = '';
                    req.on('data', chunk => { contents += chunk.toString(); });                
                    req.on('end', () => { resolve(contents) });
                });
                if (!body) 
                    return this.#respond(res, 400, { 'error': 'Body is required' });

                // Validate: The credential
                if (!credential.verify(body, signature))
                    return this.#respond(res, 400, { 'error': 'Invalid signature' });

                // Validate: The JSON Payload
                let eventRequestData = null;
                try {  eventRequestData = JSON.parse(body); 
                } catch(e) { return this.#respond(res, 422, { 'error': 'Invalid JSON payload' }); }
                if (!eventRequestData) 
                    return this.#respond(res, 400, { 'error': 'Body is required' })

                // Enqueue the Event
                const snowflake = await this.#enqueueEvent(eventRequestData);
                if (snowflake == false) return this.#respond(res, 400, { 'error': 'Failed to process publication' });

                // Return the ID
                return this.#respond(res, 200, { 'id': snowflake });
            }

            //Send a 404 request otherwise.
            return this.#respond(res, 404, { 'error': 'Resource not found' });
        } catch(error) {
            //Catch any unhandled exceptions and return the message
            return this.#respond(res, 500, { 'error': error.message, 'stack': error.stack  });  
        }
    }

    /** Writes the JSON data out */
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


/** Credentials  */
export class Credential {
    
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
