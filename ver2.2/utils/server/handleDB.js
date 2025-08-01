import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
    legacyMode: false,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        connectionTimeout: 5000
    }
});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

export async function setItem(key, value) {
    await client.set(key, value);
}

export async function getItem(key) {
    return await client.get(key);
}

export async function setJson(key, value) {
    await client.set(key, JSON.stringify(value));
}

export async function getJson(key) {
    return JSON.parse(await client.get(key));
}

export async function getAllkeys(){
    return await client.keys("*");
}

export async function setExpire(key, time) {
    await client.expire(key, time);
}
export async function delItem(key) {
    await client.del(key);
}