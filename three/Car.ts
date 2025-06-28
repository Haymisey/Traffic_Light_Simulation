
import * as THREE from 'three';
import { CAR_SPEED, CAR_DIMENSIONS, TRUCK_DIMENSIONS, TrafficLightState, CAR_STOP_DISTANCE_LIGHT, CAR_STOP_DISTANCE_CAR, PathDirection, CarAIState, AMBULANCE_DETECTION_RADIUS, PULL_OVER_DISTANCE, AMBULANCE_PASS_DISTANCE } from '../constants';
import type { CarProps, TrafficLightControllerInterface, Path, EmergencyVehicle, SelectedVehicleInfo } from '../types';

class Car {
  public id: string;
  private scene: THREE.Scene;
  public group: THREE.Group;
  public currentPath: Path;
  private paths: Path[];
  private trafficLightController: TrafficLightControllerInterface;
  
  private speed: number = CAR_SPEED;
  private aiState: CarAIState = CarAIState.MOVING;
  private dimensions: { width: number, height: number, depth: number };
  private isTruck: boolean;

  // Evasion properties
  private isEvading = false;
  private evasionTarget: THREE.Vector3 | null = null;
  private originalLanePosition: THREE.Vector3 | null = null;
  private blinker: THREE.Mesh | null = null;
  private blinkerTimer = 0;
  private detectedAmbulance: EmergencyVehicle | null = null;

  constructor(props: CarProps, paths: Path[], trafficLightController: TrafficLightControllerInterface) {
    this.id = props.id;
    this.scene = props.scene;
    this.paths = paths;
    this.trafficLightController = trafficLightController;
    this.isTruck = props.isTruck || false;
    this.dimensions = this.isTruck ? TRUCK_DIMENSIONS : CAR_DIMENSIONS;

    const foundPath = this.paths.find(p => p.id === props.pathDirection);
    if (!foundPath) {
        throw new Error(`Path ${props.pathDirection} not found for car ${this.id}`);
    }
    this.currentPath = foundPath;

    this.group = new THREE.Group();
    // Attach userData to the group for easy raycasting identification
    this.group.userData = { vehicleId: this.id, vehicleType: 'car' };
    this.group.position.copy(this.currentPath.start);
    this.createCarMesh(props.color || 0xff0000);
    
    const directionVector = new THREE.Vector3().subVectors(this.currentPath.end, this.currentPath.start).normalize();
    this.group.lookAt(this.group.position.clone().add(directionVector));
    
    this.scene.add(this.group);
  }

