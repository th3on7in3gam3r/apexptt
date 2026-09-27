import React, { useState } from 'react';
import { AlertTriangle, Siren, ShieldAlert, X, Volume2, Navigation } from 'lucide-react';
import { playEmergencySiren } from '../utils/audioEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastSos: (message: string) => void;
  callsign: string;
}

export const EmergencySosModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onBroadcastSos,
  callsign,
}) => {
  const [customMsg, setCustomMsg] = useState('MAYDAY / PRIORITY DISTRESS - ASSISTANCE REQUIRED IMMEDIATELY');
  const [isArmed, setIsArmed] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  if (!isOpen) return null;

  const handleTrigger = () => {
    playEmergencySiren(0.8);
    onBroadcastSos(customMsg);
    setHasTriggered(true);
    setTimeout(() => {
      setHasTriggered(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-rose-600 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-rose-600/20 border border-rose-500 text-rose-500 animate-pulse">
            <Siren className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-tactical font-black tracking-wider text-rose-500">
              EMERGENCY SOS OVERRIDE
            </h2>
            <p className="text-xs text-slate-400">
              High-priority broadcast to ALL active channels and units
            </p>
          </div>
        </div>

        {hasTriggered ? (
          <div className="py-8 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce mx-auto" />
            <div className="text-lg font-tactical font-black text-rose-400 tracking-wider">
              DISTRESS BEACON BROADCASTED!
            </div>
            <div className="text-xs text-slate-300">
              All tactical monitors alerted. Siren sounding across open frequencies.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-rose-950/40 border border-rose-900/60 rounded-lg p-3 text-xs text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-tactical font-bold text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                TACTICAL PRIORITY OVERRIDE
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Activating this distress beacon interrupts ongoing voice traffic on all channels, sounds alarm chimes, and transmits operator callsign <strong>[{callsign}]</strong> with tactical coordinates.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs flex items-center gap-2 text-slate-400 font-code">
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>GPS GRID: 37.7749° N, 122.4194° W (ACCURACY: ±3m)</span>
            </div>

            <div>
              <label className="block text-xs font-tactical uppercase tracking-wider text-slate-400 mb-1">
                Distress Transmission Message
              </label>
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none font-code"
              />
            </div>

            {/* Arm Switch */}
            <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
              <div className="text-xs">
                <div className="font-tactical font-bold text-white tracking-wider">SAFETY INTERLOCK</div>
                <div className="text-[11px] text-slate-400">Arm safety cover before activation</div>
              </div>
              <button
                type="button"
                onClick={() => setIsArmed(!isArmed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-tactical font-bold tracking-wider transition-all border ${
                  isArmed
                    ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {isArmed ? 'ARMED' : 'DISARMED'}
              </button>
            </div>

            {/* Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={!isArmed}
                onClick={handleTrigger}
                className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-tactical font-black text-sm tracking-widest rounded-xl shadow-xl shadow-rose-950/80 flex items-center justify-center gap-2 border border-rose-500 transition-all uppercase"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                TRANSMIT EMERGENCY MAYDAY
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
