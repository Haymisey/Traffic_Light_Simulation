
import * as THREE from 'three';
import { PlanetData } from './types.ts';

const ORBIT_SCALE = 50;
// Increased PLANET_SCALE for larger planets
const PLANET_SCALE = 1.0; // Original was 0.5
const SUN_RADIUS = 6 * PLANET_SCALE;

// Helper function to create stylized mountain ranges for Earth
const createEarthMountainRanges = (planetRadius: number): THREE.Group[] => {
  const mountainRanges: THREE.Group[] = [];
  const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x8D795B, flatShading: true }); // Dusty brown/grey

  const rangePositions = [
    { x: 0.3, y: 0.35, z: 0.8, peaks: 3 + Math.floor(Math.random() * 2) }, // On a continent
    { x: -0.5, y: 0.25, z: -0.6, peaks: 2 + Math.floor(Math.random() * 2) }, // On another continent
    { x: 0.7, y: -0.2, z: 0.1, peaks: 3 + Math.floor(Math.random() * 2) },
  ];

  rangePositions.forEach(rp => {
    const rangeContainer = new THREE.Group();
    const surfaceNormal = new THREE.Vector3(rp.x, rp.y, rp.z).normalize();
    rangeContainer.position.copy(surfaceNormal).multiplyScalar(planetRadius * 1.01); // Position on surface
    rangeContainer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal); // Align local Y with surface normal

    for (let i = 0; i < rp.peaks; i++) {
      const peakHeight = planetRadius * (0.05 + Math.random() * 0.07); // 5% to 12% of planet radius
      const peakRadius = planetRadius * (0.03 + Math.random() * 0.04); // 3% to 7% of planet radius
      const peakGeometry = new THREE.ConeGeometry(peakRadius, peakHeight, 6 + Math.floor(Math.random() * 3)); // 6-8 sides for low-poly look
      const peak = new THREE.Mesh(peakGeometry, mountainMaterial);
      
      const spreadFactor = planetRadius * 0.08;
      peak.position.set(
        (Math.random() - 0.5) * spreadFactor,
        peakHeight / 2, // Base of cone is at y=0 relative to its own origin
        (Math.random() - 0.5) * spreadFactor
      );
      // Slightly tilt peaks for variety
      peak.rotation.x = (Math.random() - 0.5) * 0.3;
      peak.rotation.z = (Math.random() - 0.5) * 0.3;
      rangeContainer.add(peak);
    }
    mountainRanges.push(rangeContainer);
  });

  return mountainRanges;
};