  private createCarMesh(color: number): void {
    const carBodyGeo = new THREE.BoxGeometry(this.dimensions.width, this.dimensions.height, this.dimensions.depth);
    const carBodyMat = new THREE.MeshStandardMaterial({ color });
    const carBody = new THREE.Mesh(carBodyGeo, carBodyMat);
    carBody.castShadow = true;
    carBody.receiveShadow = true;
    carBody.position.y = this.dimensions.height / 2;
    
    const cabinHeight = this.dimensions.height * 0.7;
    const cabinDepth = this.dimensions.depth * 0.4;
    const cabinGeo = new THREE.BoxGeometry(this.dimensions.width * 0.8, cabinHeight, cabinDepth);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = this.dimensions.height + cabinHeight / 2 - this.dimensions.height *0.2;
    cabin.position.z = -this.dimensions.depth * 0.1;
    cabin.castShadow = true;
    
    this.group.add(carBody);
    this.group.add(cabin);

    const blinkerGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const blinkerMat = new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0xffa500, emissiveIntensity: 1, transparent: true, opacity: 0.8 });
    this.blinker = new THREE.Mesh(blinkerGeo, blinkerMat);
    // Position blinker on the right side of the car, as requested.
    this.blinker.position.set(this.dimensions.width / 2 + 0.05, this.dimensions.height / 2, -this.dimensions.depth/2);
    this.blinker.visible = false;
    this.group.add(this.blinker);
  }

  public update(delta: number, otherCars: Car[], emergencyVehicles: EmergencyVehicle[]): void {
    const wasEvading = this.isEvading;
    this.updateAIState(otherCars, emergencyVehicles);
    
    let currentSpeed = this.speed;

    if (this.isEvading) {
        if(this.aiState === CarAIState.WAITING_FOR_EMERGENCY_VEHICLE) {
            currentSpeed = 0;
        } else if (this.aiState === CarAIState.PULLING_OVER && this.evasionTarget) {
            const pullOverTarget = this.group.position.clone();
            if (this.currentPath.axis === 'z') pullOverTarget.x = this.evasionTarget.x;
            else pullOverTarget.z = this.evasionTarget.z;
            this.group.position.lerp(pullOverTarget, 0.05);
            currentSpeed = this.speed * 0.5;
        } else if (this.aiState === CarAIState.MERGING_BACK && this.originalLanePosition) {
            const mergeTarget = this.group.position.clone();
            if (this.currentPath.axis === 'z') mergeTarget.x = this.originalLanePosition.x;
            else mergeTarget.z = this.originalLanePosition.z;
            this.group.position.lerp(mergeTarget, 0.04);

            currentSpeed = this.speed * 0.5;
            this.blinkerTimer += delta;
            if (this.blinker && this.blinkerTimer > 0.4) {
              this.blinker.visible = !this.blinker.visible;
              this.blinkerTimer = 0;
            }
        }
    } else {
        if (wasEvading && this.blinker) {
            this.blinker.visible = false;
        }
        if (this.aiState !== CarAIState.MOVING) {
          currentSpeed = 0;
        }
    }
    
    const pathDir = new THREE.Vector3().subVectors(this.currentPath.end, this.currentPath.start).normalize();
    this.group.position.addScaledVector(pathDir, currentSpeed * 60 * delta); // Apply delta
  }

  private updateAIState(otherCars: Car[], emergencyVehicles: EmergencyVehicle[]): void {
    if (!this.isEvading) {
        this.detectedAmbulance = this.findApproachingAmbulance(emergencyVehicles);
        if (this.detectedAmbulance) {
            this.isEvading = true;
            this.aiState = CarAIState.PULLING_OVER;
            this.originalLanePosition = this.group.position.clone();

            // Simplified and corrected pull-over logic
            let pullOverDirection: THREE.Vector3;
            switch (this.currentPath.id) {
                case PathDirection.NORTH_TO_SOUTH: pullOverDirection = new THREE.Vector3(1, 0, 0); break;
                case PathDirection.SOUTH_TO_NORTH: pullOverDirection = new THREE.Vector3(-1, 0, 0); break;
                case PathDirection.EAST_TO_WEST:   pullOverDirection = new THREE.Vector3(0, 0, -1); break;
                case PathDirection.WEST_TO_EAST:   pullOverDirection = new THREE.Vector3(0, 0, 1); break;
                default: pullOverDirection = new THREE.Vector3();
            }

            this.evasionTarget = this.group.position.clone().addScaledVector(pullOverDirection, PULL_OVER_DISTANCE);
        }
    }

    if (this.isEvading) {
        switch (this.aiState) {
            case CarAIState.PULLING_OVER:
                if (this.evasionTarget) {
                    const targetLateralPos = this.currentPath.axis === 'z' ? this.evasionTarget.x : this.evasionTarget.z;
                    const currentLateralPos = this.currentPath.axis === 'z' ? this.group.position.x : this.group.position.z;
                    if (Math.abs(targetLateralPos - currentLateralPos) < 0.2) {
                        this.aiState = CarAIState.WAITING_FOR_EMERGENCY_VEHICLE;
                    }
                }
                break;
            case CarAIState.WAITING_FOR_EMERGENCY_VEHICLE:
                if (!this.detectedAmbulance || this.detectedAmbulance.isAheadOf(this.group.position)) {
                    this.aiState = CarAIState.MERGING_BACK;
                    if(this.blinker) this.blinker.visible = true;
                    this.blinkerTimer = 0;
                }
                break;
            case CarAIState.MERGING_BACK:
                 if (this.originalLanePosition) {
                    const originalLateralPos = this.currentPath.axis === 'z' ? this.originalLanePosition.x : this.originalLanePosition.z;
                    const currentLateralPos = this.currentPath.axis === 'z' ? this.group.position.x : this.group.position.z;
                   
                    if (Math.abs(originalLateralPos - currentLateralPos) < 0.1) {
                        if (this.currentPath.axis === 'z') { this.group.position.x = this.originalLanePosition.x; } 
                        else { this.group.position.z = this.originalLanePosition.z; }

                        this.isEvading = false;
                        this.detectedAmbulance = null;
                        this.originalLanePosition = null;
                        this.evasionTarget = null;
                        this.aiState = CarAIState.MOVING; 
                        if (this.blinker) this.blinker.visible = false;
                    }
                }
                break;
        }
        if(this.isEvading) return;
    }
    
    for (const otherCar of otherCars) {
        if (otherCar.id === this.id || otherCar.currentPath.id !== this.currentPath.id) continue;
        if (otherCar.isAheadOf(this.group.position, this.dimensions.depth)) {
            this.aiState = CarAIState.STOPPED_FOR_CAR;
            return;
        }
    }
    
    const lightState = this.trafficLightController.getLightState(this.currentPath.trafficLightId);
    const distToStopLine = Math.abs((this.currentPath.axis === 'z' ? this.group.position.z : this.group.position.x) - this.currentPath.stopLine);
    
    if ((lightState === TrafficLightState.RED || lightState === TrafficLightState.YELLOW) && 
        distToStopLine < CAR_STOP_DISTANCE_LIGHT && 
        this.isApproachingStopLine()) {
        
        this.aiState = distToStopLine < 1 ? CarAIState.STOPPED_AT_LIGHT : CarAIState.STOPPING_FOR_LIGHT;
        return;
    }

    this.aiState = CarAIState.MOVING;
  }

  private findApproachingAmbulance(emergencyVehicles: EmergencyVehicle[]): EmergencyVehicle | null {
    for (const ev of emergencyVehicles) {
        if (!ev.isEmergencyActive || ev.currentPath.id !== this.currentPath.id) continue;
        
        const distance = this.group.position.distanceTo(ev.getPosition());
        if(distance > AMBULANCE_DETECTION_RADIUS) continue;

        let isBehind = false;
        if (this.currentPath.axis === 'z') {
            isBehind = (this.currentPath.start.z > this.currentPath.end.z) ? ev.getPosition().z > this.group.position.z : ev.getPosition().z < this.group.position.z;
        } else {
            isBehind = (this.currentPath.start.x > this.currentPath.end.x) ? ev.getPosition().x > this.group.position.x : ev.getPosition().x < this.group.position.x;
        }

        if(isBehind) return ev;
    }
    return null;
  }
  
  public isAheadOf(carPosition: THREE.Vector3, carDepth: number): boolean {
    const centerToCenterDist = this.group.position.distanceTo(carPosition);
    const requiredGap = CAR_STOP_DISTANCE_CAR + this.dimensions.depth / 2 + carDepth / 2;

    if (centerToCenterDist > requiredGap) return false;

    if (this.currentPath.axis === 'z') {
        return (this.currentPath.start.z > this.currentPath.end.z) ? this.group.position.z < carPosition.z : this.group.position.z > carPosition.z;
    } else {
        return (this.currentPath.start.x > this.currentPath.end.x) ? this.group.position.x < carPosition.x : this.group.position.x > carPosition.x;
    }
  }

  private isApproachingStopLine(): boolean {
    if (this.currentPath.axis === 'z') {
        return (this.currentPath.start.z > this.currentPath.end.z) ? this.group.position.z > this.currentPath.stopLine : this.group.position.z < this.currentPath.stopLine;
    } else {
        return (this.currentPath.start.x > this.currentPath.end.x) ? this.group.position.x > this.currentPath.stopLine : this.group.position.x < this.currentPath.stopLine;
    }
  }

  public isOffScreen(boundary: number): boolean {
    const pos = this.group.position;
    return Math.abs(pos.x) > boundary || Math.abs(pos.z) > boundary;
  }

  public removeFromScene(): void {
    this.scene.remove(this.group);
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }
  
  public getPublicState(): SelectedVehicleInfo {
      let currentSpeed = this.speed;
      if (this.aiState !== CarAIState.MOVING && this.aiState !== CarAIState.PULLING_OVER && this.aiState !== CarAIState.MERGING_BACK) {
        currentSpeed = 0;
      } else if (this.aiState === CarAIState.PULLING_OVER || this.aiState === CarAIState.MERGING_BACK) {
        currentSpeed = this.speed * 0.5;
      }

      return {
          id: this.id,
          type: 'car',
          speed: currentSpeed,
          aiState: CarAIState[this.aiState],
      }
  }
}

export default Car;
