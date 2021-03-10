const http      = require('http');
const crypto    = require('crypto');
const fs        = require('fs');

const publisherPrivateKey = "keys/publisher-private.key";

const server = http.createServer(function(req, res) { 
    let contents = '';
    req.on('data', chunk => { contents += chunk.toString(); });                
    req.on('end', () => { 
        const privateKey = fs.readFileSync(publisherPrivateKey);
        const sign = crypto.createSign('SHA256');
        sign.write(stringified);
        sign.end();
        const signature = sign.sign(privateKey, 'hex');
        res.end(signature);
    });
});
server.listen(9494);
