"use client"

import React, { useState } from "react";
import { warnApproachingVehicle, warnApproachingVehicleWhenStationary } from "@/utils/client/handleSpeechSynth";

const SpeechSynthTest = () => {
    const [distance, setDistance] = useState(0);
    const [vehicle, setVehicle] = useState("car");
    const [side, setSide] = useState("left");
    const [vehicleDirection, setVehicleDirection] = useState(0);
    const [voiceSpeed, setVoiceSpeed] = useState(1.3);
    const [lang, setLang] = useState("en-US");

    
    return (
        <>
            <input id="distance" type="number" value={distance} onChange={(e) => setDistance(e.target.value)} />
            <input id="vehicle" type="text" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            <input id="side" type="text" value={side} onChange={(e) => setSide(e.target.value)} />
            <input id="vehicleDirection" type="text" value={vehicleDirection} onChange={(e) => setVehicleDirection(e.target.value)} />
            <input id="voiceSpeed" type="number" value={voiceSpeed} onChange={(e) => setVoiceSpeed(e.target.value)} />
            <input id="lang" type="text" value={lang} onChange={(e) => setLang(e.target.value)} />
            <button onClick={() => warnApproachingVehicle(distance, vehicle, side, voiceSpeed, lang)}>Speak</button>
            <button onClick={() => warnApproachingVehicleWhenStationary(vehicle, vehicleDirection, voiceSpeed, lang)}>WhenStationary</button>
        </>
    );
};

export default SpeechSynthTest;