// Helper function to create stylized Earth features
const createEarthFeatures = (planetMesh: THREE.Object3D): THREE.Object3D[] => {
  const features: THREE.Object3D[] = [];
  const planetRadius = (planetMesh as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>).geometry.parameters.radius;

  // Continents (stylized green patches)
  const continentMaterial = new THREE.MeshStandardMaterial({ color: 0x3A9D23, flatShading: true }); // Brighter Green
  const continentShapes = [
    { x: 0.3, y: 0.3, z: 0.9, scale: 0.55 },
    { x: -0.5, y: 0.2, z: -0.7, scale: 0.45 },
    { x: 0.8, y: -0.1, z: 0.2, scale: 0.6 },
    { x: -0.2, y: -0.5, z: 0.5, scale: 0.4 },
    { x: 0.1, y: 0.8, z: 0.1, scale: 0.3 }, // Smaller northern continent
  ];

  continentShapes.forEach(shape => {
    // Using CapsuleGeometry for slightly more organic continent shapes
    const continentGeometry = new THREE.CapsuleGeometry(planetRadius * shape.scale * 0.7, planetRadius * shape.scale * 0.3, 4, 8);
    const continent = new THREE.Mesh(continentGeometry, continentMaterial);
    continent.position.set(shape.x * planetRadius, shape.y * planetRadius, shape.z * planetRadius).normalize().multiplyScalar(planetRadius * 1.005); // Slightly above surface
    continent.lookAt(new THREE.Vector3(0,0,0)); // Orient towards center
    continent.rotateX(Math.PI / 2); // Adjust orientation for capsule
    features.push(continent);
  });
  
  // Ice caps (stylized white patches)
  const iceMaterial = new THREE.MeshStandardMaterial({ color: 0xE0FFFF, flatShading: true, emissive: 0x555588, emissiveIntensity: 0.2 }); // LightCyan, slight glow
  const iceCapRadius = planetRadius * 0.35;
  const iceCapHeight = planetRadius * 0.05;
  const iceCapGeometry = new THREE.CapsuleGeometry(iceCapRadius, iceCapHeight, 8, 12);

  const northPole = new THREE.Mesh(iceCapGeometry, iceMaterial);
  northPole.position.set(0, planetRadius * (1 - iceCapHeight*0.01), 0).normalize().multiplyScalar(planetRadius * 1.001); // Position on top
  northPole.lookAt(new THREE.Vector3(0,2,0)); // Align with Y axis
  features.push(northPole);

  const southPole = new THREE.Mesh(iceCapGeometry, iceMaterial);
  southPole.position.set(0, -planetRadius * (1 - iceCapHeight*0.01), 0).normalize().multiplyScalar(planetRadius * 1.001); // Position on bottom
  southPole.lookAt(new THREE.Vector3(0,-2,0)); // Align with Y axis
  features.push(southPole);

  // "Trees" / Forest Patches - darker green, smaller spheres on continents
  const forestPatchMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, flatShading: true }); // Dark Green
  const forestPatchLocations = [ 
    { x: 0.25, y: 0.28, z: 0.85, scale: 0.18 },
    { x: -0.45, y: 0.18, z: -0.65, scale: 0.15 },
    { x: 0.75, y: -0.12, z: 0.22, scale: 0.2 },
    { x: 0.35, y: 0.35, z: 0.7, scale: 0.12 }, // Extra small patch
  ];

  forestPatchLocations.forEach(loc => {
    // Use Dodecahedron for more "bushy" look
    const patchGeometry = new THREE.DodecahedronGeometry(planetRadius * loc.scale, 0); 
    const forestPatch = new THREE.Mesh(patchGeometry, forestPatchMaterial);
    forestPatch.position.set(loc.x * planetRadius, loc.y * planetRadius, loc.z * planetRadius).normalize().multiplyScalar(planetRadius * 1.015); // Slightly above continents
    features.push(forestPatch);
  });

  // Mountains
  const mountainGroups = createEarthMountainRanges(planetRadius);
  mountainGroups.forEach(group => features.push(group));
  
  return features;
};

const createMarsFeatures = (planetMesh: THREE.Object3D): THREE.Object3D[] => {
  const features: THREE.Object3D[] = [];
  const planetRadius = (planetMesh as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>).geometry.parameters.radius;

  // Olympus Mons (stylized large mountain)
  const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D, flatShading: true }); // Sienna, slightly darker red
  const olympusGeom = new THREE.ConeGeometry(planetRadius * 0.4, planetRadius * 0.25, 16); // Wider base
  const olympusMons = new THREE.Mesh(olympusGeom, mountainMaterial);
  const olympusPos = new THREE.Vector3(1, 0.3, 0.2).normalize(); // Example position
  olympusMons.position.copy(olympusPos).multiplyScalar(planetRadius * 1.005);
  olympusMons.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), olympusPos); // Point cone "up" from surface
  features.push(olympusMons);

  // Valles Marineris (stylized canyon - a stretched, dark, slightly dented patch)
  const canyonMaterial = new THREE.MeshStandardMaterial({ color: 0x5D3A1A, flatShading: true }); // Darker red/brown
  // Use a BoxGeometry that's slightly thinner and wider
  const canyonGeom = new THREE.BoxGeometry(planetRadius * 1.5, planetRadius * 0.05, planetRadius * 0.3);
  const vallesMarineris = new THREE.Mesh(canyonGeom, canyonMaterial);
  const vallesPos = new THREE.Vector3(0.1, 0, 1).normalize(); // Along an equatorial region
  vallesMarineris.position.copy(vallesPos).multiplyScalar(planetRadius * 1.001); // Very close to surface
  vallesMarineris.lookAt(vallesPos.clone().multiplyScalar(2)); // Align with surface normal
  features.push(vallesMarineris);
  
  // Polar caps for Mars
  const marsIceMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFAFA, flatShading: true, opacity: 0.8, transparent: true });
  const marsIceCapRadius = planetRadius * 0.25;
  const marsIceCapHeight = planetRadius * 0.03;
  const marsIceCapGeometry = new THREE.CapsuleGeometry(marsIceCapRadius, marsIceCapHeight, 6, 10);

  const marsNorthPole = new THREE.Mesh(marsIceCapGeometry, marsIceMaterial);
  marsNorthPole.position.set(0, planetRadius, 0).normalize().multiplyScalar(planetRadius * 1.001);
  marsNorthPole.lookAt(new THREE.Vector3(0,2,0));
  features.push(marsNorthPole);
  
  const marsSouthPole = new THREE.Mesh(marsIceCapGeometry, marsIceMaterial);
  marsSouthPole.position.set(0, -planetRadius, 0).normalize().multiplyScalar(planetRadius * 1.001);
  marsSouthPole.lookAt(new THREE.Vector3(0,-2,0));
  features.push(marsSouthPole);


  return features;
};


