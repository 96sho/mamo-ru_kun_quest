"use client";
import App from "@/components/App";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const theme = {
  config: {
    initColorMode: "dark",
    useSystemColorMode: false,
  }
}

export default function Home() {
  return (
    <ChakraProvider theme={extendTheme(theme)}>
      <App
        mapDataRetrievalRadius={300}
        vehicleDataRetrievalRadius={140}
        maxCrashTimeDifference={1000}
        maxApproachingVehicleWarningDistanceWhenStationary={5}
        alertCrashProbability={0.9}
        vehicleType={"car"}
        voiceSpeed={1.5}
        minSpeed={10}
      />
    </ChakraProvider>
  );
}