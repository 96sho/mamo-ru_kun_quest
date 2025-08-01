import { distanceToLineSegment, angleDiff } from "../gps";

export function matchRoad(mapData, pos, heading){
    if (!pos) {
        console.log("no pos");
        return null;
    }
    if(!pos.latitude || !pos.longitude) {
        console.log("no lat lon");
        return null;
    }
    if (!mapData) {
        console.log("no map data");
        return null;
    }
    if (!heading) {
        console.log("no heading");
        return null;
    }

    const directionMatchingRoads = Object.keys(mapData.roads)
    .filter(
        key => {
            const road = mapData.roads[key];
            return Math.abs(angleDiff(heading * 2, road.direction * 2)) / 2 < 27;
        }
    );


    let mostLikelyRoad = null;
    let minD = Infinity;
    for(const key of directionMatchingRoads){
        const road = mapData.roads[key];
        
        const p1 = mapData.nodes[road.source];
        const p2 = mapData.nodes[road.target];

        const d = distanceToLineSegment(p1.lat, p1.lon, p2.lat, p2.lon, pos.latitude, pos.longitude);

        if(d < minD){
            minD = d;
            mostLikelyRoad = key;
        }
    }
    //console.log(minD, mostLikelyRoad);
    if(minD > 15){
        return null;
    }

    return mostLikelyRoad;
}

export function matchRoadSide(mapData, roadId, pos){
    console.log("match road side", mapData, roadId, pos);
    const targetNodeId = mapData.roads[roadId].target;
    const sourceNodeId = mapData.roads[roadId].source;

    const targetNode = mapData.nodes[targetNodeId];
    const sourceNode = mapData.nodes[sourceNodeId];

    const roadVector = {x: targetNode.lon - sourceNode.lon, y: targetNode.lat - sourceNode.lat};
    const rightDirection = {x: roadVector.y, y: -roadVector.x};
    const targetToPosVector = {x: pos.longitude - targetNode.lon, y: pos.latitude - targetNode.lat};

    const dot = rightDirection.x * targetToPosVector.x + rightDirection.y * targetToPosVector.y;

    return dot > 0 ? "right" : "left";
}

export function convertSideToPOVSide(mapData, side, currentRoad, heading){
    const roadDirection = mapData.roads[currentRoad].direction;
    if(angleDiff(roadDirection, heading) < 90){
        return side
    }else{
        return side == "right" ? "left" : "right";
    }
}

export function getWayNodes(mapData, wayId){
    const matchingRoads = Object.keys(mapData.roads).filter(roadId => mapData.roads[roadId].wayId == wayId);
    const nodes = [];
    for(const roadId of matchingRoads){
        const road = mapData.roads[roadId];
        nodes.push(mapData.nodes[road.source]);
        nodes.push(mapData.nodes[road.target]);
    }
    return removeDuplicates(nodes);
}

function removeDuplicates(array) {
    return [...new Set(array)];
}

export function getSourceNodeIdFromRoadIdAndDirection(mapData, roadId, direction){
    const roadDirection = mapData.roads[roadId].direction;
    const sourceNodeId = angleDiff(direction, roadDirection) < 90 ? mapData.roads[roadId].source : mapData.roads[roadId].target;
    return sourceNodeId;
}

export function getHeadingNode(mapData, roadId, heading){
    const roadDirection = mapData.roads[roadId].direction;
    if(angleDiff(roadDirection, heading) < 90){
        return mapData.nodes[mapData.roads[roadId].target];
    }else{
        return mapData.nodes[mapData.roads[roadId].source];
    }
}

export function getHeadingNodeId(mapData, roadId, heading){
    const roadDirection = mapData.roads[roadId].direction;
    if(angleDiff(roadDirection, heading) < 90){
        return mapData.roads[roadId].target;
    }else{
        return mapData.roads[roadId].source;
    }
}


function matchRoadWithItsTargetNodeId(mapData, nodeId){
    const matches = Object.keys(mapData.roads).filter(roadId => mapData.roads[roadId].target == nodeId);
    return matches;
}

function matchRoadWithItsSourceNodeId(mapData, nodeId){
    const matches = Object.keys(mapData.roads).filter(roadId => mapData.roads[roadId].source == nodeId);
    return matches;
}

function matchRoadsWithOrigin(mapData, originNode){
    return [...matchRoadWithItsSourceNodeId(mapData, originNode), ...matchRoadWithItsTargetNodeId(mapData, originNode)];
}

function getRoadDirection(mapData, roadId, startNodeId){
    const road = mapData.roads[roadId];
    if(road.source == startNodeId) return road.direction;
    else if (road.target == startNodeId) return (road.direction + 180) % 360;
    else throw new Error("start node not in road");
}

function getNextNodeFromOriginNodeAndDirection(mapData, originNodeId, heading){
    const options = Object.keys(mapData.roads).filter(roadId => mapData.roads[roadId].source == originNodeId || mapData.roads[roadId].target == originNodeId);
    const roadDirections = options.map(roadId => getRoadDirection(mapData, roadId, originNodeId));
    const angleDiffs = roadDirections.map(direction => angleDiff(direction, heading));
    const minAngleDiff = Math.min(...angleDiffs);
    const index = angleDiffs.indexOf(minAngleDiff);
    const chosenRoad = options[index];
    const nextNodeId = mapData.roads[chosenRoad].source == originNodeId ? mapData.roads[chosenRoad].target : mapData.roads[chosenRoad].source;
    return nextNodeId;
}