export const PLANETS_DATA: PlanetData[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    radius: 0.38 * PLANET_SCALE,
    color: 0xAAAAAA, // Grey
    orbitRadius: 0.39 * ORBIT_SCALE,
    orbitSpeed: 0.04,
    rotationSpeed: 0.001,
    tilt: 0.03 * (Math.PI / 180),
    description: "The smallest planet in our solar system and nearest to the Sun."
  },
  {
    id: 'venus',
    name: 'Venus',
    radius: 0.95 * PLANET_SCALE,
    color: 0xFFE4B5, // Moccasin (yellowish)
    orbitRadius: 0.72 * ORBIT_SCALE,
    orbitSpeed: 0.035,
    rotationSpeed: -0.0005, 
    tilt: 177 * (Math.PI / 180),
    description: "Known for its thick, toxic atmosphere and extreme temperatures."
  },
  {
    id: 'earth',
    name: 'Earth',
    radius: 1.0 * PLANET_SCALE,
    color: 0x4169E1, // Royal Blue (more vibrant water)
    orbitRadius: 1.0 * ORBIT_SCALE,
    orbitSpeed: 0.029,
    rotationSpeed: 0.01,
    tilt: 23.5 * (Math.PI / 180),
    description: "Our home planet, the only place known to support life.",
    detailedFeatures: createEarthFeatures,
    moons: [
        { id: 'moon', name: 'Moon', radius: 0.27 * PLANET_SCALE, color: 0xCCCCCC, orbitRadius: 2.5 * PLANET_SCALE, orbitSpeed: 0.1 }
    ]
  },
  {
    id: 'mars',
    name: 'Mars',
    radius: 0.53 * PLANET_SCALE,
    color: 0xD88050, // More desaturated red/orange
    orbitRadius: 1.52 * ORBIT_SCALE,
    orbitSpeed: 0.024,
    rotationSpeed: 0.009,
    tilt: 25.2 * (Math.PI / 180),
    description: "The 'Red Planet', known for its rusty color and potential for past life.",
    detailedFeatures: createMarsFeatures,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    radius: 3.0 * PLANET_SCALE, 
    color: 0xFFDEAD, 
    orbitRadius: 5.2 * ORBIT_SCALE,
    orbitSpeed: 0.013,
    rotationSpeed: 0.025,
    tilt: 3.1 * (Math.PI / 180),
    description: "The largest planet, a gas giant with a Great Red Spot."
  },
  {
    id: 'saturn',
    name: 'Saturn',
    radius: 2.5 * PLANET_SCALE,
    color: 0xF0E68C,
    orbitRadius: 9.58 * ORBIT_SCALE,
    orbitSpeed: 0.009,
    rotationSpeed: 0.023,
    tilt: 26.7 * (Math.PI / 180),
    rings: {
      innerRadius: 3.0 * PLANET_SCALE,
      outerRadius: 4.5 * PLANET_SCALE,
      color: 0xD2B48C,
    },
    description: "Known for its spectacular ring system."
  },
  {
    id: 'uranus',
    name: 'Uranus',
    radius: 1.5 * PLANET_SCALE,
    color: 0xAFEEEE,
    orbitRadius: 19.22 * ORBIT_SCALE,
    orbitSpeed: 0.006,
    rotationSpeed: 0.014,
    tilt: 97.8 * (Math.PI / 180),
    description: "An ice giant that rotates on its side."
  },
  {
    id: 'neptune',
    name: 'Neptune',
    radius: 1.4 * PLANET_SCALE,
    color: 0x4169E1,
    orbitRadius: 30.05 * ORBIT_SCALE,
    orbitSpeed: 0.005,
    rotationSpeed: 0.015,
    tilt: 28.3 * (Math.PI / 180),
    description: "The most distant planet, a cold and dark ice giant."
  },
];

export const SUN_DATA = {
  radius: SUN_RADIUS,
  color: 0xFFF5C3, 
  emissiveColor: 0xFFFF00,
};

export const CAMERA_ZOOM_FACTOR = 3.5;
export const CAMERA_ANIMATION_DURATION = 1500; // ms
export const INFO_PANEL_WIDTH = 300; // px
