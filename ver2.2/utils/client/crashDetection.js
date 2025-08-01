function detectCrashAgainstPedestrian(mapData, selfTimeOfArrivalAndProbability, pedTimeOfArrivalAndProbability, maxCrashTimeDifference){
    const selfNextNodes = Object.keys(selfTimeOfArrivalAndProbability);
    const pedNextNodes = Object.keys(pedTimeOfArrivalAndProbability);
    const commonNodes = selfNextNodes.filter(node => pedNextNodes.includes(node));

    for(const commonNode of commonNodes){
        if(Math.abs(selfTimeOfArrivalAndProbability[commonNode].timeOfArrival - pedTimeOfArrivalAndProbability[commonNode].timeOfArrival) > maxCrashTimeDifference){
            continue;
        }
    }
}