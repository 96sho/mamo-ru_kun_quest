import { headingToCompass4, headingToCompass8 } from "../gps";

const vehicleTranslationTable = {
    "car": {
        "en": "car",
        "ja": "車"
    },
    "bicycle": {
        "en": "bicycle",
        "ja": "自転車"
    },
    "pedestrian": {
        "en": "pedestrian",
        "ja": "歩行者"
    }
}

const sideTranslationTable = {
    "left": {
        "en": "left",
        "ja": "左"
    },
    "right": {
        "en": "right",
        "ja": "右"
    }
}

const directionTranslationTable = {
    "N": {
        "en": "north",
        "ja": "北"
    },
    "NE": {
        "en": "northeast",
        "ja": "北東"
    },
    "E": {
        "en": "east",
        "ja": "東"
    },
    "SE": {
        "en": "southeast",
        "ja": "南東"
    },
    "S": {
        "en": "south",
        "ja": "南"
    },
    "SW": {
        "en": "southwest",
        "ja": "南西"
    },
    "W": {
        "en": "west",
        "ja": "西"
    },
    "NW": {
        "en": "northwest",
        "ja": "北西"
    }
}

export function generateVoice(text, voiceSpeed=2, lang="ja"){
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    //utterance.voice = voices[0];
    utterance.rate = voiceSpeed;
    return utterance
}

export function speakVoice(utterance){
    window.speechSynthesis.speak(utterance);
}

export function speak(text, voiceSpeed, lang){
    const utterance = generateVoice(text, voiceSpeed, lang);
    speakVoice(utterance);
}

export function getApproachingVehicleWarningUtterance(distance, vehicle, side, voiceSpeed, lang){
    const vehicleName = vehicleTranslationTable[vehicle][lang];
    const sideName = sideTranslationTable[side][lang];

    if(distance > 20){
        distance = Math.round(distance / 10) * 10
    } else if(distance > 10){
        distance = Math.round(distance / 5) * 5
    } else {
        distance = Math.round(distance)
    }


    let speechText = "";

    switch(lang){
        case "en":
            speechText = `In ${distance} meters, ${vehicleName} from the ${sideName}`;
            break;
        case "ja":
            speechText = `${distance}メートル先、${sideName}から${vehicleName}`;
            break;
        default:
            speechText = `In ${distance} meters, ${vehicleName} from the ${sideName}`;
            break;
    }

    return generateVoice(speechText, voiceSpeed, lang);
}

export function getApproachingVehicleWarningUtteranceWhenStationary(vehicle, vehicleDirection, voiceSpeed, lang){
    const vehicleName = vehicleTranslationTable[vehicle][lang];
    const directionType = headingToCompass8(vehicleDirection + 180);
    const directionName = directionTranslationTable[directionType][lang];

    let speechText = "";

    switch(lang){
        case "en":
            speechText = `Approaching ${vehicleName} from the ${directionName}`;
            break;
        case "ja":
            speechText = `${directionName}から${vehicleName}が近づいています`;
            break;
        default:
            speechText = `Approaching ${vehicleName} from the ${directionName}`;
            break;
    }

    return generateVoice(speechText, voiceSpeed, lang);
}

export function warnApproachingVehicle(distance, vehicle, side, voiceSpeed, lang){
    const utterance = getApproachingVehicleWarningUtterance(distance, vehicle, side, voiceSpeed, lang);
    console.log("warnApproachingVehicle", utterance);
    speakVoice(utterance);
}
export function warnApproachingVehicleWhenStationary(vehicle, incomingDirection, voiceSpeed, lang){
    const utterance = getApproachingVehicleWarningUtteranceWhenStationary(vehicle, incomingDirection, voiceSpeed, lang);
    console.log("warnApproachingVehicleWhenStationary", utterance);
    speakVoice(utterance);
}

export function speakTest(voiceSpeed, lang){
    switch(lang){
        case "en":
            speak("In 20 meters, car from the left", voiceSpeed, "en");
            break;
        case "ja":
            speak("20メートル先、左から車", voiceSpeed, "ja");
            break;
        default:
            speak("In 20 meters, car from the left", voiceSpeed, "en");
            break;
    }
}

export function speakDisabledByGPS(voiceSpeed, lang){
    switch(lang){
        case "en":
            speak("App disabled due to low GPS accuracy", voiceSpeed, "en");
            break;
        case "ja":
            speak("GPSの精度が悪く、マモールくんは停止しています", voiceSpeed, "ja");
            break;
        default:
            speak("App disabled due to low accuracy", voiceSpeed, "en");
            break;
    }
}

export function speakEnabledByGPS(voiceSpeed, lang){
    switch(lang){
        case "en":
            speak("App got enabled because GPS accuracy improved", voiceSpeed, "en");
            break;
        case "ja":
            speak("GPSの精度が治り、マモールくんは稼働しています", voiceSpeed, "ja");
            break;
        default:
            speak("App got enabled because GPS accuracy improved", voiceSpeed, "en");
            break;
    }
}