import { gpsToJson } from "../gps";

export async function uploadData(sessionId, GPS, currentRoad, timeOfArrivalAndProbability, vehicleType, cruisingSide){
    console.log("GPS", gpsToJson(GPS));

    return await fetch("/api/vehicles", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: sessionId,
            GPS: gpsToJson(GPS),
            currentRoad: currentRoad,
            timeOfArrivalAndProbability: timeOfArrivalAndProbability,
            cruisingSide: cruisingSide,
            type: vehicleType
        }),
    })
    .then((response) => response.text())
    .then((internal_delay_ms) => {
        return internal_delay_ms;  
    })
}
