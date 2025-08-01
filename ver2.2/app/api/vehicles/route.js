import { setJson, getAllkeys, getJson, setExpire } from "@/utils/server/handleDB";
import { distance } from "@/utils/gps";

export async function POST(request) {
    const body = await request.json();

    const _start = performance.now();

    const { sessionId, GPS, timeOfArrivalAndProbability, currentRoad, type } = body;

    if (!sessionId || !GPS || !type) {
        return new Response("Bad Request", { status: 400 });
    }

    await setJson(sessionId, {
        GPS: GPS,
        currentRoad: currentRoad,
        timeOfArrivalAndProbability: timeOfArrivalAndProbability,
        type: type,
    });
    await setExpire(sessionId, 10);

    const _end = performance.now();
    console.log("POST /vehicles", _end - _start, sessionId);

    return new Response(`${_end - _start}`, { status: 200 });
}

export async function GET(request) {
    const _start = performance.now();

    const url = new URL(request.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");
    const r = url.searchParams.get("r");

    if (!lat || !lon || !r) {
        return new Response("Bad Request", { status: 400 });
    }

    const matchingVehicles = {};

    const keys = await getAllkeys();
    for (const key of keys) {
        const data = await getJson(key);
        if (!data.GPS) {
            continue;
        }
        if (!data.GPS.coords) {
            continue;
        }
        if (distance(lat, lon, data.GPS.coords.lat, data.GPS.coords.lon) > r) {
            continue;
        }
        matchingVehicles[key] = data;
    }

    const _end = performance.now();
    console.log("GET /vehicles", _end - _start, lat, lon, r);

    return new Response(JSON.stringify({ ...matchingVehicles, internalDelay: _end - _start}), { status: 200 });
}