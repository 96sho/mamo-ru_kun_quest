"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useInterval } from '@/utils/hooks/useInterval';

import { updatePos } from '../utils/client/updateFunctions';
import { convertSideToPOVSide, findNextNodesWithProbabilitiesAndTimeOfArrival, getHeadingNodeId, matchRoad, matchRoadSide, getRoadImportanceFromRoadId } from '../utils/client/wayUtils';
import { setMapData, setSurroundingVehicleTimeOfArrivalAndProbabilities } from '@/utils/client/dataRetrieverFunctions';
import { 
    angleDiff, 
    angleDiffAcute, 
    distance, 
    distanceToLineSegment, 
    distanceToLineWithOriginAndDirection,
    headingToCompass8
} from '@/utils/gps';
import { uploadData } from '@/utils/client/dataUploaderFunctions';


import Status from './display/Status';
import { speakDisabledByGPS, speakEnabledByGPS, speakTest, warnApproachingVehicle, warnApproachingVehicleWhenStationary } from '@/utils/client/handleSpeechSynth';


import { Debugger } from '@/utils/debug/debug';
import { gpsToJson } from '@/utils/gps';


const App = ({ 
    mapDataRetrievalRadius, 
    vehicleDataRetrievalRadius, 
    maxCrashTimeDifference,
    maxApproachingVehicleWarningDistanceWhenStationary, 
    alertCrashProbability, 
    vehicleType, 
    crashWarningExpirationTime, 
    voiceSpeed 
}) => {
    const [sessionId, setSessionId] = useState(null);

    const mapData = useRef(null);
    const lastMapUpdateGPS = useRef(null);

    const [currentGPS, setCurrentGPS] = useState(null);
    const currentRoad = useRef(null);
    const currentWay = useRef(null);
    const currentHeadingNode = useRef(null);
    const currentRoadSide = useRef(null);

    const surroundingVehicleTimeOfArrivalAndProbabilities = useRef({});
    const selfTimeOfArrivalAndProbability = useRef({});

    const probableCrashInfo = useRef({});

    const warnedPossibleCrashes = useRef({});

    const warningStopped = useRef(false);


    //--------------- for debug ----------------
    const currentStatus = useRef({
        active: false,
        msg: "loading..."
    });

    const mapDataStatus = useRef("loading...");

    const [wakeLock, setWakeLock] = useState(null);


    const [showDebug, setShowDebug] = useState(false);
    const [debugMode, setDebugMode] = useState(true);

    const [preventDataUpdate, setPreventDataUpdate] = useState(true);

    const roadNotFoundPoints = useRef([]);

    const appDebugger = useRef(new Debugger(debugMode));
    
    function copyRoadNotFoundPoints(){
        downloadJSON(roadNotFoundPoints.current, `${Date.now().toLocaleString()}.json`);
    }
    function downloadJSON(data, filename){
        const a = window.document.createElement('a');
        a.href = window.URL.createObjectURL(new Blob([JSON.stringify(data)], {type: 'application/json'}));
        a.download = filename;
        
        // Append anchor to body.
        document.body.appendChild(a);
        a.click();
        
        // Remove anchor from body
        document.body.removeChild(a);
    }
    //--------------------------------------------
    
    useEffect(() => {
        setSessionId(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        updatePos(setCurrentGPS/* , {latitude: 36.37819947562919, longitude: 139.04821099644002} */);

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
    useInterval(async () => {
        if(!currentGPS) return;
        //appDebugger.current.measureTime("surroundingVehicleRetrievalDelay", async () => await setSurroundingVehicleTimeOfArrivalAndProbabilities(surroundingVehicleTimeOfArrivalAndProbabilities, currentGPS.coords.latitude, currentGPS.coords.longitude, vehicleDataRetrievalRadius, sessionId))
        
        const _start = performance.now();
        await setSurroundingVehicleTimeOfArrivalAndProbabilities(surroundingVehicleTimeOfArrivalAndProbabilities, currentGPS.coords.latitude, currentGPS.coords.longitude, vehicleDataRetrievalRadius, sessionId)
        const _end = performance.now();
        appDebugger.current.addData("surroundingVehicleRetrievalDelay", _end - _start);
        appDebugger.current.addData("surroundingVehicleRetrievalInternalDelay", {n_vehicles: Object.keys(surroundingVehicleTimeOfArrivalAndProbabilities.current).length - 1, internalDelay: surroundingVehicleTimeOfArrivalAndProbabilities.current.internalDelay});
    }, 2500);
    
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

        console.log("current wakelock:", !wakeLock?.released);

        appDebugger.current.addData("allGPSUpdates", currentGPS);
    }, [currentGPS]);

    useEffect(() => {
        if(!currentGPS) return;
        if(!mapData.current) return;

        appDebugger.current.increment("gpsUpdate");

        if(currentGPS.coords.accuracy > 20){
            if(!warningStopped.current){
                speakDisabledByGPS(voiceSpeed, "ja");
            }
            warningStopped.current = true;

            appDebugger.current.increment("insufficientGPSAccuracy");

            return;
        }else if(warningStopped.current){
            speakEnabledByGPS(voiceSpeed, "ja");
            warningStopped.current = false;
        }

        if(calculateCruisingRoad())
        if(calculateNextNodes())
        if(calculateProbableCrashes())
        warnPossibleCrashes();

        uploadDataToServer();

        appDebugger.current.measureInterval("gpsUpdateDurations");
    }, [currentGPS]);
    function calculateCruisingRoad(){
        appDebugger.current.increment("calculateCruisingRoad");
        console.log("calculateCruisingRoad called");
        currentRoad.current = matchRoad(mapData.current, currentGPS.coords, currentGPS.coords.heading);
        /* if(currentGPS.coords.speed < 0){
            appDebugger.current.increment("lowSpeed");
            appDebugger.current.addData("detectedRoad", {GPSTime: currentGPS.timestamp, currentRoad: "lowSpeed"});
            console.log("low speed");
            return false;
        } */
        if(!currentRoad.current){
            appDebugger.current.increment("noRoadFound");
            appDebugger.current.addData("detectedRoad", {GPSTime: currentGPS.timestamp, currentRoad: "noRoadFound"});
            console.log("no road found");
            roadNotFoundPoints.current.push({
                time: currentGPS.timestamp,
                lat: currentGPS.coords.latitude,
                lon: currentGPS.coords.longitude,
                heading: currentGPS.coords.heading,
                speed: currentGPS.coords.speed,
                accuracy: currentGPS.coords.accuracy,
                altitude: currentGPS.coords.altitude,
                altitudeAccuracy: currentGPS.coords.altitudeAccuracy,
            });
    
            currentWay.current = null;
            currentHeadingNode.current = null;
            currentRoadSide.current = null;
            selfTimeOfArrivalAndProbability.current = {};
    
            currentStatus.current = {
                active: false,
                msg: "no road found"
            };
            return false;
        }
        currentWay.current = mapData.current.roads[currentRoad.current].wayId;
        currentHeadingNode.current = getHeadingNodeId(mapData.current, currentRoad.current, currentGPS.coords.heading);
        console.log("current heading node", currentHeadingNode.current);
        
        const cruisingSide = matchRoadSide(mapData.current, currentRoad.current, currentGPS.coords);
        currentRoadSide.current = cruisingSide;
        console.log("calculateCruisingRoad Done");

        appDebugger.current.addData("detectedRoad", {
            GPSTime: currentGPS.timestamp, 
            currentRoad: currentRoad.current, 
            headingNode: currentHeadingNode.current,
            sourceNodePos: mapData.current.nodes[mapData.current.roads[currentRoad.current].sourceNode], 
            targetNodePos: mapData.current.nodes[mapData.current.roads[currentRoad.current].targetNode], 
            currentRoadSide: cruisingSide
        });
        appDebugger.current.increment("roadFound");

        return true;
    }
    function calculateNextNodes(){
        console.log("calculateNextNodes called");
        const distanceToNextNode = distance(currentGPS.coords.latitude, currentGPS.coords.longitude, mapData.current.nodes[currentHeadingNode.current].lat, mapData.current.nodes[currentHeadingNode.current].lon)
        console.log("distanceToNextNode", distanceToNextNode);
        console.log("current speed", currentGPS.coords.speed);
        console.log("base time", distanceToNextNode / currentGPS.coords.speed);
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
        );
        console.log("next nodes length", nextNodes.length);

        for(const node of nextNodes){
            selfTimeOfArrivalAndProbability.current[node.nodeId] = {
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

        console.log("gps:", currentGPS)
        console.log("self time of arrival and probability", selfTimeOfArrivalAndProbability.current);

        console.log("calculateNextNodes Done");

        return true;
    }
    async function uploadDataToServer(){
        console.log("uploadDataToServer called");
        if(preventDataUpdate){
            return true;
        }
        const _delay = await uploadData(sessionId, currentGPS, currentRoad.current, selfTimeOfArrivalAndProbability.current, vehicleType, currentRoadSide.current);
        appDebugger.current.addData("surroundingVehicleUploadInternalDelay", _delay);
        console.log("uploadDataToServer Done");

        return true;
    }
    function calculateProbableCrashes(){
        console.log("calculateProbableCrashes called");
        console.log("time of arrival and probability", surroundingVehicleTimeOfArrivalAndProbabilities.current);
        
        const probableCrashInfoBuff = [];
    
        console.log("next nodes", Object.keys(selfTimeOfArrivalAndProbability.current));
        
        const nextNodeIds = Object.keys(selfTimeOfArrivalAndProbability.current);
    
        for(const vehicleId of Object.keys(surroundingVehicleTimeOfArrivalAndProbabilities.current)){
            const vehicle = surroundingVehicleTimeOfArrivalAndProbabilities.current[vehicleId];
            if(!vehicle.currentRoad){
                continue;
            }
            const commonNodeIds = Object.keys(vehicle.timeOfArrivalAndProbability).filter(nodeId => nextNodeIds.includes(nodeId));
            const dataAge = (currentGPS.timestamp - vehicle.GPS.timestamp)/1000;
            console.log("common node ids", commonNodeIds);
            for(const nodeId of commonNodeIds){
                /* if(Math.abs(angleDiff(vehicle.timeOfArrivalAndProbability[nodeId].direction * 2, selfTimeOfArrivalAndProbability.current[nodeId].direction) * 2) / 2 < 25){
                    continue;
                } */
                if(angleDiffAcute(vehicle.timeOfArrivalAndProbability[nodeId].direction, selfTimeOfArrivalAndProbability.current[nodeId].direction) < 20){
                    continue;
                }
                if(Math.abs(selfTimeOfArrivalAndProbability.current[nodeId].timeOfArrival - (vehicle.timeOfArrivalAndProbability[nodeId].timeOfArrival - dataAge)) > maxCrashTimeDifference){
                    continue;
                }
                const probabilityOfCrash = selfTimeOfArrivalAndProbability.current[nodeId].probability * vehicle.timeOfArrivalAndProbability[nodeId].probability;
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
                        distanceToNode: selfTimeOfArrivalAndProbability.current[nodeId].length,
                        age: dataAge,
                        created: currentGPS.timestamp
                    }
                )
            }
        }
        probableCrashInfo.current = probableCrashInfoBuff;

        console.log("calculateProbableCrashes Done");

        return true;
    }
    function warnPossibleCrashes(){
        console.log("warnPossibleCrashes called");
        let crashToWarn = null;
        let minDistance = Infinity;
        let toRemove = [];
        for(const crash of probableCrashInfo.current){
            if(crash.age > 3.5){
                toRemove.push(crash.nodeId);
                continue;
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
        probableCrashInfo.current = probableCrashInfo.current.filter(crash => !toRemove.includes(crash.nodeId));

        if(crashToWarn && warnedPossibleCrashes.current[crashToWarn.nodeId]){
            if(warnedPossibleCrashes.current[crashToWarn.nodeId] + crashWarningExpirationTime < currentGPS.timestamp){
                delete warnedPossibleCrashes.current[crashToWarn.nodeId];
            }
        }

        if(crashToWarn && !Object.keys(warnedPossibleCrashes.current).includes(crashToWarn.nodeId) && !window.speechSynthesis.speaking){
            warnApproachingVehicle(crashToWarn.distanceToNode, crashToWarn.vehicleType, crashToWarn.side, voiceSpeed, "ja");
            warnedPossibleCrashes.current[crashToWarn.nodeId] = currentGPS.timestamp;
        }

        console.log("warnPossibleCrashes Done");
        return true;
    }
    function warnSurroundingVehiclesWhenStationary(){
        //console.log("warnStationaryVehicles called");
        for(const vehicleId of Object.keys(surroundingVehicleTimeOfArrivalAndProbabilities.current)){
            const vehicle = surroundingVehicleTimeOfArrivalAndProbabilities.current[vehicleId];
            const vehicleGPS = vehicle.currentGPS;
            if(!vehicleGPS){
                continue;
            }
            const dataAge = (currentGPS.timestamp - vehicleGPS.timestamp)/1000;
            if (dataAge > 3.5){
                continue;
            }
            if(!vehicleGPS.coords){
                continue;
            }
            if(vehicleGPS.coords.speed < 1){
                continue;
            }
            if(!vehicleGPS.coords.heading){
                continue;
            }
            const isVehicleApproaching = distanceToLineWithOriginAndDirection(
                vehicleGPS.coords.latitude,
                vehicleGPS.coords.longitude,
                vehicleGPS.coords.heading,
                currentGPS.coords.latitude,
                currentGPS.coords.longitude
            ) < maxApproachingVehicleWarningDistanceWhenStationary;
            if(!isVehicleApproaching){
                continue;
            }
            const possibleCollosionTime = distance(
                vehicleGPS.coords.latitude,
                vehicleGPS.coords.longitude,
                currentGPS.coords.latitude,
                currentGPS.coords.longitude
            ) / vehicleGPS.coords.speed;
            if(possibleCollosionTime > maxCrashTimeDifference){
                continue;
            }
            warnApproachingVehicleWhenStationary(vehicle, vehicleGPS.coords.heading, voiceSpeed, "ja");
        }
        //console.log("warnStationaryVehicles Done");
        return true;
    }


    return (
        <>
            <button onClick={() => speakTest(voiceSpeed, "ja")}>Allow SpeechSynth</button><br />
            <button onClick={() => downloadJSON(appDebugger.current.data)}>download debug</button><br />
            <div className={"flex flex-col gap-2"}>
                <div>
                    <input type="checkbox" id="show-debug" value={showDebug} onChange={(e) => setShowDebug(e.target.checked)} style={{ width: 20, height: 20 }} />
                    <label htmlFor="show-debug">Show Debug</label>
                </div>
                <div>
                    <input type="checkbox" id="debug-mode" value={debugMode} onChange={(e) => {setDebugMode(e.target.checked); appDebugger.current.recording_enabled = e.target.checked}} style={{ width: 20, height: 20 }} />
                    <label htmlFor="debug-mode">Debug Mode: {debugMode ? "ON!!!!!!" : "OFF"}</label>
                </div>
                <div>
                    <input type="checkbox" id="preventDataUpdate" value={preventDataUpdate} onChange={(e) => setPreventDataUpdate(e.target.checked)} style={{ width: 20, height: 20 }}/>
                    <label htmlFor="preventDataUpdate">Prevent Data Update</label>
                </div>
            </div>
            <div style={{ display: showDebug ? "block" : "none" }}>
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