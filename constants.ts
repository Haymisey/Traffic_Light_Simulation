export enum TrafficLightState {
  RED,
  YELLOW,
  GREEN,
}

export enum LightId {
  NORTH_SOUTH,
  EAST_WEST,
}

export const TRAFFIC_LIGHT_TIMINGS = {
  GREEN: 10000, // 10 seconds
  YELLOW: 2000, // 2 seconds
  RED_ALL: 1000, // 1 second all red for safety
  EMERGENCY_OVERRIDE_DURATION: 5000, // 5 seconds for green light
};

export const CAR_SPEED = 0.05; // Units per frame
export const CAR_DIMENSIONS = { width: 0.8, height: 0.6, depth: 1.8 };
export const TRUCK_DIMENSIONS = { width: 1, height: 1, depth: 3.5 };
export const INTERSECTION_SIZE = 10;
export const ROAD_WIDTH = 3.5;
export const ROAD_LENGTH = 30; // Length of road segments from intersection center

export const CAR_STOP_DISTANCE_LIGHT = 3; // Distance from stop line to start braking
export const CAR_STOP_DISTANCE_CAR = CAR_DIMENSIONS.depth * 1.5; // Min distance between cars
export const SPAWN_CHECK_RADIUS_CAR = TRUCK_DIMENSIONS.depth * 1.5; // Prevent spawning on top of other cars


export enum PathDirection {
    NORTH_TO_SOUTH,
    SOUTH_TO_NORTH,
    EAST_TO_WEST,
    WEST_TO_EAST,
}


// Emergency Vehicle Constants
export const AMBULANCE_SPEED = 0.08;
export const AMBULANCE_DIMENSIONS = { width: 1.0, height: 1.2, depth: 2.5 };
export const AMBULANCE_DETECTION_RADIUS = 15; // How far behind a car can detect an ambulance
export const PULL_OVER_DISTANCE = 1.5; // How far to the side cars should move
export const AMBULANCE_PASS_DISTANCE = 5; // How far ahead ambulance must be before merging back

export enum CarAIState {
  MOVING,
  STOPPING_FOR_LIGHT,
  STOPPED_AT_LIGHT,
  STOPPING_FOR_CAR,
  STOPPED_FOR_CAR,
  // States for evading emergency vehicles
  PULLING_OVER,
  WAITING_FOR_EMERGENCY_VEHICLE,
  MERGING_BACK,
}