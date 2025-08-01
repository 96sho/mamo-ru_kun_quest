"use client"

import React, { useState, useRef } from 'react'
import { matchRoad } from '@/utils/client/wayUtils';
import { setMapData } from '@/utils/client/dataRetrieverFunctions';


const MatchRoadTest = () => {
    const [latlon, setLatlon] = useState("36.3748212,139.0445853");
    const [heading, setHeading] = useState("40");

    const [result, setResult] = useState(null);

    const mapData = useRef(null);

    const updateMapData = async (lat, lon) => {
        await setMapData(mapData, lat, lon, 100, "car");
        alert("set map data called");
    }

    const updateResult = async (latitude, longitude, heading) => {
        const result = matchRoad(mapData.current, { latitude, longitude }, heading);
        alert(result);
        setResult(result);
    }

    return (
        <>
            <h1>MatchRoadTest</h1>
            <input type="text" placeholder='lat,lon' value={latlon} onChange={(e) => setLatlon(e.target.value)} />
            <input type="number" placeholder='heading' value={heading} onChange={(e) => setHeading(e.target.value)}/>
            <button onClick={() => updateMapData(latlon.split(",")[0], latlon.split(",")[1])} >receive mapData</button>
            <button onClick={ () => updateResult(latlon.split(",")[0], latlon.split(",")[1], heading) }>match</button>
            <p>{result}</p>
        </>
    )
}

export default MatchRoadTest