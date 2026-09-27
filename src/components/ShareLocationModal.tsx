import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Radio,
  Send,
  X,
  Compass,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Crosshair,
} from 'lucide-react';
import { LocationStamp } from '../types';
import {
  getCurrentTacticalPosition,
  formatDecimalCoordinates,
  computeTacticalGridRef,
  TACTICAL_WAYPOINT_PRESETS,
  TacticalPreset,
} from '../utils/geoUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShareLocation: (location: LocationStamp) => void;
  currentChannelName: string;
}

export const ShareLocationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onShareLocation,
  currentChannelName,
}) => {
  const [selectedMode, setSelectedMode] = useState<'gps' | 'preset' | 'custom'>('gps');
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [gpsStamp, setGpsStamp] = useState<LocationStamp | null>(null);
  const [isSimulatedGps, setIsSimulatedGps] = useState(false);
  const [customLabel, setCustomLabel] = useState('Operator Current Position');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(TACTICAL_WAYPOINT_PRESETS[0].id);

  // Custom coordinate inputs
  const [customLat, setCustomLat] = useState('37.7749');
  const [customLng, setCustomLng] = useState('-122.4194');

  const fetchGps = async () => {
    setIsLoadingGps(true);
    try {
      const { stamp, isSimulated } = await getCurrentTacticalPosition();
      setGpsStamp(stamp);
      setIsSimulatedGps(isSimulated);
    } catch {
      // Fallback
      setGpsStamp({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        gridRef: computeTacticalGridRef(37.7749, -122.4194),
        label: 'Grid Base Terminal (Offline Fallback)',
      });
    } finally {
      setIsLoadingGps(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGps();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTransmit = () => {
    let finalLocation: LocationStamp;

    if (selectedMode === 'gps') {
      finalLocation = {
        latitude: gpsStamp?.latitude || 37.7749,
        longitude: gpsStamp?.longitude || -122.4194,
        accuracy: gpsStamp?.accuracy || 10,
        altitude: gpsStamp?.altitude,
        gridRef: gpsStamp?.gridRef || computeTacticalGridRef(37.7749, -122.4194),
        label: customLabel.trim() || 'Operator Current Position',
      };
    } else if (selectedMode === 'preset') {
      const preset = TACTICAL_WAYPOINT_PRESETS.find((p) => p.id === selectedPresetId) || TACTICAL_WAYPOINT_PRESETS[0];
      finalLocation = {
        latitude: preset.latitude,
        longitude: preset.longitude,
        accuracy: 5,
        gridRef: preset.gridRef,
        label: preset.name,
      };
    } else {
      const lat = parseFloat(customLat) || 37.7749;
      const lng = parseFloat(customLng) || -122.4194;
      finalLocation = {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        gridRef: computeTacticalGridRef(lat, lng),
        label: customLabel.trim() || 'Custom Waypoint',
      };
    }

    onShareLocation(finalLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-lg border bg-emerald-950/80 border-emerald-500/50 text-emerald-400">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-tactical font-bold tracking-wider text-white">
              SHARE TACTICAL GPS LOCATION
            </h2>
            <p className="text-xs text-slate-400">
              Transmit live coordinates & interactive map stamp to channel{' '}
              <span className="text-emerald-400 font-code font-bold">[{currentChannelName.toUpperCase()}]</span>
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-4 text-xs font-tactical">
          <button
            onClick={() => setSelectedMode('gps')}
            className={`py-2 px-2 rounded-md transition-all font-semibold flex items-center justify-center gap-1.5 ${
              selectedMode === 'gps'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Live GPS</span>
          </button>
          <button
            onClick={() => setSelectedMode('preset')}
            className={`py-2 px-2 rounded-md transition-all font-semibold flex items-center justify-center gap-1.5 ${
              selectedMode === 'preset'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Waypoints</span>
          </button>
          <button
            onClick={() => setSelectedMode('custom')}
            className={`py-2 px-2 rounded-md transition-all font-semibold flex items-center justify-center gap-1.5 ${
              selectedMode === 'custom'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Manual Grid</span>
          </button>
        </div>

        {/* MODE 1: LIVE GPS */}
        {selectedMode === 'gps' && (
          <div className="space-y-4 mb-5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-tactical text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  CURRENT POSITION FIX
                </span>
                <button
                  type="button"
                  onClick={fetchGps}
                  disabled={isLoadingGps}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingGps ? 'animate-spin' : ''}`} />
                  Refresh GPS
                </button>
              </div>

              {isLoadingGps ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Locking GPS satellite constellation...</span>
                </div>
              ) : gpsStamp ? (
                <div className="space-y-2">
                  <div className="font-code text-sm font-bold text-emerald-400 bg-black/40 py-2 px-3 rounded border border-emerald-950/60 flex items-center justify-between">
                    <span>{formatDecimalCoordinates(gpsStamp.latitude, gpsStamp.longitude)}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ±{gpsStamp.accuracy || 8}m
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between font-code px-1">
                    <span>MGRS GRID: {gpsStamp.gridRef}</span>
                    {isSimulatedGps && (
                      <span className="text-amber-400 text-[10px] font-sans">
                        Tactical Field Grid
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-tactical uppercase tracking-wider text-slate-400 mb-1">
                Tactical Position Label / Note
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Unit Vanguard Recon Position"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none font-code"
              />
            </div>
          </div>
        )}

        {/* MODE 2: TACTICAL WAYPOINT PRESETS */}
        {selectedMode === 'preset' && (
          <div className="space-y-2.5 mb-5 max-h-64 overflow-y-auto pr-1">
            {TACTICAL_WAYPOINT_PRESETS.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-tactical font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {preset.name}
                    </span>
                    <span className="font-code text-[11px] text-emerald-400 font-bold">
                      {preset.gridRef}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">{preset.description}</div>
                  <div className="text-[10px] font-code text-slate-500 mt-1">
                    {formatDecimalCoordinates(preset.latitude, preset.longitude)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 3: MANUAL COORDINATES */}
        {selectedMode === 'custom' && (
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-tactical uppercase tracking-wider text-slate-400 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  placeholder="37.7749"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none font-code"
                />
              </div>
              <div>
                <label className="block text-xs font-tactical uppercase tracking-wider text-slate-400 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  placeholder="-122.4194"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none font-code"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-tactical uppercase tracking-wider text-slate-400 mb-1">
                Waypoint Label
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Rendezvous Checkpoint"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white focus:outline-none font-code"
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleTransmit}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-tactical font-bold text-xs tracking-wider rounded-lg shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            TRANSMIT LOCATION STAMP
          </button>
        </div>
      </div>
    </div>
  );
};
