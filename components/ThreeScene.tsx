
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import SceneManager from '../three/SceneManager';
import type { SelectedVehicleInfo } from '../types';

interface ThreeSceneProps {
  onObjectSelected: (vehicle: SelectedVehicleInfo | null) => void;
}

export interface SceneHandle {
  togglePause: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  spawnVehicle: (type: 'car' | 'ambulance') => void;
  toggleAmbulanceSiren: (id: string) => void;
  deselectVehicle: () => void;
}

const ThreeScene = forwardRef<SceneHandle, ThreeSceneProps>(({ onObjectSelected }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  useEffect(() => {
    if (mountRef.current && !sceneManagerRef.current) {
      sceneManagerRef.current = new SceneManager(mountRef.current, onObjectSelected);
      sceneManagerRef.current.init();
      sceneManagerRef.current.animate();
    }

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
    };
  }, [onObjectSelected]);

  useImperativeHandle(ref, () => ({
    togglePause: () => {
      sceneManagerRef.current?.togglePause();
    },
    resetSimulation: () => {
      sceneManagerRef.current?.reset();
    },
    setSimulationSpeed: (speed: number) => {
      sceneManagerRef.current?.setSimulationSpeed(speed);
    },
    spawnVehicle: (type: 'car' | 'ambulance') => {
      sceneManagerRef.current?.spawnVehicle(undefined, type);
    },
    toggleAmbulanceSiren: (id: string) => {
       sceneManagerRef.current?.toggleAmbulanceSiren(id);
    },
    deselectVehicle: () => {
      sceneManagerRef.current?.deselectVehicle();
    }
  }));

  return <div ref={mountRef} className="w-full h-full" />;
});

export default ThreeScene;
