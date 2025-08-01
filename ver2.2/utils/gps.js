const deg2Rad = Math.PI / 180;
const rad2Deg = 180 / Math.PI;

export function distance(lat1, lon1, lat2, lon2) { //returns distance in meters
    const R = 6371e3;

    const φ1 = lat1 * deg2Rad;
    const φ2 = lat2 * deg2Rad;
    const Δφ = (lat2 - lat1) * deg2Rad;
    const Δλ = (lon2 - lon1) * deg2Rad;

    const sinΔφ2 = Math.sin(Δφ / 2);
    const sinΔλ2 = Math.sin(Δλ / 2);

    const a =
        sinΔφ2 * sinΔφ2 +
        Math.cos(φ1) * Math.cos(φ2) * sinΔλ2 * sinΔλ2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export function direction(startLat, startLng, targetLat, targetLng) {

    const startLatRad = deg2Rad * startLat;
    const startLngRad = deg2Rad * startLng;
    const targetLatRad = deg2Rad * targetLat;
    const targetLngRad = deg2Rad * targetLng;

    const dLng = targetLngRad - startLngRad;

    const y = Math.sin(dLng) * Math.cos(targetLatRad);
    const x = Math.cos(startLatRad) * Math.sin(targetLatRad) -
              Math.sin(startLatRad) * Math.cos(targetLatRad) * Math.cos(dLng);

    let bearing = Math.atan2(y, x);

    bearing = rad2Deg * bearing;

    return (bearing + 360) % 360;
}

export function angleDiff(angle1, angle2) {
    let diff = Math.abs(angle1 - angle2) % 360;
    return diff > 180 ? 360 - diff : diff;
}

export function angleDiffAcute(angle1, angle2) {
    let diff = Math.abs(angle1%180 - angle2%180);
    return diff > 90 ? 180 - diff : diff;
}

/* export function distanceToLineSegment(lat1, lon1, lat2, lon2, targetLat, targetLon) {
    if(isPerpendicularIntersect(lat1, lon1, lat2, lon2, targetLat, targetLon)) {
        const degD = Math.abs((lat1 - lat2) * targetLon + (lon2 - lon1) * targetLat + lat1 * (lon1 - lon2) + lon1 * (lat2 - lat1)) / Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
        const radD = degD * Math.PI / 180;
        return radD * 6371e3;
    }else{
        return Math.min(distance(lat1, lon1, targetLat, targetLon), distance(lat2, lon2, targetLat, targetLon));
    }
} */
export function distanceToLineSegment(lat1, lon1, lat2, lon2, targetLat, targetLon) {
    const R = 6371e3;

    if (isPerpendicularIntersect(lat1, lon1, lat2, lon2, targetLat, targetLon)) {
        return distanceToLine(lat1, lon1, lat2, lon2, targetLat, targetLon);
    } else {
        const distanceToStart = distance(lat1, lon1, targetLat, targetLon);
        const distanceToEnd = distance(lat2, lon2, targetLat, targetLon);
        return Math.min(distanceToStart, distanceToEnd);
    }
}
function latLonToVector(lat_deg, lon_deg) {
    const lat_rad = lat_deg * Math.PI / 180;
    const lon_rad = lon_deg * Math.PI / 180;
    const x = Math.cos(lat_rad) * Math.cos(lon_rad);
    const y = Math.cos(lat_rad) * Math.sin(lon_rad);
    const z = Math.sin(lat_rad);
    return [x, y, z];
}

function crossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dotProduct(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function vectorMagnitude(v) {
    return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
}

function normalizeVector(v) {
    const mag = vectorMagnitude(v);
    return [v[0]/mag, v[1]/mag, v[2]/mag];
}

function distanceToLine(A_lat, A_lon, B_lat, B_lon, P_lat, P_lon) {
    const R = 6371e3;

    const A = latLonToVector(A_lat, A_lon);
    const B = latLonToVector(B_lat, B_lon);
    const P = latLonToVector(P_lat, P_lon);

    const n = crossProduct(A, B);

    const n_mag = vectorMagnitude(n);
    if (n_mag === 0) {    
        return NaN;
    }

    const n_hat = normalizeVector(n);

    const dot = dotProduct(P, n_hat);
    const delta = Math.asin(Math.abs(dot));

    const distance = delta * R;

    return distance;
}


/* function isPerpendicularIntersect(lat1, lon1, lat2, lon2, targetLat, targetLon) {
    const AB = { x: lon2 - lon1, y: lat2 - lat1 };
    const AP = { x: targetLon - lon1, y: targetLat - lat1 };

    const dotProduct = AB.x * AP.x + AB.y * AP.y;

    const ABLengthSquared = AB.x * AB.x + AB.y * AB.y;

    const t = dotProduct / ABLengthSquared;

    return t >= 0 && t <= 1;
} */
function isPerpendicularIntersect(lat1, lon1, lat2, lon2, targetLat, targetLon) {
    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    
    const t = ((targetLon - lon1) * dx + (targetLat - lat1) * dy) / (dx * dx + dy * dy);

    return t >= 0 && t <= 1;
}
//export function distanceToLineWithOriginAndDirection(originLat, originLon, direction, targetLat, targetLon){
//    //return distanceToLine(originLat, originLon, originLat + Math.cos(direction), originLon + Math.sin(direction), targetLat, targetLon);
//    return 0; //todo implement this function
//}

export function distanceToLineWithOriginAndDirection(originLat, originLon, direction, targetLat, targetLon) {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const toDegrees = (radians) => radians * (180 / Math.PI);

    // Earth radius in meters
    const earthRadiusKm = 6371 * 1000;

    // Convert all angles to radians
    const originLatRad = toRadians(originLat);
    const originLonRad = toRadians(originLon);
    const directionRad = toRadians(direction);
    const targetLatRad = toRadians(targetLat);
    const targetLonRad = toRadians(targetLon);

    // Calculate direction vector for the line
    const lineDx = Math.sin(directionRad);
    const lineDy = Math.cos(directionRad);

    // Convert target point to a vector relative to the origin
    const dLat = targetLatRad - originLatRad;
    const dLon = targetLonRad - originLonRad;

    // Calculate Cartesian coordinates of the target point relative to the origin
    const targetX = dLon * Math.cos((originLatRad + targetLatRad) / 2);
    const targetY = dLat;

    // Normalize the target coordinates
    const targetMagnitude = Math.sqrt(targetX ** 2 + targetY ** 2);
    const targetUnitX = targetX / targetMagnitude;
    const targetUnitY = targetY / targetMagnitude;

    // Calculate the perpendicular distance from the target to the line
    const distance = Math.abs(targetUnitX * lineDy - targetUnitY * lineDx) * earthRadiusKm;

    return distance;
}

export function headingToCompass4(heading){
    const compass = ["N", "E", "S", "W"];
    const step = 360/4;
    const index = Math.floor((heading % 360 - step/2) / step) % 4 + 1
    return compass[index];
}

export function headingToCompass8(heading){
    const compass = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const step = 360/8;
    const index = Math.floor((heading % 360 - step/2) / step) % 8 + 1
    return compass[index];
}

export function gpsToJson(GPS){
    return {
        coords: {
            latitude: GPS.coords.latitude,
            longitude: GPS.coords.longitude,
            altitude: GPS.coords.altitude,
            accuracy: GPS.coords.accuracy,
            altitudeAccuracy: GPS.coords.altitudeAccuracy,
            heading: GPS.coords.heading,
            speed: GPS.coords.speed,
        },
        timestamp: GPS.timestamp,
    }
}