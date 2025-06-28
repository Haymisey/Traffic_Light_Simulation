
import React, { useState, useRef, useCallback } from 'react';
import ThreeScene, { SceneHandle } from './components/ThreeScene';
import ControlPanel from './components/ControlPanel';
import InfoPanel from './components/InfoPanel';
import type { SelectedVehicleInfo } from './types';

const App: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicleInfo | null>(null);

  const sceneRef = useRef<SceneHandle>(null);

  const handleTogglePause = useCallback(() => {
    sceneRef.current?.togglePause();
    setIsPaused(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    sceneRef.current?.resetSimulation();
    if(isPaused) {
      sceneRef.current?.togglePause();
      setIsPaused(false);
    }
  }, [isPaused]);

  const handleSpeedChange = useCallback((speed: number) => {
    sceneRef.current?.setSimulationSpeed(speed);
    setSimulationSpeed(speed);
  }, []);

  const handleSpawnCar = useCallback(() => {
    sceneRef.current?.spawnVehicle('car');
  }, []);

  const handleSpawnAmbulance = useCallback(() => {
    sceneRef.current?.spawnVehicle('ambulance');
  }, []);

  const handleToggleSiren = useCallback(() => {
    if (selectedVehicle?.type === 'ambulance') {
      sceneRef.current?.toggleAmbulanceSiren(selectedVehicle.id);
    }
  }, [selectedVehicle]);

  const handleObjectSelected = useCallback((vehicleInfo: SelectedVehicleInfo | null) => {
    setSelectedVehicle(vehicleInfo);
  }, []);
  
  const handleDeselect = useCallback(() => {
     sceneRef.current?.deselectVehicle();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white">
      <header className="p-4 bg-gray-900 shadow-md text-center">
        <h1 className="text-2xl font-bold">3D Traffic Light Simulation</h1>
        <p className="text-sm text-gray-400">Click vehicles to inspect them. Use controls to manage the simulation.</p>
      </header>
      <main className="flex-grow relative">
        <ThreeScene 
          ref={sceneRef} 
          onObjectSelected={handleObjectSelected} 
        />
        <ControlPanel
          isPaused={isPaused}
          simulationSpeed={simulationSpeed}
          onTogglePause={handleTogglePause}
          onReset={handleReset}
          onSpeedChange={handleSpeedChange}
          onSpawnCar={handleSpawnCar}
          onSpawnAmbulance={handleSpawnAmbulance}
        />
        <InfoPanel 
          vehicle={selectedVehicle}
          onDeselect={handleDeselect}
          onToggleSiren={handleToggleSiren}
        />
      </main>
    </div>
  );
};

export default App;
