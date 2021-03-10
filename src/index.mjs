import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs';
import { Executor } from './Executor.mjs';
import { WebService, Credential } from './WebService.mjs';


//Register the executor
const privateKey    = fs.readFileSync(process.env.PRIVATE_KEY || 'keys/webhook-private.key');
const executor      = new Executor(privateKey);

//Register the service
const service       = new WebService(executor, process.env.PORT || 5000);
service.addCredential(new Credential({ 
    name:       process.env.PUBLISHER_NAME || 'app',
    publicKey:  fs.readFileSync(process.env.PUBLISHER_KEY || 'keys/publisher-public.key')
}));

//Listen
service.listen();

