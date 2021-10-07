import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs';
import Redis from 'ioredis';
import { Publisher } from './Publisher.mjs';
import { RedisService } from './RedisService.mjs';
import { WebService, Credential } from './WebService.mjs';

//Register the executor
const privateKey    = fs.readFileSync(process.env.PRIVATE_KEY || 'keys/webhook-private.key');
const executor      = new Publisher(privateKey);
const serviceName   = process.env.SERVICE || 'http';

if (process.env.USER_AGENT)
    executor.userAgent = process.env.USER_AGENT;

console.log('Running ', serviceName, 'service');
switch(serviceName) {
    case 'http':
        const webService = new WebService(executor, process.env.PORT || 7080);
        webService.addCredential(new Credential({ 
            name:       process.env.PUBLISHER_NAME || 'app',
            publicKey:  fs.readFileSync(process.env.PUBLISHER_KEY || 'keys/publisher-public.key')
        }));
        webService.listen();
        break;

    case 'redis':
        const redis = new Redis(process.env.REDIS_PORT || 6379, process.env.REDIS_HOST || '127.0.0.1');
        const redisService = new RedisService(executor, redis);
        redisService.subscribe(process.env.REDIS_CHANNEL);
        break;

    default:
        console.error(`Unkown service ${process.env.SERVICE}`);
        break;
}