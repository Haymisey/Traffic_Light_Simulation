
import * as THREE from 'three';
import TrafficLight from './TrafficLight'; 
import { TrafficLightState, TRAFFIC_LIGHT_TIMINGS, LightId, INTERSECTION_SIZE, ROAD_WIDTH, PathDirection } from '../constants';
import type { TrafficLightControllerInterface, Path, EmergencyVehicle } from '../types';

class TrafficLightController implements TrafficLightControllerInterface {
  private scene: THREE.Scene;
  private lights: Map<LightId, TrafficLight[]> = new Map();
  private lightObjects: Map<PathDirection, TrafficLight> = new Map();

  private timer: number = 0;
  private currentCyclePhase: number = 0;
  
  private emergencyOverride: { lightId: LightId, timer: number } | null = null;

  private cycleDurations: number[] = [
    TRAFFIC_LIGHT_TIMINGS.GREEN,
    TRAFFIC_LIGHT_TIMINGS.YELLOW,
    TRAFFIC_LIGHT_TIMINGS.RED_ALL,
    TRAFFIC_LIGHT_TIMINGS.GREEN,
    TRAFFIC_LIGHT_TIMINGS.YELLOW,
    TRAFFIC_LIGHT_TIMINGS.RED_ALL,
  ];

  constructor(scene: THREE.Scene, paths: Path[]) {
    this.scene = scene;
    this.initializeLights(paths);
    this.updateLightVisuals();
  }

  private initializeLights(paths: Path[]): void {
    const lightHeight = 0;
    const intersectionEdge = INTERSECTION_SIZE / 2;
    const lightOffsetFromIntersection = 1;
    const lightCornerOffset = intersectionEdge + lightOffsetFromIntersection;
    const lightSideOffset = ROAD_WIDTH / 2 + 0.5;
    
    const lightPositions: Record<PathDirection, {pos: THREE.Vector3, rot: number}> = {
        [PathDirection.NORTH_TO_SOUTH]: {pos: new THREE.Vector3(lightSideOffset, lightHeight, -lightCornerOffset), rot: Math.PI}, 
        [PathDirection.SOUTH_TO_NORTH]: {pos: new THREE.Vector3(-lightSideOffset, lightHeight, lightCornerOffset), rot: 0},
        [PathDirection.EAST_TO_WEST]:   {pos: new THREE.Vector3(-lightCornerOffset, lightHeight, -lightSideOffset), rot: -Math.PI/2}, 
        [PathDirection.WEST_TO_EAST]:   {pos: new THREE.Vector3(lightCornerOffset, lightHeight, lightSideOffset), rot: Math.PI/2},
    };
    
    const createdLights = new Map<string, TrafficLight>();

    paths.forEach(path => {
        const config = lightPositions[path.id];
        const posKey = `${config.pos.x},${config.pos.z}`;

        let trafficLight: TrafficLight;
        if (createdLights.has(posKey)) {
            trafficLight = createdLights.get(posKey)!;
        } else {
            trafficLight = new TrafficLight(config.pos, config.rot);
            this.scene.add(trafficLight.getGroup());
            createdLights.set(posKey, trafficLight);

            if (!this.lights.has(path.trafficLightId)) {
                this.lights.set(path.trafficLightId, []);
            }
            this.lights.get(path.trafficLightId)!.push(trafficLight);
        }
        this.lightObjects.set(path.id, trafficLight);
    });
  }

  public update(delta: number, emergencyVehicles: EmergencyVehicle[] = []): void {
    this.checkForEmergencyOverride(emergencyVehicles);
    
    if (this.emergencyOverride) {
        this.emergencyOverride.timer -= delta * 1000;
        if(this.emergencyOverride.timer <= 0) {
            this.emergencyOverride = null;
            this.timer = 0;
        }
    } else {
        this.timer += delta * 1000;
        if (this.timer >= this.cycleDurations[this.currentCyclePhase]) {
          this.timer = 0;
          this.currentCyclePhase = (this.currentCyclePhase + 1) % this.cycleDurations.length;
        }
    }
    
    this.updateLightVisuals();
  }
  
  public reset(): void {
    this.timer = 0;
    this.currentCyclePhase = 0;
    this.emergencyOverride = null;
    this.updateLightVisuals();
  }

  private checkForEmergencyOverride(emergencyVehicles: EmergencyVehicle[]): void {
      if (this.emergencyOverride) return;

      for (const vehicle of emergencyVehicles) {
          const wantedLight = vehicle.getWantsGreenLight();
          if (wantedLight !== null && this.getLightState(wantedLight) === TrafficLightState.RED) {
              this.emergencyOverride = {
                  lightId: wantedLight,
                  timer: TRAFFIC_LIGHT_TIMINGS.EMERGENCY_OVERRIDE_DURATION,
              };
              return;
          }
      }
  }

  private updateLightVisuals(): void {
    let nsState: TrafficLightState;
    let ewState: TrafficLightState;

    if (this.emergencyOverride) {
      nsState = this.emergencyOverride.lightId === LightId.NORTH_SOUTH ? TrafficLightState.GREEN : TrafficLightState.RED;
      ewState = this.emergencyOverride.lightId === LightId.EAST_WEST ? TrafficLightState.GREEN : TrafficLightState.RED;
    } else {
        switch (this.currentCyclePhase) {
          case 0: nsState = TrafficLightState.GREEN; ewState = TrafficLightState.RED; break;
          case 1: nsState = TrafficLightState.YELLOW; ewState = TrafficLightState.RED; break;
          case 2: nsState = TrafficLightState.RED; ewState = TrafficLightState.RED; break;
          case 3: nsState = TrafficLightState.RED; ewState = TrafficLightState.GREEN; break;
          case 4: nsState = TrafficLightState.RED; ewState = TrafficLightState.YELLOW; break;
          case 5: nsState = TrafficLightState.RED; ewState = TrafficLightState.RED; break;
          default: nsState = TrafficLightState.RED; ewState = TrafficLightState.RED;
        }
    }
    
    this.lights.get(LightId.NORTH_SOUTH)?.forEach(light => light.setLightState(nsState));
    this.lights.get(LightId.EAST_WEST)?.forEach(light => light.setLightState(ewState));
  }
  
  public getLightState(lightId: LightId): TrafficLightState {
     if (this.emergencyOverride) {
        return this.emergencyOverride.lightId === lightId ? TrafficLightState.GREEN : TrafficLightState.RED;
     }

     switch (this.currentCyclePhase) {
      case 0: return lightId === LightId.NORTH_SOUTH ? TrafficLightState.GREEN : TrafficLightState.RED;
      case 1: return lightId === LightId.NORTH_SOUTH ? TrafficLightState.YELLOW : TrafficLightState.RED;
      case 2: return TrafficLightState.RED;
      case 3: return lightId === LightId.EAST_WEST ? TrafficLightState.GREEN : TrafficLightState.RED;
      case 4: return lightId === LightId.EAST_WEST ? TrafficLightState.YELLOW : TrafficLightState.RED;
      case 5: return TrafficLightState.RED;
      default: return TrafficLightState.RED;
    }
  }

  public getLightObject(direction: PathDirection): THREE.Group | undefined {
      return this.lightObjects.get(direction)?.getGroup();
  }

  public dispose(): void {
    this.lights.forEach(lightArray => lightArray.forEach(light => {
        this.scene.remove(light.getGroup());
    }));
  }
}

export default TrafficLightController;
