import { direction, distance } from "@/utils/gps";
import mapFilter from "@/data/mapFilter";
import { getAllkeys, getJson } from "@/utils/server/handleDB";

async function getRoadGraphData(lat, lon, radius) {
    // Define the Overpass API URL with the query
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(way(around:${radius},${lat},${lon})[highway];>;);out body;`;

    try {
        // Fetch the data from the Overpass API
        const response = await fetch(overpassUrl);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        // Parse the JSON data
        const data = await response.json();

        // Extract nodes and ways (roads)
        const nodes = {};
        data.elements.forEach((element) => {
            if (element.type === "node") {
                nodes[element.id] = {
                    id: element.id,
                    lat: element.lat,
                    lon: element.lon,
                };
            }
        });

        const ways = data.elements.filter((element) => element.type === "way");

        // Construct the graph data
        const graph = ways.filter((way) => mapFilter.include.includes(way.tags.highway)).map((way) => {
            return {
                wayId: way.id,
                nodes: way.nodes.map((nodeId) => nodes[nodeId]),
                tags: way.tags,
            };
        });

        return graph;
    } catch (error) {
        console.error("Failed to retrieve road graph data:", error);
        return null;
    }
}

export async function GET(request) {
    //get lat, lon, r from query
    const url = new URL(request.url);
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");
    const radius = url.searchParams.get("r");
    const vehicleType = url.searchParams.get("vehicleType");

    if (!lat || !lon || !radius) {
        return new Response("Bad Request", { status: 400 });
    }

    const graph = await getRoadGraphData(lat, lon, radius);

    const nodes = {};
    const roads = {};
    for(const road of graph){
        let prevNodeId = road.nodes[0].id;
        nodes[prevNodeId] = { lat: road.nodes[0].lat, lon: road.nodes[0].lon };
        for(const node of road.nodes.slice(1)){
            nodes[node.id] = { lat: node.lat, lon: node.lon };
            roads[`${prevNodeId}-${node.id}`] = { 
                wayId: road.wayId, 
                source: prevNodeId, 
                target: node.id, 
                tags: road.tags, 
                direction: direction(nodes[prevNodeId].lat, nodes[prevNodeId].lon, nodes[node.id].lat, nodes[node.id].lon),
                length: distance(nodes[prevNodeId].lat, nodes[prevNodeId].lon, nodes[node.id].lat, nodes[node.id].lon),
                currentSpeed: await getRoadSpeed(road.wayId, vehicleType)
            };
            prevNodeId = node.id;
        }
    }

    return new Response(JSON.stringify({ nodes, roads }));
}

export async function getRoadSpeed(roadId, vehicleType){
    const users = await getAllkeys();
    const speeds = []
    for(const user of users){
        const data = await getJson(user);
        if(!data){
            continue;
        }
        if(data.currentRoad != roadId){
            continue;
        }
        if(!data.GPS){
            continue;
        }
        if(!data.GPS.coords){
            continue;
        }
        if(data.type != vehicleType){
            continue;
        }
        if(data.GPS.coords.speed < 1){
            continue;
        }
        speeds.push(data.GPS.coords.speed);
    }
    if(speeds.length == 0){
        return null;
    }
    return speeds.reduce((a, b) => a + b, 0) / speeds.length;
}