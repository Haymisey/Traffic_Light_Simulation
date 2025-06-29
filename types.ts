
import * as THREE from 'three';
import { TrafficLightState, PathDirection, LightId, CarAIState } from './constants';

export interface CarProps {
  id: string;
  pathDirection: PathDirection;
  scene: THREE.Scene;
  color?: number;
  isTruck?: boolean;
}

export interface AmbulanceProps {
  id:string;
  pathDirection: PathDirection;
  scene: THREE.Scene;
}

export interface TrafficLightControllerInterface {
  update(delta: number, emergencyVehicles: EmergencyVehicle[]): void;
  getLightState(lightId: LightId): TrafficLightState;
  getLightObject(direction: PathDirection): THREE.Group | undefined;
  dispose(): void;
  reset(): void;
}

export interface TrafficSignal {
  lightPole: THREE.Mesh;
  lightHousing: THREE.Mesh;
  redLight: THREE.Mesh;
  greenLight: THREE.Mesh;
  yellowLight: THREE.Mesh;
  setLightState(state: TrafficLightState): void;
  getGroup(): THREE.Group;
}

export interface Path {
    id: PathDirection;
    start: THREE.Vector3;
    end: THREE.Vector3;
    stopLine: number; // z or x coordinate of stop line relative to intersection center
    trafficLightId: LightId;
    axis: 'x' | 'z'; // Primary axis of movement
}


// For Grounding Chunks if using Gemini Search (not used in this project)
export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web: GroundingChunkWeb;
}

// Interface for modular emergency vehicles
export interface EmergencyVehicle {
    id: string;
    group: THREE.Group;
    currentPath: Path;
    isEmergencyActive: boolean;
    getWantsGreenLight(): LightId | null;
    getPosition(): THREE.Vector3;
    isAheadOf(position: THREE.Vector3): boolean;
    getPublicState(): SelectedVehicleInfo;
    toggleSiren(): void;
}

export interface SelectedVehicleInfo {
  id: string;
  type: 'car' | 'ambulance';
  speed: number;
  aiState: string; // The string representation of CarAIState
  isEmergencyActive?: boolean;
}
