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
        if( accumulatedLength > maxLength){
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


function getRoadImportanceFromRoadId(mapData, roadId){
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
        "unclassified": 1
    }
    return roadImportanceConversion[mapData.roads[roadId].tags.highway] ? roadImportanceConversion[mapData.roads[roadId].tags.highway] : 1;
}