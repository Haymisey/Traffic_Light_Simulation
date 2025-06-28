
import * as THREE from 'three';
import { AMBULANCE_SPEED, AMBULANCE_DIMENSIONS, TrafficLightState, AMBULANCE_PASS_DISTANCE, CAR_STOP_DISTANCE_LIGHT, CarAIState } from '../constants';
import type { AmbulanceProps, TrafficLightControllerInterface, Path, EmergencyVehicle, SelectedVehicleInfo } from '../types';
import Car from './Car';

class Ambulance implements EmergencyVehicle {
  public id: string;
  public group: THREE.Group;
  public currentPath: Path;
  public isEmergencyActive: boolean = true;

  private scene: THREE.Scene;
  private paths: Path[];
  private trafficLightController: TrafficLightControllerInterface;
  private speed = AMBULANCE_SPEED;
  
  private light1!: THREE.PointLight;
  private light2!: THREE.PointLight;
  private lightTimer = 0;
  
  private wantsGreenLight: boolean = false;
  
  constructor(props: AmbulanceProps, paths: Path[], trafficLightController: TrafficLightControllerInterface) {
    this.id = props.id;
    this.scene = props.scene;
    this.paths = paths;
    this.trafficLightController = trafficLightController;

    const foundPath = this.paths.find(p => p.id === props.pathDirection);
    if (!foundPath) {
        throw new Error(`Path ${props.pathDirection} not found for ambulance ${this.id}`);
    }
    this.currentPath = foundPath;

    this.group = new THREE.Group();
    this.group.userData = { vehicleId: this.id, vehicleType: 'ambulance' };
    this.group.position.copy(this.currentPath.start);
    this.createAmbulanceMesh();
    
    const directionVector = new THREE.Vector3().subVectors(this.currentPath.end, this.currentPath.start).normalize();
    this.group.lookAt(this.group.position.clone().add(directionVector));
    
    this.scene.add(this.group);
  }

  private createAmbulanceMesh(): void {
    const { width, height, depth } = AMBULANCE_DIMENSIONS;

    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = height / 2;
    this.group.add(body);

    const stripeGeo = new THREE.BoxGeometry(width * 1.01, height * 0.2, depth * 1.01);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.y = height * 0.5;
    body.add(stripe);

    const lightBarGeo = new THREE.BoxGeometry(width * 0.6, 0.1, 0.2);
    const lightBarMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
    lightBar.position.y = height + 0.05;
    this.group.add(lightBar);

    this.light1 = new THREE.PointLight(0xff0000, 10, 5);
    this.light1.position.set(-width * 0.2, height + 0.1, 0);
    this.group.add(this.light1);
    
    this.light2 = new THREE.PointLight(0x0000ff, 10, 5);
    this.light2.position.set(width * 0.2, height + 0.1, 0);
    this.group.add(this.light2);
    this.light2.visible = false;
  }

  public update(delta: number, otherCars: Car[]): void {
    this.updateLights(delta);
    
    const lightState = this.trafficLightController.getLightState(this.currentPath.trafficLightId);
    const distToStopLine = Math.abs((this.currentPath.axis === 'z' ? this.group.position.z : this.group.position.x) - this.currentPath.stopLine);
    
    let currentSpeed = this.speed;

    this.wantsGreenLight = false;
    if (this.isEmergencyActive && distToStopLine < CAR_STOP_DISTANCE_LIGHT + 5 && lightState === TrafficLightState.RED) {
        this.wantsGreenLight = true;
        currentSpeed = this.speed * 0.3; 
    }
    
    const pathDir = new THREE.Vector3().subVectors(this.currentPath.end, this.currentPath.start).normalize();
    this.group.position.addScaledVector(pathDir, currentSpeed * 60 * delta); // Apply delta
  }

  private updateLights(delta: number): void {
      if(!this.isEmergencyActive) {
        this.light1.visible = false;
        this.light2.visible = false;
        return;
      }
      this.lightTimer += delta;
      if (this.lightTimer > 0.2) {
          this.light1.visible = !this.light1.visible;
          this.light2.visible = !this.light2.visible;
          this.lightTimer = 0;
      }
  }
  
  public toggleSiren(): void {
      this.isEmergencyActive = !this.isEmergencyActive;
  }

  public getWantsGreenLight() {
    return this.isEmergencyActive && this.wantsGreenLight ? this.currentPath.trafficLightId : null;
  }

  public isAheadOf(position: THREE.Vector3): boolean {
    const distance = this.group.position.distanceTo(position);
    if (distance < AMBULANCE_PASS_DISTANCE) return false;

    if (this.currentPath.axis === 'z') {
        return (this.currentPath.start.z > this.currentPath.end.z) ? this.group.position.z < position.z : this.group.position.z > position.z;
    } else {
        return (this.currentPath.start.x > this.currentPath.end.x) ? this.group.position.x < position.x : this.group.position.x > position.x;
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
    return {
        id: this.id,
        type: 'ambulance',
        speed: this.speed,
        aiState: this.wantsGreenLight ? "REQUESTING_GREEN_LIGHT" : "MOVING",
        isEmergencyActive: this.isEmergencyActive,
    }
  }
}

export default Ambulance;