export function findNextNodesWithProbabilities(mapData, originNodeId, prevRoadHeading, baseP, baseLength, maxLength){
    let resultingNodesWithProbabilities = [];

    const nextRoads = matchRoadsWithOrigin(mapData, originNodeId).filter(roadId => angleDiff(getRoadDirection(mapData, roadId, originNodeId), prevRoadHeading) < 120);
    const distances = nextRoads.map(roadId => mapData.roads[roadId].length);
    const probabilities = calculateProbabilitiesFromRoads(mapData, nextRoads);

    for(let i = 0; i < nextRoads.length; i++){
        const roadDirection = getRoadDirection(mapData, nextRoads[i], originNodeId);
        const nextNode = getNextNodeFromOriginNodeAndDirection(mapData, originNodeId, roadDirection);
        const accumulatedLength = baseLength + distances[i];
        const accumulatedProbability = baseP * probabilities[i];

        if(accumulatedProbability < 0.01){
            continue;
        }
        if(accumulatedLength > maxLength){
            continue;
        }

        if(!isNodeAlreadyAdded(resultingNodesWithProbabilities, nextNode)){
            resultingNodesWithProbabilities.push({
                nodeId: nextNode,
                probability: accumulatedProbability,
                length: accumulatedLength,
                prevDirection: roadDirection
            });
            const recursedResults = findNextNodesWithProbabilities(mapData, nextNode, roadDirection, accumulatedProbability, accumulatedLength, maxLength);
            
            for(const recursed of recursedResults){
                if(!isNodeAlreadyAdded(resultingNodesWithProbabilities, recursed.nodeId)){
                    resultingNodesWithProbabilities.push(recursed);
                }
            }
        }
    }

    return resultingNodesWithProbabilities;
}

function isNodeAlreadyAdded(resultingNodesWithProbabilities, nodeId){
    for(const node of resultingNodesWithProbabilities){
        if(node.nodeId == nodeId) return true;
    }
    return false;
}

function calculateProbabilitiesFromRoads(mapData, roads){
    const roadImportances = roads.map(roadId => getRoadImportanceFromRoadId(mapData, roadId));
    if(roadImportances.length == 0) return [];
    const totalImportance = roadImportances.reduce((a, b) => a + b);
    const probabilities = roadImportances.map(roadImportance => roadImportance / totalImportance);
    return probabilities;
}


export function getRoadImportanceFromRoadId(mapData, roadId){
    const roadImportanceConversion = {
        "motorway": 10,
        "motorway_link": 9,
        "trunk": 8,
        "trunk_link": 8,
        "primary": 6,
        "primary_link": 6,
        "secondary": 4,
        "secondary_link": 4,
        "tertiary": 3,
        "tertiary_link": 3,
        "residential": 1,
        "service": 0.5,
        "unclassified": 1,
    }
    return roadImportanceConversion[mapData.roads[roadId].tags.highway] ? roadImportanceConversion[mapData.roads[roadId].tags.highway]**3 : 1; //increase power to increase relative importance
}

export function findNextNodesWithProbabilitiesAndTimeOfArrival(mapData, currentSpeed, originNodeId, prevRoadHeading, baseP, baseLength, baseTime, maxLength, timeAccumulationAtIntersection){
    let resultingNodesWithProbabilitiesAndTimeOfArrival = [{
        nodeId: originNodeId,
        probability: baseP,
        length: baseLength,
        time: baseTime,
        prevDirection: prevRoadHeading
    }];

    const nextRoads = matchRoadsWithOrigin(mapData, originNodeId).filter(roadId => angleDiff(getRoadDirection(mapData, roadId, originNodeId), prevRoadHeading) < 120)
    const distances = nextRoads.map(roadId => mapData.roads[roadId].length);
    const probabilities = calculateProbabilitiesFromRoads(mapData, nextRoads);
    const roadSpeeds = nextRoads.map(roadId => mapData.roads[roadId].currentSpeed ? mapData.roads[roadId].currentSpeed : (mapData.roads[roadId].speed ? mapData.roads[roadId].speed : currentSpeed));

    for(let i = 0; i < nextRoads.length; i++){
        const roadDirection = getRoadDirection(mapData, nextRoads[i], originNodeId);
        const nextNode = getNextNodeFromOriginNodeAndDirection(mapData, originNodeId, roadDirection);
        const accumulatedLength = baseLength + distances[i];
        const accumulatedProbability = baseP * probabilities[i];
        const accumulatedTime = baseTime + timeAccumulationAtIntersection + mapData.roads[nextRoads[i]].length / roadSpeeds[i];
        if(accumulatedProbability < 0.01){
            continue;
        }
        if(accumulatedLength > maxLength){
            continue;
        }
        if(!isNodeAlreadyAdded(resultingNodesWithProbabilitiesAndTimeOfArrival, nextNode)){
            resultingNodesWithProbabilitiesAndTimeOfArrival.push({
                nodeId: nextNode,
                probability: accumulatedProbability,
                length: accumulatedLength,
                time: accumulatedTime,
                prevDirection: roadDirection
            });
            const recursedResults = findNextNodesWithProbabilitiesAndTimeOfArrival(mapData, currentSpeed, nextNode, roadDirection, accumulatedProbability, accumulatedLength, accumulatedTime, maxLength, timeAccumulationAtIntersection);
            
            for(const recursed of recursedResults){
                if(!isNodeAlreadyAdded(resultingNodesWithProbabilitiesAndTimeOfArrival, recursed.nodeId)){
                    resultingNodesWithProbabilitiesAndTimeOfArrival.push(recursed);
                }
            }
        }
    }
    return resultingNodesWithProbabilitiesAndTimeOfArrival;
}



