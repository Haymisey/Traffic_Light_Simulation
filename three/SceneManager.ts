
import * as THREE from 'three';
// @ts-ignore TODO: Add proper THREE.OrbitControls types if available or use a typed version
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Road from './Road';
import Car from './Car';
import Ambulance from './Ambulance';
import TrafficLightController from './TrafficLightController';
import { PathDirection, INTERSECTION_SIZE, ROAD_LENGTH, LightId, ROAD_WIDTH, SPAWN_CHECK_RADIUS_CAR } from '../constants';
import type { Path, EmergencyVehicle, SelectedVehicleInfo } from '../types';

class SceneManager {
  private mount: HTMLDivElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls; 
  private clock = new THREE.Clock();
  
  // Interactivity State
  private isPaused = false;
  private simulationSpeed = 1;
  private onObjectSelected: (vehicle: SelectedVehicleInfo | null) => void;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedVehicleId: string | null = null;
  private outlinePass: any; // Using 'any' for simplicity with EffectComposer custom passes
  private composer: any; 

  // Simulation entities
  private cars: Car[] = [];
  private ambulances: Ambulance[] = [];
  private trafficLightController!: TrafficLightController;
  private road!: Road;
  private paths: Path[] = [];

  constructor(mount: HTMLDivElement, onObjectSelected: (vehicle: SelectedVehicleInfo | null) => void) {
    this.mount = mount;
    this.onObjectSelected = onObjectSelected;
  }

  public init(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

    const aspect = this.mount.clientWidth / this.mount.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 200);
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    this.setupLights();
    this.setupPaths();
    this.setupSceneElements();
    
