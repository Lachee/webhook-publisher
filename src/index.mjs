import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs';
import { Service } from './service.mjs';
import { Publisher } from './entities.mjs';

//Register the service
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY || 'keys/webhook-private.key');
const service = new Service(privateKey, process.env.PORT || 5000);

//Register an example publisher
service.addPublisher(new Publisher({ 
    name: process.env.PUBLISHER_NAME || 'app',
    publicKey: fs.readFileSync(process.env.PUBLISHER_KEY || 'keys/publisher-public.key')
}));

//Listen
service.listen();

