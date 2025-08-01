export async function getMapData(lat, lon, r, vehicleType){
    console.log("get map data called", lat, lon, r);
    const response = await fetch(`/api/map?lat=${lat}&lon=${lon}&r=${r}&vehicleType=${vehicleType}`);
    const data = await response.json();
    console.log(Object.keys(data));
    return data
}
export async function setMapData(mapDataRef, lat, lon, r, vehicleType){
    mapDataRef.current = await getMapData(lat, lon, r, vehicleType);
    console.log("set map data called", Object.keys(mapDataRef.current.roads).length);
}

export async function getSurroundingVehicleTimeOfArrivalAndProbabilities(lat, lon, r){
    const response = await fetch(`/api/vehicles?lat=${lat}&lon=${lon}&r=${r}`);
    const data = await response.json();
    return data
}
export async function setSurroundingVehicleTimeOfArrivalAndProbabilities(surroundingVehicleTimeOfArrivalAndProbabilitiesRef, lat, lon, r, sessionId){
    const data = await getSurroundingVehicleTimeOfArrivalAndProbabilities(lat, lon, r);
    //remove self
    delete data[sessionId];
    surroundingVehicleTimeOfArrivalAndProbabilitiesRef.current = data;
}