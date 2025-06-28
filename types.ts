
import * as THREE from 'three';

export interface PlanetData {
  id: string;
  name: string;
  radius: number; // Visual radius in the scene
  color: THREE.ColorRepresentation;
  orbitRadius: number; // Distance from the Sun
  orbitSpeed: number; // Radians per frame (approx)
  rotationSpeed: number; // Radians per frame (approx)
  textureSeed?: number; // For procedural texturing or variation
  tilt?: number; // Axial tilt in radians
  rings?: {
    innerRadius: number;
    outerRadius: number;
    color: THREE.ColorRepresentation;
  };
  moons?: MoonData[];
  description?: string; // Simple description for UI
  detailedFeatures?: (planetMesh: THREE.Object3D) => THREE.Object3D[]; // Function to add detailed features
}

export interface MoonData {
  id: string;
  name: string;
  radius: number;
  color: THREE.ColorRepresentation;
  orbitRadius: number; // Distance from its planet
  orbitSpeed: number;
}

export type CelestialBody = THREE.Mesh | THREE.Group;
