import React from 'react';
import { Box, Heading, Stack, Text } from '@chakra-ui/react';

const Status = ({ sessionId, mapDataStatus, mapData, currentGPS, currentRoad, currentWay, currentCruisingSide, currentHeadingNode, surroundingVehicleTimeOfArrivalAndProbabilities, probableCrashInfo }) => {
  return (
    <Box m={2}>
        <Heading>Status</Heading>
        <Stack direction="column" spacing={4}>
            <Box>
                <Stack direction='column' spacing={2}>
                    <Box>
                        <Heading size='md'>sessionId</Heading>
                        <Text fontSize="lg">{sessionId}</Text>
                    </Box>
                    <Box>
                        <Heading size='md'>mapData</Heading>
                        <Text fontSize="lg">{mapDataStatus}</Text>
                    </Box>
                </Stack>
            </Box>
            <Box>
                <Heading>GPS</Heading>
                <Stack direction="column" spacing={2}>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Timestamp</Heading>
                            <Text fontSize="lg">{currentGPS ? currentGPS?.timestamp : "retrieving..."}</Text>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Latitude</Heading>
                            <Text fontSize="lg">{currentGPS ? currentGPS?.coords.latitude : "retrieving..."}</Text>
                        </Box>
                        <Box>
                            <Heading size='md'>Longitude</Heading>
                            <Text fontSize="lg">{currentGPS ? currentGPS?.coords.longitude : "retrieving..."}</Text>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Heading</Heading>
                            <Text fontSize="lg">{currentGPS ? Math.round(currentGPS?.coords.heading) : "retrieving..."} deg</Text>
                        </Box>
                        <Box>
                            <Heading size='md'>Speed</Heading>
                            <Text fontSize="lg">{currentGPS ? (currentGPS?.coords.speed * 3.6).toFixed(2) : "retrieving..."} km/h</Text>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Accuracy</Heading>
                            <Text fontSize="lg">{currentGPS ? (currentGPS?.coords.accuracy).toFixed(2) : "retrieving..."} m</Text>
                        </Box>
                    </Stack>
                </Stack>
            </Box>
            <Box>
                <Heading>Road</Heading>
                <Stack direction="column" spacing={2}>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Road Info</Heading>
                            <Text fontSize="lg">{currentRoad && mapData ? mapData.roads[currentRoad].tags.highway : "n/a"}</Text>
                            <Text>{currentRoad && mapData ? (mapData.roads[currentRoad].tags.maxSpeed ? mapData.roads[currentRoad].tags.maxSpeed : "n/a") : "n/a"} km/h</Text>
                        </Box>
                        <Box>
                            <Heading size='md'>RoadId</Heading>
                            <Text fontSize="lg">{currentRoad ? currentRoad : "n/a"}</Text>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Way</Heading>
                            <Text>{currentRoad && mapData ? (mapData.roads[currentRoad].tags.name ? mapData.roads[currentRoad].tags.name : "n/a") : "n/a"}</Text>
                            <Text fontSize="lg">{currentWay ? currentWay : "n/a"}</Text>
                        </Box>
                        <Box>
                            <Heading size='md'>Cruising Side</Heading>
                            <Text>{currentCruisingSide ? currentCruisingSide : "n/a"}</Text>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>HeadingNode</Heading>
                            <Text fontSize="lg">{currentHeadingNode ? currentHeadingNode : "n/a"}</Text>
                        </Box>
                    </Stack>
                </Stack>
            </Box>
            <Box>
                <Heading>Miscellaneous</Heading>
                <Stack direction="column" spacing={2}>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Surrounding Vehicles</Heading>
                            <Text fontSize="lg">{surroundingVehicleTimeOfArrivalAndProbabilities ? Object.keys(surroundingVehicleTimeOfArrivalAndProbabilities).length : "none"}</Text>
                        </Box>
                    </Stack>
                    <Stack direction='row' spacing={4}>
                        <Box>
                            <Heading size='md'>Crash Info</Heading>
                            <Text fontSize="lg">{probableCrashInfo ? Object.keys(probableCrashInfo).length : "none"}</Text>
                        </Box>
                    </Stack>
                </Stack>
            </Box>
        </Stack>
    </Box>
  )
}

export default Status;