import * as THREE from 'three';
import { INTERSECTION_SIZE, ROAD_WIDTH, ROAD_LENGTH } from '../constants';

class Road {
  private scene: THREE.Scene;
  private group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.createRoad();
    this.scene.add(this.group);
  }

  private createRoad(): void {
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x55aa55, side: THREE.DoubleSide });
    
    const groundSize = 100;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundPlane = new THREE.Mesh(groundGeo, grassMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.05;
    groundPlane.receiveShadow = true;
    this.group.add(groundPlane);

    const intersectionGeo = new THREE.PlaneGeometry(INTERSECTION_SIZE, INTERSECTION_SIZE);
    const intersectionMesh = new THREE.Mesh(intersectionGeo, roadMaterial);
    intersectionMesh.rotation.x = -Math.PI / 2;
    intersectionMesh.receiveShadow = true;
    this.group.add(intersectionMesh);

    const roadSegmentGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const roadSegmentEWGeo = new THREE.PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH);

    const northRoad = new THREE.Mesh(roadSegmentGeo, roadMaterial);
    northRoad.rotation.x = -Math.PI / 2;
    northRoad.position.z = INTERSECTION_SIZE / 2 + ROAD_LENGTH / 2;
    northRoad.receiveShadow = true;
    this.group.add(northRoad);

    const southRoad = new THREE.Mesh(roadSegmentGeo, roadMaterial);
    southRoad.rotation.x = -Math.PI / 2;
    southRoad.position.z = -(INTERSECTION_SIZE / 2 + ROAD_LENGTH / 2);
    southRoad.receiveShadow = true;
    this.group.add(southRoad);
    
    const eastRoad = new THREE.Mesh(roadSegmentEWGeo, roadMaterial);
    eastRoad.rotation.x = -Math.PI / 2;
    eastRoad.position.x = INTERSECTION_SIZE / 2 + ROAD_LENGTH / 2;
    eastRoad.receiveShadow = true;
    this.group.add(eastRoad);

    const westRoad = new THREE.Mesh(roadSegmentEWGeo, roadMaterial);
    westRoad.rotation.x = -Math.PI / 2;
    westRoad.position.x = -(INTERSECTION_SIZE / 2 + ROAD_LENGTH / 2);
    westRoad.receiveShadow = true;
    this.group.add(westRoad);

    // Dashed lines for lanes
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const lineLength = 2;
    const lineGap = 3;
    const lineGeo = new THREE.BoxGeometry(0.1, 0.02, lineLength);

    const createDashedLine = (start: THREE.Vector3, end: THREE.Vector3) => {
        const direction = new THREE.Vector3().subVectors(end, start);
        const totalLength = direction.length();
        direction.normalize();
        const numDashes = Math.floor(totalLength / (lineLength + lineGap));
        for (let i = 0; i < numDashes; i++) {
            const dash = new THREE.Mesh(lineGeo, lineMaterial);
            const pos = new THREE.Vector3().copy(start).addScaledVector(direction, i * (lineLength + lineGap) + lineLength / 2);
            pos.y = 0.01;
            dash.position.copy(pos);
            dash.lookAt(end);
            this.group.add(dash);
        }
    }
    
    const roadEdge = INTERSECTION_SIZE / 2;
    const roadEnd = roadEdge + ROAD_LENGTH;

    // N-S road lines
    createDashedLine(new THREE.Vector3(0, 0, roadEdge), new THREE.Vector3(0, 0, roadEnd));
    createDashedLine(new THREE.Vector3(0, 0, -roadEdge), new THREE.Vector3(0, 0, -roadEnd));
    
    // E-W road lines
    createDashedLine(new THREE.Vector3(roadEdge, 0, 0), new THREE.Vector3(roadEnd, 0, 0));
    createDashedLine(new THREE.Vector3(-roadEdge, 0, 0), new THREE.Vector3(-roadEnd, 0, 0));
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
    this.scene.remove(this.group);
  }
}

export default Road;