    this.spawnInitialVehicles();
    
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('click', this.onClick);
  }

  private setupSceneElements(): void {
    this.road = new Road(this.scene);
    this.trafficLightController = new TrafficLightController(this.scene, this.paths);
    this.addInitialScenery();
  }

  private spawnInitialVehicles(): void {
    this.spawnVehicle(PathDirection.NORTH_TO_SOUTH, 'car');
    this.spawnVehicle(PathDirection.EAST_TO_WEST, 'car');
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    
    // Configure shadow properties for better quality and coverage
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    const shadowCamSize = 40;
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 100;

    this.scene.add(directionalLight);
  }

  private setupPaths(): void {
    const intersectionHalfSize = INTERSECTION_SIZE / 2;
    const startOffset = ROAD_LENGTH / 2 + intersectionHalfSize;
    const laneCenterOffset = ROAD_WIDTH / 4; 
    const stopLineOffset = intersectionHalfSize;

    this.paths = [
      { id: PathDirection.NORTH_TO_SOUTH, start: new THREE.Vector3(laneCenterOffset, 0, startOffset), end: new THREE.Vector3(laneCenterOffset, 0, -startOffset), stopLine: stopLineOffset, trafficLightId: LightId.NORTH_SOUTH, axis: 'z' },
      { id: PathDirection.SOUTH_TO_NORTH, start: new THREE.Vector3(-laneCenterOffset, 0, -startOffset), end: new THREE.Vector3(-laneCenterOffset, 0, startOffset), stopLine: -stopLineOffset, trafficLightId: LightId.NORTH_SOUTH, axis: 'z' },
      { id: PathDirection.EAST_TO_WEST, start: new THREE.Vector3(startOffset, 0, -laneCenterOffset), end: new THREE.Vector3(-startOffset, 0, -laneCenterOffset), stopLine: stopLineOffset, trafficLightId: LightId.EAST_WEST, axis: 'x' },
      { id: PathDirection.WEST_TO_EAST, start: new THREE.Vector3(-startOffset, 0, laneCenterOffset), end: new THREE.Vector3(startOffset, 0, laneCenterOffset), stopLine: -stopLineOffset, trafficLightId: LightId.EAST_WEST, axis: 'x' }
    ];
  }

  private addInitialScenery(): void {
    const buildingGeo = new THREE.BoxGeometry(8, 15, 8);
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const createBuilding = (pos: THREE.Vector3, geo = buildingGeo, mat = buildingMat) => {
        const building = new THREE.Mesh(geo, mat);
        building.position.copy(pos);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
    };
    createBuilding(new THREE.Vector3(15, 7.5, 15));
    createBuilding(new THREE.Vector3(-18, 5, -20), new THREE.BoxGeometry(6, 10, 12));
  }


  public spawnVehicle(pathDir?: PathDirection, type?: 'car' | 'ambulance'): void {
    const totalVehicles = this.cars.length + this.ambulances.length;
    if (totalVehicles >= 20) return;

    const randomPathIndex = pathDir !== undefined ? this.paths.findIndex(p => p.id === pathDir) : Math.floor(Math.random() * this.paths.length);
    const pathToSpawn = this.paths[randomPathIndex];
    
    const allVehicles: { getPosition: () => THREE.Vector3 }[] = [...this.cars, ...this.ambulances];
    if (allVehicles.some(v => v.getPosition().distanceTo(pathToSpawn.start) < SPAWN_CHECK_RADIUS_CAR)) return;

    const vehicleType = type || (this.ambulances.length < 1 && Math.random() < 0.1 ? 'ambulance' : 'car');
    
    if (vehicleType === 'ambulance') {
      this.spawnAmbulance(pathToSpawn.id);
    } else {
      this.spawnCar(pathToSpawn.id);
    }
  }

  private spawnCar(pathDirection: PathDirection): void {
    const carId = `car-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const isTruck = Math.random() < 0.3;
    const newCar = new Car({ id: carId, pathDirection, scene: this.scene, color: Math.random() * 0xffffff, isTruck }, this.paths, this.trafficLightController);
    this.cars.push(newCar);
  }
  
  private spawnAmbulance(pathDirection: PathDirection): void {
    const ambulanceId = `ambulance-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newAmbulance = new Ambulance({ id: ambulanceId, pathDirection, scene: this.scene }, this.paths, this.trafficLightController);
    this.ambulances.push(newAmbulance);
  }

  public animate = (): void => {
    requestAnimationFrame(this.animate);
    if (this.isPaused) return;

    const delta = this.clock.getDelta() * this.simulationSpeed;

    this.controls.update();

    const emergencyVehicles: EmergencyVehicle[] = this.ambulances;
    this.trafficLightController.update(delta, emergencyVehicles);
    
    // Update and remove vehicles
    this.ambulances = this.updateAndFilterVehicles(this.ambulances, delta, this.cars);
    this.cars = this.updateAndFilterVehicles(this.cars, delta, this.cars, emergencyVehicles);

    // Spawning logic
    if (Math.random() < 0.015 * this.simulationSpeed) {
        this.spawnVehicle();
    }
    
    // Update selected vehicle info
    if (this.selectedVehicleId) {
        const vehicle = [...this.cars, ...this.ambulances].find(v => v.id === this.selectedVehicleId);
        if (vehicle) {
            this.onObjectSelected(vehicle.getPublicState());
        } else {
            this.deselectVehicle(); // Vehicle was despawned
        }
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  private updateAndFilterVehicles<T extends {id: string, update: (...args: any[]) => void, isOffScreen: (b: number) => boolean, removeFromScene: () => void}>(
    vehicleList: T[], delta: number, ...updateArgs: any[]
  ): T[] {
    const vehiclesToRemove: string[] = [];
    vehicleList.forEach(vehicle => {
      vehicle.update(delta, ...updateArgs);
      if (vehicle.isOffScreen(ROAD_LENGTH + INTERSECTION_SIZE)) {
        vehiclesToRemove.push(vehicle.id);
        vehicle.removeFromScene();
      }
    });
    return vehicleList.filter(v => !vehiclesToRemove.includes(v.id));
  }

  private onClick = (event: MouseEvent) => {
    // Correctly calculate mouse coordinates relative to the canvas element
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    for (const intersect of intersects) {
        let currentObject = intersect.object;
        while(currentObject.parent) {
             if (currentObject.userData.vehicleId) {
                this.selectVehicle(currentObject.userData.vehicleId);
                return;
             }
             currentObject = currentObject.parent;
        }
    }
    this.deselectVehicle();
  };
  
  private selectVehicle(id: string) {
    if(this.selectedVehicleId === id) return;
    this.selectedVehicleId = id;
    const vehicle = [...this.cars, ...this.ambulances].find(v => v.id === id);
    if(vehicle) {
      this.onObjectSelected(vehicle.getPublicState());
    }
  }

  public deselectVehicle() {
    if(!this.selectedVehicleId) return;
    this.selectedVehicleId = null;
    this.onObjectSelected(null);
  }
  
  public togglePause = () => { this.isPaused = !this.isPaused; };
  public setSimulationSpeed = (speed: number) => { this.simulationSpeed = speed; };
  public toggleAmbulanceSiren = (id: string) => { this.ambulances.find(a => a.id === id)?.toggleSiren(); };

  public reset = () => {
    this.cars.forEach(c => c.removeFromScene());
    this.ambulances.forEach(a => a.removeFromScene());
    this.cars = [];
    this.ambulances = [];
    this.trafficLightController.reset();
    this.deselectVehicle();
    this.spawnInitialVehicles();
  }

  private onWindowResize = (): void => {
    this.camera.aspect = this.mount.clientWidth / this.mount.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.mount.clientWidth, this.mount.clientHeight);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.cars.forEach(car => car.removeFromScene());
    this.ambulances.forEach(ambulance => ambulance.removeFromScene());
    this.trafficLightController.dispose();
    this.road.dispose();
    if (this.renderer) this.renderer.dispose();
    if (this.mount && this.renderer.domElement) {
      if (this.mount.contains(this.renderer.domElement)) {
        this.mount.removeChild(this.renderer.domElement);
      }
    }
  }
}

export default SceneManager;
