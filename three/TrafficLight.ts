
import * as THREE from 'three';
import { TrafficLightState } from '../constants';
import type { TrafficSignal } from '../types';

class TrafficLight implements TrafficSignal {
  public lightPole: THREE.Mesh;
  public lightHousing: THREE.Mesh;
  public redLight: THREE.Mesh;
  public greenLight: THREE.Mesh;
  public yellowLight: THREE.Mesh;
  
  private group: THREE.Group;
  private redMaterialOn: THREE.MeshStandardMaterial;
  private redMaterialOff: THREE.MeshStandardMaterial;
  private yellowMaterialOn: THREE.MeshStandardMaterial;
  private yellowMaterialOff: THREE.MeshStandardMaterial;
  private greenMaterialOn: THREE.MeshStandardMaterial;
  private greenMaterialOff: THREE.MeshStandardMaterial;

  constructor(position: THREE.Vector3, rotationY: number = 0) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;

    // Materials
    this.redMaterialOn = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 });
    this.redMaterialOff = new THREE.MeshStandardMaterial({ color: 0x600000 });
    this.yellowMaterialOn = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1 });
    this.yellowMaterialOff = new THREE.MeshStandardMaterial({ color: 0x606000 });
    this.greenMaterialOn = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1 });
    this.greenMaterialOff = new THREE.MeshStandardMaterial({ color: 0x006000 });

    const poleRadius = 0.15;
    const poleHeight = 3.5;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 16); // Unique Object Type 3 (Pole)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x505050 });
    this.lightPole = new THREE.Mesh(poleGeo, poleMat);
    this.lightPole.position.y = poleHeight / 2; // Center pole at its height mid-point
    this.lightPole.castShadow = true;
    this.group.add(this.lightPole);

    const housingWidth = 0.4;
    const housingHeight = 1.2;
    const housingDepth = 0.4;
    const housingGeo = new THREE.BoxGeometry(housingWidth, housingHeight, housingDepth); // Unique Object Type (Housing) - Part of Traffic Light
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.lightHousing = new THREE.Mesh(housingGeo, housingMat);
    this.lightHousing.position.y = poleHeight - housingHeight / 2 - 0.2; // Position housing near the top of the pole
    // Place housing in front of the pole along the group's local Z axis
    this.lightHousing.position.z = poleRadius + housingDepth / 2; 
    this.lightHousing.castShadow = true;
    this.group.add(this.lightHousing);

    const lightRadius = 0.15;
    const lightGeo = new THREE.SphereGeometry(lightRadius, 16, 16);
    
    // Position lights on the front face of the housing (local +Z of housing)
    const lightZOffset = housingDepth / 2; 

    this.redLight = new THREE.Mesh(lightGeo, this.redMaterialOff);
    this.redLight.position.set(0, housingHeight * 0.33, lightZOffset); // Top light
    this.lightHousing.add(this.redLight);

    this.yellowLight = new THREE.Mesh(lightGeo, this.yellowMaterialOff);
    this.yellowLight.position.set(0, 0, lightZOffset); // Middle light
    this.lightHousing.add(this.yellowLight);

    this.greenLight = new THREE.Mesh(lightGeo, this.greenMaterialOff);
    this.greenLight.position.set(0, -housingHeight * 0.33, lightZOffset); // Bottom light
    this.lightHousing.add(this.greenLight);

    this.setLightState(TrafficLightState.RED); // Default state
  }

  public setLightState(state: TrafficLightState): void {
    this.redLight.material = this.redMaterialOff;
    this.yellowLight.material = this.yellowMaterialOff;
    this.greenLight.material = this.greenMaterialOff;

    switch (state) {
      case TrafficLightState.RED:
        this.redLight.material = this.redMaterialOn;
        break;
      case TrafficLightState.YELLOW:
        this.yellowLight.material = this.yellowMaterialOn;
        break;
      case TrafficLightState.GREEN:
        this.greenLight.material = this.greenMaterialOn;
        break;
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.group.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
             if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
    [this.redMaterialOn, this.redMaterialOff, this.yellowMaterialOn, this.yellowMaterialOff, this.greenMaterialOn, this.greenMaterialOff].forEach(m => m.dispose());
  }
}

export default TrafficLight;
