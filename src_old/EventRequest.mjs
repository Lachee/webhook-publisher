
/** A event request that we need to publish */
export class EventRequest {
    
    id;
    timestamp;
    hooks;
    event;
    author;
    payload;

    constructor(data) { 
        this.id         = data.id || (new ObjectId()).toString();
        this.hooks      = data.hooks; //data.hooks.map(h => h instanceof Hook ? h : new Hook(h));
        this.event      = data.event;
        this.author     = data.author;
        this.payload    = data.payload;     
        this.timestamp  = Date.now();

        if (typeof this.author !== 'string') throw new Error('author must be a string');
        if (typeof this.event !== 'string') throw new Error('event must be a string');
        if (typeof this.id !== 'string') throw new Error('id must be a string');
    }
}