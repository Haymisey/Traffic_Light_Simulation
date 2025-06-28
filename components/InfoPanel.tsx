
import React from 'react';
import type { SelectedVehicleInfo } from '../types';

interface InfoPanelProps {
  vehicle: SelectedVehicleInfo | null;
  onDeselect: () => void;
  onToggleSiren?: () => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ vehicle, onDeselect, onToggleSiren }) => {
  if (!vehicle) {
    return null;
  }

  const getAIStateColor = (state: string) => {
      if (state.includes("STOPPED")) return "text-red-400";
      if (state.includes("STOPPING") || state.includes("YELLOW")) return "text-yellow-400";
      if (state.includes("PULLING") || state.includes("MERGING")) return "text-blue-400";
      if (state.includes("MOVING")) return "text-green-400";
      return "text-gray-300";
  }

  return (
    <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-80 p-4 rounded-lg shadow-lg w-72 text-sm animate-fade-in">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold capitalize text-white">{vehicle.type}</h3>
        <button onClick={onDeselect} className="text-gray-400 hover:text-white transition-colors text-xl">&times;</button>
      </div>

      <div className="space-y-2">
        <div>
          <span className="font-semibold text-gray-400">Status: </span>
          <span className={`font-bold ${getAIStateColor(vehicle.aiState)}`}>
            {vehicle.aiState.replace(/_/g, ' ')}
          </span>
        </div>
        <div>
          <span className="font-semibold text-gray-400">Speed: </span>
          <span className="text-white">{(vehicle.speed * 100).toFixed(0)} km/h</span>
        </div>
         {vehicle.type === 'ambulance' && (
            <div>
                <span className="font-semibold text-gray-400">Siren: </span>
                <span className={vehicle.isEmergencyActive ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                    {vehicle.isEmergencyActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
            </div>
         )}
      </div>

      {vehicle.type === 'ambulance' && onToggleSiren && (
        <button 
          onClick={onToggleSiren} 
          className="w-full mt-4 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          Toggle Siren
        </button>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default InfoPanel;
