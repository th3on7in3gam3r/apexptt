import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  Sliders,
  X,
  Play,
  Check,
  Shield,
  Zap,
  Info,
  Clock,
} from 'lucide-react';
import {
  RogerBeepStyle,
  LcdColorTheme,
  VoiceModulation,
  VoxSettings,
} from '../types';
import { playRogerBeep, playMicChirp } from '../utils/audioEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  voxSettings: VoxSettings;
  onChangeVoxSettings: (settings: VoxSettings) => void;
  liveMicLevel: number;
  isTransmitting: boolean;
  isVoxActive?: boolean;
  rogerBeep: RogerBeepStyle;
  onChangeRogerBeep: (beep: RogerBeepStyle) => void;
  voiceModulation: VoiceModulation;
  onChangeVoiceModulation: (modulation: VoiceModulation) => void;
  noiseSuppression: boolean;
  onChangeNoiseSuppression: (enabled: boolean) => void;
  compressorReductionDb?: number;
  lcdTheme: LcdColorTheme;
  onChangeLcdTheme: (theme: LcdColorTheme) => void;
  volume: number;
  onChangeVolume: (volume: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TacticalSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  voxSettings,
  onChangeVoxSettings,
  liveMicLevel,
  isTransmitting,
  isVoxActive,
  rogerBeep,
  onChangeRogerBeep,
  voiceModulation,
  onChangeVoiceModulation,
  noiseSuppression,
  onChangeNoiseSuppression,
  compressorReductionDb = 0,
  lcdTheme,
  onChangeLcdTheme,
  volume,
  onChangeVolume,
  isMuted,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<'vox' | 'audio' | 'display'>('vox');

  if (!isOpen) return null;

  const isTriggered = liveMicLevel >= voxSettings.threshold;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <h2 className="font-tactical font-black text-white text-base tracking-wider flex items-center gap-2">
                TACTICAL RADIO CONFIGURATION
              </h2>
              <p className="text-slate-400 text-xs font-code">
                VOX Voice Activation & DSP Transceiver Settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/40 text-xs font-tactical font-bold">
          <button
            onClick={() => setActiveTab('vox')}
            className={`py-3 px-1 flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-b-2 ${
              activeTab === 'vox'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">VOX (VOICE ACTIVATION)</span>
            <span className="sm:hidden">VOX</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`py-3 px-1 flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-b-2 ${
              activeTab === 'audio'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">AUDIO & DSP FILTERS</span>
            <span className="sm:hidden">AUDIO</span>
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`py-3 px-1 flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-b-2 ${
              activeTab === 'display'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">DISPLAY & CHASSIS</span>
            <span className="sm:hidden">DISPLAY</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200 text-sm">
          {/* TAB 1: VOX (VOICE ACTIVATED TRANSMISSION) */}
          {activeTab === 'vox' && (
            <div className="space-y-5">
              {/* Master VOX Toggle */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-tactical font-black text-white text-base">
                      VOX (VOICE ACTIVATED TRANSMISSION)
                    </span>
                    {voxSettings.enabled && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-tactical font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Automatically triggers Push-to-Talk when voice volume crosses the sensitivity threshold. Hands-free tactical operations.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={voxSettings.enabled}
                    onChange={(e) =>
                      onChangeVoxSettings({
                        ...voxSettings,
                        enabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-13 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                </label>
              </div>

              {/* Live Microphone Calibration Meter & Threshold Slider */}
              <div className={`bg-slate-950 border rounded-xl p-4 space-y-4 transition-all ${
                voxSettings.enabled ? 'border-emerald-500/40' : 'border-slate-800 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className={`w-4 h-4 ${voxSettings.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="font-tactical font-bold text-white text-xs tracking-wider">
                      VOX MIC SENSITIVITY & TRIGGER THRESHOLD
                    </span>
                  </div>
                  <span className="font-code font-bold text-sm text-emerald-400">
                    {voxSettings.threshold}%
                  </span>
                </div>

                {/* Live VU Meter with Threshold Marker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-code text-slate-400">
                    <span>Current Input: {liveMicLevel}%</span>
                    <span>
                      {isTriggered ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          ABOVE THRESHOLD (TRIGGERED)
                        </span>
                      ) : (
                        <span className="text-slate-500">BELOW THRESHOLD (IDLE)</span>
                      )}
                    </span>
                  </div>

                  <div className="relative h-6 bg-slate-900 rounded-lg overflow-hidden border border-slate-800 p-0.5">
                    {/* Live Mic Level Fill */}
                    <div
                      className={`h-full rounded transition-all duration-75 ${
                        isTriggered
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-rose-500 shadow-lg'
                          : 'bg-gradient-to-r from-slate-700 to-emerald-700/60'
                      }`}
                      style={{ width: `${Math.min(100, liveMicLevel)}%` }}
                    ></div>

                    {/* Target Threshold Needle Line */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-md shadow-amber-500/50 z-10 transition-all pointer-events-none"
                      style={{ left: `${voxSettings.threshold}%` }}
                    >
                      <div className="w-2 h-2 bg-amber-400 rounded-full -ml-0.5 -mt-0.5 shadow"></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-code text-slate-500 px-0.5">
                    <span>0% (Whisper)</span>
                    <span className="text-amber-400 font-bold">▲ Threshold: {voxSettings.threshold}%</span>
                    <span>100% (Loud)</span>
                  </div>
                </div>

                {/* Slider Control */}
                <div className="pt-2">
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="1"
                    disabled={!voxSettings.enabled}
                    value={voxSettings.threshold}
                    onChange={(e) =>
                      onChangeVoxSettings({
                        ...voxSettings,
                        threshold: Number(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Higher Sensitivity (Easier Trigger)</span>
                    <span>Lower Sensitivity (Noisy Environments)</span>
                  </div>
                </div>
              </div>

              {/* Hang Time (Delay) Settings */}
              <div className={`bg-slate-950 border rounded-xl p-4 space-y-3 transition-all ${
                voxSettings.enabled ? 'border-slate-800' : 'border-slate-800 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="font-tactical font-bold text-white text-xs tracking-wider">
                        VOX HANG TIME (RELEASE DELAY)
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Duration PTT stays keyed after you pause speaking to avoid cutoffs between words.
                      </p>
                    </div>
                  </div>
                  <span className="font-code font-bold text-xs text-cyan-400">
                    {voxSettings.hangTimeMs}ms
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { label: 'Fast (Combat)', val: 400 },
                    { label: 'Standard', val: 700 },
                    { label: 'Long Delay', val: 1000 },
                    { label: 'Extended', val: 1400 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      disabled={!voxSettings.enabled}
                      onClick={() =>
                        onChangeVoxSettings({
                          ...voxSettings,
                          hangTimeMs: item.val,
                        })
                      }
                      className={`py-2 px-1.5 rounded-lg border text-xs font-code transition-all text-center ${
                        voxSettings.hangTimeMs === item.val
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 disabled:opacity-40'
                      }`}
                    >
                      <div>{item.val}ms</div>
                      <div className="text-[9px] opacity-75 font-tactical">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Operational Guide Info Box */}
              <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-slate-300 font-medium">VOX Tactical Best Practices:</p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-slate-400">
                    <li>Speak firmly into the microphone. Keep threshold above background room noise.</li>
                    <li>Manual spacebar or PTT button overrides VOX at any time.</li>
                    <li>To prevent echo loops, VOX temporarily pauses when receiving incoming audio.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & DSP FILTERS */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              {/* Web Audio DynamicsCompressorNode Noise Suppression */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-tactical font-black text-white text-base">
                        BACKGROUND NOISE SUPPRESSION
                      </span>
                      {noiseSuppression ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-tactical font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          COMPRESSOR ACTIVE
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-tactical">
                          BYPASSED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Filters out ambient background noise, computer fan hum, and room acoustics during PTT transmission using Web Audio API's <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-code">DynamicsCompressorNode</code>.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => onChangeNoiseSuppression(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-13 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                  </label>
                </div>

                {/* Compressor Specs & Real-Time Attenuation Visualizer */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-code text-slate-300">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      DSP Dynamics Parameters:
                    </span>
                    <span className="text-slate-400">
                      {noiseSuppression
                        ? isTransmitting
                          ? `Dynamic Attenuation: -${compressorReductionDb.toFixed(1)} dB`
                          : 'Monitoring Noise Floor'
                        : 'Filter Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-code text-slate-400">
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block">Threshold</span>
                      <span className="text-emerald-300 font-bold">-28.0 dB</span>
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block">Knee / Ratio</span>
                      <span className="text-emerald-300 font-bold">12dB / 12:1</span>
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block">Attack / Rel</span>
                      <span className="text-emerald-300 font-bold">3ms / 150ms</span>
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-slate-500 block">Sub-Bass Filter</span>
                      <span className="text-emerald-300 font-bold">85 Hz Highpass</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Modulation DSP Filter */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-tactical font-bold text-white text-xs tracking-wider">
                    VOICE MODULATION DSP FILTER
                  </span>
                  <span className="text-[11px] font-code text-emerald-400 font-bold uppercase">
                    {voiceModulation}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'standard', name: 'Standard Raw FM', desc: 'Natural unfiltered audio' },
                    { id: 'high-pitch', name: 'High-Pitch Tactical', desc: 'Crisp military comms filter' },
                    { id: 'low-pitch', name: 'Low-Pitch Radio', desc: 'Heavy radio dispatch filter' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeVoiceModulation(m.id as VoiceModulation)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        voiceModulation === m.id
                          ? 'bg-emerald-950/50 border-emerald-500 text-white shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-tactical font-bold text-xs text-emerald-400">{m.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Roger Beep Style Selector */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-tactical font-bold text-white text-xs tracking-wider">
                    ROGER BEEP TONE GENERATOR
                  </span>
                  <button
                    onClick={() => playRogerBeep(rogerBeep, volume * 0.4)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-code flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Test Sound
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'kenwood', name: 'Kenwood' },
                    { id: 'nasa', name: 'NASA Quindar' },
                    { id: 'motorola', name: 'Motorola' },
                    { id: 'tactical', name: 'Tri-Tone' },
                    { id: 'none', name: 'Off' },
                  ].map((beep) => (
                    <button
                      key={beep.id}
                      type="button"
                      onClick={() => {
                        onChangeRogerBeep(beep.id as RogerBeepStyle);
                        if (beep.id !== 'none') {
                          playRogerBeep(beep.id as RogerBeepStyle, volume * 0.4);
                        }
                      }}
                      className={`py-2 px-2 rounded-lg border text-center font-tactical text-xs transition-all ${
                        rogerBeep === beep.id
                          ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      {beep.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speaker Volume & Mute */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-tactical font-bold text-white text-xs tracking-wider">
                    SPEAKER MONITOR VOLUME
                  </span>
                  <button
                    onClick={onToggleMute}
                    className={`text-xs font-code flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
                      isMuted
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => onChangeVolume(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-code text-xs text-slate-300 w-12 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY & CHASSIS */}
          {activeTab === 'display' && (
            <div className="space-y-5">
              {/* Backlight Color Theme */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <span className="font-tactical font-bold text-white text-xs tracking-wider">
                  RADIO LCD BACKLIGHT COLOR THEME
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'green', name: 'Tactical Green', color: 'bg-emerald-500', border: 'border-emerald-500' },
                    { id: 'amber', name: 'Amber Glow', color: 'bg-amber-500', border: 'border-amber-500' },
                    { id: 'cyan', name: 'Cyber Cyan', color: 'bg-cyan-500', border: 'border-cyan-500' },
                    { id: 'red', name: 'Night Red', color: 'bg-rose-500', border: 'border-rose-500' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onChangeLcdTheme(theme.id as LcdColorTheme)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        lcdTheme === theme.id
                          ? `bg-slate-900 ${theme.border} ring-2 ring-emerald-500/20 shadow-md`
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${theme.color} shadow-lg`}></div>
                      <span className="font-tactical text-xs font-bold text-slate-200">
                        {theme.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Squelch & Feedback */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-tactical font-bold text-white text-xs tracking-wider">
                    KEY-UP CHIRP TEST
                  </span>
                  <button
                    onClick={() => playMicChirp(volume * 0.5)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-code flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Play Key-Up Tone
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Plays authentic radio squelch static and transmitter chirp whenever PTT is triggered.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-code flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>VOX ENGINE: {voxSettings.enabled ? 'ACTIVE (MONITORING)' : 'STANDBY'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-tactical font-bold text-xs tracking-wider transition-colors shadow-lg shadow-emerald-900/40"
          >
            DONE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
