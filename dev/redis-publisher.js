const Redis = require("ioredis");
const pub = new Redis();

const channel = 'webhook';
const payload =  {
    hooks: [
        "https://webhook.site/1fa8522f-bedb-49b0-b2ea-10356804d79f"
    ],

    id:     Date.now().toString(),
    event:  "test.event",
    author: "lachee",
    payload: {
        "id":           10,
        "title":        "Event Title",
        "description":  "Test Payload. This means nothing"
    }
};

(async () => {
        
    console.log('publishing...');
    await pub.publish(channel, JSON.stringify(payload));

    console.log('done');
    pub.quit();
})();