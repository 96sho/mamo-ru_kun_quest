"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useInterval } from '@/utils/hooks/useInterval';

import { updatePos } from '../utils/client/updateFunctions';
import { convertSideToPOVSide, findNextNodesWithProbabilitiesAndTimeOfArrival, getHeadingNodeId, matchRoad, matchRoadSide, getRoadImportanceFromRoadId } from '../utils/client/wayUtils';
import { setMapData, setSurroundingVehicleTimeOfArrivalAndProbabilities } from '@/utils/client/dataRetrieverFunctions';
import { angleDiff, distance } from '@/utils/gps';
import { uploadData } from '@/utils/client/dataUploaderFunctions';


import Status from './display/Status';
import { speakTest, warnApproachingVehicle } from '@/utils/client/handleSpeechSynth';


const App = ({ mapDataRetrievalRadius, vehicleDataRetrievalRadius, maxCrashTimeDifference, alertCrashProbability, vehicleType, crashWarningExpirationTime }) => {
    const [sessionId, setSessionId] = useState(null);

    const mapData = useRef(null);
    const lastMapUpdateGPS = useRef(null);

    const [currentGPS, setCurrentGPS] = useState(null);
    const currentRoad = useRef(null);
    const currentWay = useRef(null);
    const currentHeadingNode = useRef(null);
    const currentRoadSide = useRef(null);

    const surroundingVehicleTimeOfArrivalAndProbabilities = useRef({});

    const probableCrashInfo = useRef({});

    const warnedPossibleCrashes = useRef({});

    const currentStatus = useRef({
        active: false,
        msg: "loading..."
    });

    const mapDataStatus = useRef("loading...");

    const [wakeLock, setWakeLock] = useState(null);


    const [debugMode, setDebugMode] = useState(false);

    const [preventDataUpdate, setPreventDataUpdate] = useState(false);

    const roadNotFoundPoints = useRef([]);

    function copyRoadNotFoundPoints(){
        const a = window.document.createElement('a');
        a.href = window.URL.createObjectURL(new Blob([JSON.stringify(roadNotFoundPoints.current)], {type: 'application/json'}));
        a.download = `${Date.now().toLocaleString()}.json`;

        // Append anchor to body.
        document.body.appendChild(a);
        a.click();

        // Remove anchor from body
        document.body.removeChild(a);
    }

    useEffect(() => {
        setSessionId(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        updatePos(setCurrentGPS, {latitude: 36.37819947562919, longitude: 139.04821099644002});

        if(!navigator){
            return;
        }

        if ("wakeLock" in navigator) {
            navigator.wakeLock.request("screen").then((wakeLock) => {
                setWakeLock(wakeLock);
                console.log("The screen has been locked");
                wakeLock.addEventListener("release", () => {
                    console.log("The screen has been unlocked");
                })
            })
        }
    }, []);
    useInterval(() => {
        if(!currentGPS) return;
        setSurroundingVehicleTimeOfArrivalAndProbabilities(surroundingVehicleTimeOfArrivalAndProbabilities, currentGPS.coords.latitude, currentGPS.coords.longitude, vehicleDataRetrievalRadius, sessionId);
    }, 1000);
    
    useEffect(() => {
        if(!currentGPS) return;
        if(!lastMapUpdateGPS.current){
            lastMapUpdateGPS.current = currentGPS;
            setMapData(mapData, currentGPS.coords.latitude, currentGPS.coords.longitude, mapDataRetrievalRadius, vehicleType)
            .then(() => mapDataStatus.current = "loaded!");
        }
        if(distance(currentGPS.coords.latitude, currentGPS.coords.longitude, lastMapUpdateGPS.current.coords.latitude, lastMapUpdateGPS.current.coords.longitude) > mapDataRetrievalRadius / 2){
            lastMapUpdateGPS.current = currentGPS;
            mapDataStatus.current = "loading new location...";
            setMapData(mapData, currentGPS.coords.latitude, currentGPS.coords.longitude, mapDataRetrievalRadius, vehicleType)
            .then(() => mapDataStatus.current = "loaded!");
        }

        console.log("current wakelock:", !wakeLock?.released)
    }, [currentGPS]);

    useEffect(() => {
        if(!currentGPS) return;
        if(!mapData.current) return;

        currentRoad.current = matchRoad(mapData.current, currentGPS.coords, currentGPS.coords.heading);
        if(!currentRoad.current){
            roadNotFoundPoints.current.push({
                time: Date.now(),
                lat: currentGPS.coords.latitude,
                lon: currentGPS.coords.longitude,
                heading: currentGPS.coords.heading,
                speed: currentGPS.coords.speed,
                accuracy: currentGPS.coords.accuracy,
                altitude: currentGPS.coords.altitude,
                altitudeAccuracy: currentGPS.coords.altitudeAccuracy,
            })

            currentWay.current = null;
            currentHeadingNode.current = null;
            currentRoadSide.current = null;

            currentStatus.current = {
                active: false,
                msg: "no road found"
            };
            return;
        }
        currentWay.current = mapData.current.roads[currentRoad.current].wayId;
        currentHeadingNode.current = getHeadingNodeId(mapData.current, currentRoad.current, currentGPS.coords.heading);
        console.log("current heading node", currentHeadingNode.current);

        const cruisingSide = matchRoadSide(mapData.current, currentRoad.current, currentGPS.coords);
        currentRoadSide.current = cruisingSide;

        const distanceToNextNode = distance(currentGPS.coords.latitude, currentGPS.coords.longitude, mapData.current.nodes[currentHeadingNode.current].lat, mapData.current.nodes[currentHeadingNode.current].lon)
        const nextNodes = findNextNodesWithProbabilitiesAndTimeOfArrival(
            mapData.current,
            currentGPS.coords.speed,
            currentHeadingNode.current,
            currentGPS.coords.heading,
            1,
            distanceToNextNode,
            distanceToNextNode / currentGPS.coords.speed,
            150,
            2
        )
        console.log("next nodes length", nextNodes.length);

        const selfTimeOfArrivalAndProbability = {}
        for(const node of nextNodes){
            selfTimeOfArrivalAndProbability[node.nodeId] = {
                probability: node.probability,
                timeOfArrival: node.time,
                direction: node.prevDirection,
                length: node.length
            }
        }

        currentStatus.current = {
            active: true,
            msg: "all good!"
        };
        
        if(!preventDataUpdate){
            uploadData(sessionId, currentGPS, currentRoad.current, selfTimeOfArrivalAndProbability, vehicleType, cruisingSide);
        }

        console.log("time of arrival and probability", surroundingVehicleTimeOfArrivalAndProbabilities.current);
        
        const probableCrashInfoBuff = [];

        console.log("next nodes", Object.keys(selfTimeOfArrivalAndProbability));
        
        const nextNodeIds = Object.keys(selfTimeOfArrivalAndProbability);

        for(const vehicleId of Object.keys(surroundingVehicleTimeOfArrivalAndProbabilities.current)){
            const vehicle = surroundingVehicleTimeOfArrivalAndProbabilities.current[vehicleId];
            const commonNodeIds = Object.keys(vehicle.timeOfArrivalAndProbability).filter(nodeId => nextNodeIds.includes(nodeId));
            const dataAge = (new Date() - vehicle.GPS.timestamp)/1000;
            for(const nodeId of commonNodeIds){
                if(Math.abs(angleDiff(vehicle.timeOfArrivalAndProbability[nodeId].direction * 2, selfTimeOfArrivalAndProbability[nodeId].direction) * 2) / 2 < 25){
                    continue;
                }
                if(Math.abs(selfTimeOfArrivalAndProbability[nodeId].timeOfArrival - (vehicle.timeOfArrivalAndProbability[nodeId].timeOfArrival - dataAge)) > maxCrashTimeDifference){
                    continue;
                }
                const probabilityOfCrash = selfTimeOfArrivalAndProbability[nodeId].probability * vehicle.timeOfArrivalAndProbability[nodeId].probability;
                if(probabilityOfCrash < alertCrashProbability){
                    continue;
                } 
                const approachingSide = convertSideToPOVSide(mapData.current, matchRoadSide(mapData.current, currentRoad.current, vehicle.GPS.coords), currentRoad.current, currentGPS.coords.heading);
                probableCrashInfoBuff.push(
                    {
                        nodeId: nodeId,
                        vehicleType: vehicle.type,
                        side: approachingSide,
                        timeOfCrash: vehicle.timeOfArrivalAndProbability[nodeId].timeOfArrival, 
                        probabilityOfCrash: probabilityOfCrash,
                        distanceToNode: selfTimeOfArrivalAndProbability[nodeId].length,
                        age: dataAge,
                    }
                )
            }
        }
        probableCrashInfo.current = probableCrashInfoBuff;

        let crashToWarn = null;
        let minDistance = Infinity;
        for(const crash of probableCrashInfo.current){
            if(crash.age > 4){
                continue;
            }

            const currentRoadLanes = mapData.current.roads[currentRoad]?.lanes;
            const sidesMatch = crash.side != convertSideToPOVSide(mapData.current, cruisingSide.current, currentRoad.current, currentGPS.coords.heading);
            
            if(currentRoadLanes && currentRoadLanes >= 4){
                if(sidesMatch){
                    continue;
                }
            } else if (getRoadImportanceFromRoadId(mapData.current, currentRoad.current) > 3) {
                if(sidesMatch){
                    continue;
                }
            }

            if(crash.distanceToNode == minDistance){
                if(crashToWarn.timeOfCrash > crash.timeOfCrash){
                    continue;
                }
                crashToWarn = crash;
            } else if (crash.distanceToNode < minDistance) {
                minDistance = crash.distanceToNode;
                crashToWarn = crash;
            }
        }

        if(crashToWarn && warnedPossibleCrashes.current[crashToWarn.nodeId]){
            if(warnedPossibleCrashes.current[crashToWarn.nodeId] + crashWarningExpirationTime < Date.now()){
                delete warnedPossibleCrashes.current[crashToWarn.nodeId];
            }
        }

        if(crashToWarn && !Object.keys(warnedPossibleCrashes.current).includes(crashToWarn.nodeId) && !window.speechSynthesis.speaking){
            warnApproachingVehicle(crashToWarn.distanceToNode, crashToWarn.vehicleType, crashToWarn.side, 1.5, "en");
            warnedPossibleCrashes.current[crashToWarn.nodeId] = Date.now();
        }
    }, [currentGPS, preventDataUpdate]);


    return (
        <>
            <button onClick={() => speakTest(1.5, "ja")}>Allow SpeechSynth</button>
            <input type="checkbox" id="debug" value={debugMode} onChange={(e) => setDebugMode(e.target.checked)} style={{ width: 20, height: 20 }} />
            <label htmlFor="debug">Debug</label>
            <input type="checkbox" id="preventDataUpdate" value={preventDataUpdate} onChange={(e) => setPreventDataUpdate(e.target.checked)} style={{ width: 20, height: 20 }}/>
            <label htmlFor="preventDataUpdate">Prevent Data Update</label>
            <div style={{ display: debugMode ? "block" : "none" }}>
                <div>
                    <p>Status: {currentStatus.current.msg}</p>
                    <p>Session Id: {sessionId}</p>
                </div>
                {currentGPS && (
                    <div>
                        <p>Timestamp: {currentGPS.timestamp}</p>
                        <p>Accuracy: {currentGPS.coords.accuracy}</p>
                        <p>Speed: {currentGPS.coords.speed ? currentGPS.coords.speed : "n/a"}</p>
                        <p>Heading: {currentGPS.coords.heading ? currentGPS.coords.heading : "n/a"}</p>
                        <p>Latitude: {currentGPS.coords.latitude}</p>
                        <p>Longitude: {currentGPS.coords.longitude}</p>
                    </div>
                )}
                <div>
                    <p>WayId: {currentWay.current ? currentWay.current : "null"}</p>
                    <p>RoadId: {currentRoad.current ? currentRoad.current : "null"}</p>
                    <p>Heading Node: {currentHeadingNode.current ? currentHeadingNode.current : "null"}</p>
                    <p>Surrounding Vehicles Length: {surroundingVehicleTimeOfArrivalAndProbabilities.current ? Object.keys(surroundingVehicleTimeOfArrivalAndProbabilities.current).length : "null"}</p>
                    <p>Cruising Side: {currentRoadSide.current ? currentRoadSide.current : "null"}</p>
                    <pre>Road: {JSON.stringify(mapData.current && currentRoad.current ? mapData.current.roads[currentRoad.current] : {}, null, "\t")}</pre>
                    <pre>Probable Crashes: {JSON.stringify(probableCrashInfo.current, null, "\t")}</pre>
                </div>
            </div>
            <Status 
                sessionId={sessionId}
                mapDataStatus={mapDataStatus.current}
                mapData={mapData.current} 
                currentGPS={currentGPS} 
                currentRoad={currentRoad.current}
                currentWay={currentWay.current}
                currentCruisingSide={currentRoadSide.current}
                currentHeadingNode={currentHeadingNode.current}
                surroundingVehicleTimeOfArrivalAndProbabilities={surroundingVehicleTimeOfArrivalAndProbabilities.current}
                probableCrashInfo={probableCrashInfo.current}
            />
            <button onClick={() => copyRoadNotFoundPoints()}>Copy Road Not Found Points</button>
        </>
    )
}

export default App