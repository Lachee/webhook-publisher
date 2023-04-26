const world = "hello";

function hello(who: string): string {
    return `Hello ${who}! `;
}

const text = hello(world);
console.log("result:", text);