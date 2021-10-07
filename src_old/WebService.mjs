import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { EventRequest, Publisher } from './Publisher.mjs';
import { STATUS_CODES } from "http";


export class WebService {
    
    #app;
    #port;
    #server;
    #credentials;
    #executor; 

    /** Endpoint to publish events */
    publishEndpoint = '/publish';

    /** Endpoint to listen for events */
    eventEndpoint = '/events';

    /** list of event clients */
    eventClients = {};

    /**
     * Creates a new webservice
     * @param {Publisher} executor the queue that will invoke the events
     * @param {number} port the port to host the service on 
     */
    constructor(executor, port = 80) {
        this.#port          = port;
        this.#credentials   = {};
        this.#executor      = executor;

        // When we publish an event to a non-http hook, 
        // we will cancel and push to our events
        this.#executor.on('publish', event => {
            if (event.hook.startsWith('hook://')) {
                event.cancelled = true;
                this.#pushEvent(event.target, { event: event.body, signature: event.signature });
                return;
            }
        });
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
        if (this.#app) 
            throw Error('Already listening to a server');
    
        this.#app = express();
        this.#app.use(express.json());
        this.#app.use(cors());

        this.#app.get('/', (req, res) => { res.send({ message: '👋 WebService is running'}); });
        this.#app.post('/publish', this.#handlePublishRequest);
        this.#app.post('/subscribe', this.#handleSubscriptionRequest);
        
        this.#app.use(ErrorHandler);

        this.#app.listen(this.#port, () => {
            console.log(`Listening on http://localhost:${this.#port}/`);
        });
    }

    /** Stops accepting new services */
    stop() {
        if (this.#server == null) throw Error('Server already stopped');
        this.#server.stop();
        this.#server = null;
    }

    /** Pushes an even to the target HTTP connection */
    #pushEvent(target, event) {

        // Broadcast all
        if (target == null) {
            for(let k in this.eventClients) {
                this.#pushEvent(k, event);
            }
            return;
        } 

        // Ensure it exists
        if (!this.eventClients[k]) 
            console.warn('cannot send events to hook because it does not exist', k);
            
        // Prepare the payload
        const payload = `data: ${JSON.stringify(event)}\n\n`;

        // Iterate over every client and send the message
        for(let client of this.eventClients[k]) {
            client.lastSent = Date.now();
            client.response.write(payload);
        }
    }

    /** Validates the request and publishes it to the invoker */
    async #enqueueEvent(data) {
        const req = new EventRequest(data);
        this.#executor.enqueue(req);
        return req.id;
    }
    
    /** Handles a request for a subscription */
    async #handleSubscriptionRequest(req, res) {
        
        //https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app

        // Get the request
        const subscriptionRequest = await this.#readSecureRequestBodyAsync(req);
        if (!subscriptionRequest.hook) {
            throw new HttpError.BadRequest('Missing hook');
        }

        // Client gives a hook url like
        // hook://some-unique-uuid

        // Register hook:// to the publisher

        // When client disconnects, remove hook://

        
        // Begin the event loop
        const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        }
        res.writeHead(200, headers);

        // Push the pending client
        const hook      = subscriptionRequest.hook;
        const clientId  = crypto.randomUUID();

        if (!this.eventClients[hook]) 
            this.eventClients[hook] = [];

        this.eventClients[hook].push({
            id:         clientId,
            connected:  Date.now(),
            lastSent:   null,
            response:   res
        });

        // When they close, pop the client
        res.on('close', () => {
            this.eventClients[hook] = this.eventClients[hook].filter(client => client.id != clientId);
            if (this.eventClients[hook].length == 0)
                delete this.eventClients[hook];
        });

        // Nothing Here. This is now a open connection.
    }

    /** handles the request to publish an event */
    async #handlePublishRequest(req, res) {
        // Enqueue the Event
        const eventRequest = await this.#readSecureRequestBodyAsync(req);
        const snowflake = await this.#enqueueEvent(eventRequest);
        if (snowflake == false) {
            throw new HttpError.BadRequest('Failed to publish event');
        }

        // Return the ID
        res.send({ 'id': snowflake });
    }

    /** Reads the incoming request and validates it against a list of credentials. */
    async #readSecureRequestBodyAsync(req) {
        // Validate: Signature and Credentials
        const signature = req.headers['x-signature'];
        const credname  = req.headers['x-credential'];
        if (!signature || !credname) {
            throw new HttpError.BadRequest('Missing X-Signature or X-Credential headers.');
        }
        
        // Validate: Credentials
        const credential = this.#credentials[credname];
        if (!credential) {
            throw new HttpError.Unauthorized('Missing credentials');
        }

        // Validate: The Body
        let body = await new Promise((resolve, reject) => {
            let contents = '';
            req.on('data', chunk => { contents += chunk.toString(); });
            req.on('end', () => { resolve(contents) });
        });
        if (!body) {
            throw new HttpError.BadRequest('Missing content');
        }

        // Validate: The credential
        if (!credential.verify(body, signature)) {
            throw new HttpError.BadRequest('Invalid signature');
        }

        // Validate: The JSON Payload
        let data = null;
        try {  
            data = JSON.parse(body); 
        } catch(e) { 
            throw new HttpError.UnprocessableEntity('Invalid JSON Payload');
        }
        if (!data)  {
            throw new HttpError.BadRequest('Missing data');
        }

        return data;
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


export function ErrorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  //    //Validation Errors result in a bad request
  //    if (error instanceof Joi.ValidationError)
  //    res.statusCode = 400;

  //Log the endpoint
  console.error(error);

  //SEt the status and return the JSON
  res.status(res.statusCode === 200 ? (error.statusCode || 500) : res.statusCode);
  res.json({
      message: error.message,
      _stacktrace: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
  });
}

/** List of common exceptions. */
// @ts-ignore
export const HttpError = (Object.fromEntries(
  Object.entries(STATUS_CODES)
      // @ts-ignore
      .filter(([k, v]) => k >= 400)
      .map(([k, v]) => {
          let name = STATUS_CODES[k] .replace(/\W/g, '');
          return [ name, function(message) {
              Error.captureStackTrace(this, this.constructor);
              this.name = name;
              this.message = message;
              this.statusCode = k;
          }];
    })
));
