export async function updatePos(setPos, constLatLon){
    if (!navigator.geolocation) {
        alert('GPS is not supported by your browser');
    }
    navigator.geolocation.watchPosition((position) => {
        if(constLatLon){
            setPos({timestamp: position.timestamp, coords: {...position.coords, latitude: constLatLon.lat, longitude: constLatLon.lon}});
        }
        setPos(position);
    },
    (error) => {
        alert(`This browser either doesn't support geolocation or you have denied location access.\n${error.message}`);
        console.error(error);
    },
    {
        enableHighAccuracy: true,
    });
}