/**
 * This is a test function for ids
 */
const ObjectId = require('node-time-uuid');

function wait(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), time);
    });
}

function cmpr(a, b) {
    if (a.length != b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) return false;
    }
    return true;
}

(async () => {
    console.log('generating...');
    let sorted = [];
    let shuffle = [];
    for (let i = 0; i < 10; i++) {
        const id = new ObjectId();
        sorted.push(id.toString());
        shuffle.push(id.toString());
        await wait(Math.random() * 10000);
    }

    shuffle.sort(() => Math.random() - 0.5);
    console.log('Post Shuffle: ', cmpr(sorted, shuffle));

    shuffle.sort();
    console.log('Sorted: ', cmpr(sorted, shuffle));
    console.log(sorted, shuffle);

})();


