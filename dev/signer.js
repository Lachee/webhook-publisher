/**
 * This is a debug script. It will generate a valid publish signature for the given payload.
 * Useful links: 
 * https://inspector.swagger.io/builder 
 * https://webhook.site/#!/1fa8522f-bedb-49b0-b2ea-10356804d79f
 */
const crypto = require('crypto');
const fs = require('fs');

const publisherPrivateKey = "keys/publisher-private.key";
const publishRequest = {
    hooks: [
        "https://webhook.site/1fa8522f-bedb-49b0-b2ea-10356804d79f"
    ],
    event:  "test.event",
    author: "lachee",
    payload: {
        "id":           10,
        "title":        "Event Title",
        "description":  "Test Payload. This means nothing"
    }
};

//Prepare the payload
const stringified = JSON.stringify(publishRequest);

//Sign the payload
const privateKey = fs.readFileSync(publisherPrivateKey);
const sign = crypto.createSign('SHA256');
sign.write(stringified);
sign.end();
const signature = sign.sign(privateKey, 'hex');

//Return it
console.log('Signed Payload');
console.log(signature);
console.log(stringified);