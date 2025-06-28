
import React from 'react';

interface ControlPanelProps {
  isPaused: boolean;
  simulationSpeed: number;
  onTogglePause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSpawnCar: () => void;
  onSpawnAmbulance: () => void;
}

const buttonStyle = "px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400";
const secondaryButtonStyle = "px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400";

const ControlPanel: React.FC<ControlPanelProps> = ({
  isPaused,
  simulationSpeed,
  onTogglePause,
  onReset,
  onSpeedChange,
  onSpawnCar,
  onSpawnAmbulance,
}) => {
  return (
    <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg flex flex-col gap-4 w-64">
      
      <div className="flex items-center justify-between gap-2">
        <button onClick={onTogglePause} className={`${buttonStyle} w-1/2`}>
          {isPaused ? '▶️ Play' : '⏸️ Pause'}
        </button>
        <button onClick={onReset} className={`${secondaryButtonStyle} w-1/2`}>
          🔄 Reset
        </button>
      </div>

      <div>
        <label htmlFor="speed-slider" className="block mb-1 text-sm font-medium text-gray-300">
          Simulation Speed: {simulationSpeed.toFixed(1)}x
        </label>
        <input
          id="speed-slider"
          type="range"
          min="0.5"
          max="4"
          step="0.5"
          value={simulationSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-300">Spawn Vehicle</p>
        <div className="flex justify-between gap-2">
          <button onClick={onSpawnCar} className={`${secondaryButtonStyle} w-full`}>
            Spawn Car
          </button>
          <button onClick={onSpawnAmbulance} className={`${secondaryButtonStyle} w-full`}>
            Spawn Ambulance
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
