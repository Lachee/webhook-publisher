import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs';
import { Service } from "./Service";

// Load the private key that will be used by the publishers.
const privateKey    = fs.readFileSync(process.env.PRIVATE_KEY || 'keys/webhook-private.key');
const publicKey     = fs.readFileSync(process.env.PUBLIC_KEY || 'keys/webhook-public.pub');

// Prepare the service
const service = new Service();

//<<<< REDIS SERVICE
{
    // Create a redis host and add it
    const redisHost = new RedisHost({
        host:       process.env.REDIS_HOST || '127.0.0.1',
        port:       process.env.REDIS_PORT || 6379,
        channel:    process.env.REDIS_CHANNEL
    });
    service.addHost(redisHost);
}

//<<<< WEB SERVICE
{
    // Create a web host and add it
    const webHost = new WebHost({
        port: process.env.WEB_PORT || 80
    });

    // Provide the public key under GET /.well-known/signature.pub
    webHost.providePublicKey(publicKey);
    webHost.addCredential(process.env.WEB_CREDENTIAL_NAME, process.env.WEB_CREDENTIAL_KEY);

    // Add the host
    service.addHost(webHost);
    
    // Setup SSE if we can
    if (process.env.WEB_USE_SSE) {
        const ssePublisher = webHost.createSSEPublisher(privateKey);
        service.addPublisher('sse', ssePublisher);
    }
        
}

//<<<< WEBHOOK PUBLISHING
{
    // Create the webhook publisher
    const whPublisher = new WebhookPublisher({ key: privateKey });
    service.addPublisher('http', whPublisher);
    service.addPublisher('https', whPublisher);
}

// Finally, run the service
service.run().then(() => {
    console.log('Service is finished');
});