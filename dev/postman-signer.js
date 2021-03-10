const http      = require('http');
const crypto    = require('crypto');
const fs        = require('fs');

const publisherPrivateKey = "keys/private.key";
const port = 9494;

const server = http.createServer(function(req, res) { 
    console.log('processing request');

    let contents = '';
    req.on('data', chunk => { contents += chunk.toString(); });                
    req.on('end', () => { 
        const privateKey = fs.readFileSync(publisherPrivateKey);
        const sign = crypto.createSign('SHA256');
        sign.write(contents);
        sign.end();
        const signature = sign.sign(privateKey, 'hex');
    
        console.log('Signature', contents, signature);
        res.end(signature);
    });
});
server.listen(port);
console.log(`Listening to http://localhost:${port}`);