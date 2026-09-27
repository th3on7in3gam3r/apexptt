import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Shield,
  ShieldCheck,
  BatteryCharging,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCw,
  Lock,
  Unlock,
  Sliders,
  Users,
  Sparkles,
  Navigation,
  MapPin,
  Zap,
  Settings,
  Layers,
  Folder,
} from 'lucide-react';
import { Channel, Member, ConnectionStatus, LcdColorTheme, RogerBeepStyle, VoiceModulation, VoiceMessage, VoxSettings } from '../types';
import { playChannelSwitchClick, playSquelchStatic } from '../utils/audioEngine';
import { TacticalMapPreview } from './TacticalMapPreview';
import { TacticalSignalMeter } from './TacticalSignalMeter';

interface Props {
  currentChannel: Channel;
  channels: Channel[];
  onSelectChannel: (channelId: string) => void;
  members: Member[];
  isTransmitting: boolean;
  isReceiving: boolean;
  receivingCallsign?: string;
  onPttDown: () => void;
  onPttUp: () => void;
  connectionStatus: ConnectionStatus;
  latency?: number | null;
  e2eeEnabled: boolean;
  lcdTheme: LcdColorTheme;
  onChangeLcdTheme: (theme: LcdColorTheme) => void;
  rogerBeep: RogerBeepStyle;
  onChangeRogerBeep: (beep: RogerBeepStyle) => void;
  voiceModulation: VoiceModulation;
  onChangeVoiceModulation: (modulation: VoiceModulation) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  onOpenSos: () => void;
  audioLevels: number;
  waveformBars: number[];
  micAllowed: boolean;
  onOpenShareLocationModal: () => void;
  latestLocationMessage?: VoiceMessage;
  voxSettings?: VoxSettings;
  onToggleVox?: () => void;
  onOpenSettings?: () => void;
  isVoxActive?: boolean;
  isScanning?: boolean;
  onToggleScan?: () => void;
  scanCountdown?: number;
  isScanPaused?: boolean;
  scanPausedReason?: 'traffic' | 'transmitting' | null;
  availableGroups?: string[];
  onOpenChannelGroupingModal?: () => void;
}

export const HandheldWalkieTalkie: React.FC<Props> = ({
  currentChannel,
  channels,
  onSelectChannel,
  members,
  isTransmitting,
  isReceiving,
  receivingCallsign,
  onPttDown,
  onPttUp,
  connectionStatus,
  latency,
  e2eeEnabled,
  lcdTheme,
  onChangeLcdTheme,
  rogerBeep,
  onChangeRogerBeep,
  voiceModulation,
  onChangeVoiceModulation,
  volume,
  onChangeVolume,
  onOpenSos,
  audioLevels,
  waveformBars,
  micAllowed,
  onOpenShareLocationModal,
  latestLocationMessage,
  voxSettings,
  onToggleVox,
  onOpenSettings,
  isVoxActive,
  isScanning = false,
  onToggleScan,
  scanCountdown = 5,
  isScanPaused = false,
  scanPausedReason = null,
  availableGroups = ['Team Alpha', 'Emergency Services', 'Tactical Operations', 'Security & Patrol'],
  onOpenChannelGroupingModal,
}) => {
  const [isLatchedPtt, setIsLatchedPtt] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [showMapDrawer, setShowMapDrawer] = useState(false);
  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');

  // Channel knob step
  const handleNextChannel = () => {
    playChannelSwitchClick(0.35);
    const currentIndex = channels.findIndex((c) => c.id === currentChannel.id);
    const nextIndex = (currentIndex + 1) % channels.length;
    onSelectChannel(channels[nextIndex].id);
  };

  const handlePrevChannel = () => {
    playChannelSwitchClick(0.35);
    const currentIndex = channels.findIndex((c) => c.id === currentChannel.id);
    const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
    onSelectChannel(channels[prevIndex].id);
  };

  const handleToggleLatchedPtt = () => {
    if (isTransmitting) {
      onPttUp();
      setIsLatchedPtt(false);
    } else {
      setIsLatchedPtt(true);
      onPttDown();
    }
  };

  const handleTestSquelch = () => {
    playSquelchStatic(250, volume);
  };

  // LCD theme styles
  const lcdClasses = {
    green: 'lcd-green border-emerald-900/60',
    amber: 'lcd-amber border-amber-900/60',
    cyan: 'lcd-cyan border-cyan-900/60',
    red: 'lcd-red border-rose-900/60',
  }[lcdTheme];

  const onlineMembers = members.filter((m) => Date.now() - m.lastSeen < 60000);

  return (
    <div className="relative mx-auto flex flex-col items-center select-none py-2 px-2 max-w-sm w-full">
      {/* ANTENNA & ROTARY KNOBS HEADER */}
      <div className="w-[88%] flex items-end justify-between px-3 -mb-1 relative z-10">
        {/* Antenna */}
        <div className="flex flex-col items-center">
          <div className="w-2.5 h-16 bg-gradient-to-r from-slate-700 via-slate-500 to-slate-800 rounded-t-full shadow-lg border-x border-t border-slate-600 relative">
            {/* Antenna ribbing */}
            <div className="w-full h-1 bg-slate-900 absolute top-4"></div>
            <div className="w-full h-1 bg-slate-900 absolute top-8"></div>
            <div className="w-full h-1 bg-slate-900 absolute top-12"></div>
            {/* RF wave animation when transmitting/receiving */}
            {(isTransmitting || isReceiving) && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-5 w-5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTransmitting ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-5 w-5 ${isTransmitting ? 'bg-red-500/50' : 'bg-emerald-500/50'}`}></span>
              </span>
            )}
          </div>
          <div className="w-5 h-3 bg-slate-800 rounded-t border-t border-slate-600"></div>
        </div>

        {/* Rotary Knobs */}
        <div className="flex items-end gap-3 pb-1">
          {/* Channel Knob */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-tactical text-slate-400 font-bold uppercase mb-0.5">CH-SEL</span>
            <div
              onClick={handleNextChannel}
              className="w-10 h-7 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-t-md border-t border-x border-slate-600 flex items-center justify-center cursor-pointer hover:brightness-110 active:scale-95 shadow-md group relative"
              title="Rotate Channel Selector"
            >
              <div className="w-1 h-4 bg-emerald-400/80 rounded-full group-hover:bg-emerald-300"></div>
            </div>
          </div>

          {/* Volume Knob */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-tactical text-slate-400 font-bold uppercase mb-0.5">VOL / PWR</span>
            <div
              onClick={() => onChangeVolume(volume > 0.8 ? 0.3 : volume + 0.3)}
              className="w-10 h-7 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-t-md border-t border-x border-slate-600 flex items-center justify-center cursor-pointer hover:brightness-110 active:scale-95 shadow-md relative"
              title={`Volume: ${Math.round(volume * 100)}% (Click to toggle)`}
            >
              <div
                className="w-1 h-4 bg-amber-400 rounded-full transition-transform"
                style={{ transform: `rotate(${(volume - 0.5) * 80}deg)` }}
              ></div>
            </div>
          </div>

          {/* Emergency SOS Cover & Button */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-tactical text-rose-400 font-bold uppercase mb-0.5 animate-pulse">EMERG</span>
            <button
              type="button"
              onClick={onOpenSos}
              className="w-9 h-7 bg-gradient-to-b from-rose-700 to-rose-900 rounded-t-md border-t border-x border-rose-500 flex items-center justify-center cursor-pointer hover:brightness-125 active:scale-95 shadow-md shadow-rose-950"
              title="Priority SOS Distress Beacon"
            >
              <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
            </button>
          </div>
        </div>
      </div>

      {/* RUGGED RADIO CHASSIS MAIN BODY */}
      <div className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-3xl border-2 border-slate-700 shadow-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
        {/* Rubberized side grip accents */}
        <div className="absolute top-8 left-0 bottom-8 w-2 knurled-grip border-r border-slate-800/80 rounded-r"></div>
        <div className="absolute top-8 right-0 bottom-8 w-2 knurled-grip border-l border-slate-800/80 rounded-l"></div>

        {/* Top Radio Brand Plate */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-tactical font-black text-xs tracking-wider text-slate-300">
              APEX <span className="text-emerald-400">MIL-SPEC</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-code text-slate-400">
            <span>TX/RX 5W</span>
            <span>•</span>
            <div className="flex items-center gap-0.5 text-emerald-400">
              <BatteryCharging className="w-3.5 h-3.5" />
              <span>98%</span>
            </div>
          </div>
        </div>

        {/* HIGH-CONTRAST BACKLIT LCD SCREEN */}
        <div className={`w-full rounded-xl border-2 p-3 font-code relative overflow-hidden shadow-inner ${lcdClasses}`}>
          {/* CRT Scanline Overlay */}
          <div className="scanline-overlay absolute inset-0"></div>

          {/* LCD Top Bar */}
          <div className="flex items-center justify-between text-[11px] font-bold tracking-wider relative z-10 border-b border-current/20 pb-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-tactical uppercase">CH-{currentChannel.id.toUpperCase()}</span>
              {currentChannel.isEmergency && (
                <span className="bg-red-500/20 text-red-400 px-1 py-0.2 rounded text-[9px] animate-pulse">EMERG</span>
              )}
              {voiceModulation !== 'standard' && (
                <span className={`text-[9px] px-1 py-0.2 rounded border font-code ${
                  voiceModulation === 'high-pitch' ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40'
                }`}>
                  {voiceModulation === 'high-pitch' ? 'DSP:HI-COMMS' : 'DSP:LO-RADIO'}
                </span>
              )}
              {voxSettings?.enabled && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-tactical font-bold flex items-center gap-0.5 ${
                  isVoxActive
                    ? 'bg-rose-500/30 text-rose-300 border-rose-400 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  <Zap className="w-2.5 h-2.5" />
                  VOX {voxSettings.threshold}%
                </span>
              )}
              {isScanning && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-tactical font-bold flex items-center gap-1 ${
                  isScanPaused
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 animate-pulse'
                    : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40'
                }`}>
                  <RotateCw className={`w-2.5 h-2.5 ${!isScanPaused ? 'animate-spin' : ''}`} />
                  {isScanPaused
                    ? scanPausedReason === 'traffic'
                      ? 'SCAN: AUDIO DETECTED'
                      : 'SCAN: TX HOLD'
                    : `SCAN ${scanCountdown}s`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {e2eeEnabled ? (
                  <span className="flex items-center gap-0.5 text-[9px]">
                    <ShieldCheck className="w-3 h-3" /> E2EE
                  </span>
                ) : (
                  <span className="text-[9px] opacity-70">CLR</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {connectionStatus === 'connected' ? (
                  <Wifi className="w-3 h-3 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400 animate-pulse" />
                )}
                <span className="text-[9px] uppercase font-mono">
                  {connectionStatus === 'connected' && latency !== null && latency !== undefined
                    ? `${latency}ms`
                    : connectionStatus}
                </span>
              </div>
            </div>
          </div>

          {/* LCD Main Frequency Display (Click to open Channel Presets) */}
          <div
            onClick={() => setShowChannelDrawer(!showChannelDrawer)}
            className="relative z-10 py-1 cursor-pointer group hover:bg-black/20 rounded p-1 -mx-1 transition-all"
            title="Click to toggle Channel Presets & Selection"
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-tactical">
              <span className="opacity-70 tracking-widest truncate max-w-[65%]">{currentChannel.name}</span>
              {currentChannel.group && (
                <span className="text-[8.5px] px-1.5 py-0.2 rounded border border-current/30 font-tactical font-bold flex items-center gap-1 shrink-0">
                  <Layers className="w-2.5 h-2.5" />
                  {currentChannel.group}
                </span>
              )}
            </div>
            <div className="text-2xl font-black font-tactical tracking-wider flex items-baseline justify-between">
              <span className="group-hover:text-emerald-300 transition-colors">{currentChannel.frequency}</span>
              <div className="flex items-center gap-1 text-xs font-code opacity-80">
                <span>FM / 12.5k</span>
                <span className="text-[9px] px-1 bg-black/40 rounded border border-current/25 font-tactical font-bold">PRESETS ▾</span>
              </div>
            </div>
          </div>

          {/* Real-time Dynamic S-Meter / RSSI Signal Strength Display */}
          <TacticalSignalMeter
            connectionStatus={connectionStatus}
            latency={latency}
            isTransmitting={isTransmitting}
            isReceiving={isReceiving}
            audioLevels={audioLevels}
            lcdTheme={lcdTheme}
          />

          {/* Real-time Transmission Status Readout */}
          <div className="relative z-10 pt-1.5 flex items-center justify-between text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              {isTransmitting ? (
                <div className="flex items-center gap-1.5 text-red-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="font-tactical tracking-wider">TX &gt; TRANSMITTING</span>
                </div>
              ) : isReceiving ? (
                <div className="flex items-center gap-1.5 text-emerald-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-tactical tracking-wider">RX &lt; {receivingCallsign || 'TEAM'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 opacity-60">
                  <span className="w-2 h-2 rounded-full bg-current opacity-40"></span>
                  <span className="font-tactical tracking-wider">STANDBY • SQUELCH ON</span>
                </div>
              )}
            </div>

            {/* Audio Waveform Spectrum mini display */}
            <div className="flex items-end gap-0.5 h-3">
              {(isTransmitting || isReceiving ? waveformBars : [20, 40, 15, 60, 30, 75, 45, 20]).slice(0, 8).map((bar, i) => (
                <div
                  key={i}
                  className="w-1 bg-current rounded-xs transition-all duration-75"
                  style={{
                    height: `${isTransmitting || isReceiving ? Math.max(15, bar) : 25}%`,
                    opacity: isTransmitting || isReceiving ? 0.95 : 0.35,
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* LCD QUICK ACTION BUTTONS ROW */}
        <div className="grid grid-cols-6 gap-1 text-slate-300 font-tactical text-[8.5px] font-bold">
          <button
            onClick={() => setShowChannelDrawer(!showChannelDrawer)}
            className={`py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center transition-all ${
              showChannelDrawer
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
            }`}
            title="Channel Presets & Grouping Matrix"
          >
            <Layers className="w-3.5 h-3.5 mb-0.5 text-emerald-400" />
            <span>CH/GRP</span>
          </button>

          <button
            onClick={onToggleScan}
            className={`py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center transition-all ${
              isScanning
                ? isScanPaused
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow animate-pulse'
                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle 5-second automatic channel scanning (pauses when audio traffic detected)"
          >
            <RotateCw className={`w-3.5 h-3.5 mb-0.5 ${isScanning && !isScanPaused ? 'animate-spin' : ''}`} />
            <span>
              {isScanning
                ? isScanPaused
                  ? 'PAUSED'
                  : `SCAN ${scanCountdown}s`
                : 'SCAN'}
            </span>
          </button>

          <button
            onClick={onOpenShareLocationModal}
            className="py-1.5 px-0.5 rounded-lg border bg-emerald-950/60 border-emerald-500/50 hover:bg-emerald-900/60 text-emerald-300 flex flex-col items-center justify-center transition-all shadow"
            title="Share GPS Location Coordinates to Channel"
          >
            <Navigation className="w-3.5 h-3.5 mb-0.5 text-emerald-400" />
            <span>GPS</span>
          </button>

          <button
            onClick={() => {
              if (latestLocationMessage?.location) {
                setShowMapDrawer(!showMapDrawer);
              } else {
                onOpenShareLocationModal();
              }
            }}
            className={`py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center transition-all relative ${
              showMapDrawer
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : latestLocationMessage?.location
                ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400 hover:bg-slate-700'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
            }`}
            title={latestLocationMessage?.location ? 'View Map Preview' : 'Share Location'}
          >
            <MapPin className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
            <span>MAP</span>
            {latestLocationMessage?.location && !showMapDrawer && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => {
              const themes: LcdColorTheme[] = ['green', 'amber', 'cyan', 'red'];
              const next = themes[(themes.indexOf(lcdTheme) + 1) % themes.length];
              onChangeLcdTheme(next);
            }}
            className="py-1.5 px-0.5 rounded-lg border bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300 flex flex-col items-center justify-center transition-all"
            title="Change LCD Backlight Color"
          >
            <Sparkles className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
            <span>COLOR</span>
          </button>

          <button
            onClick={() => setShowMembersDrawer(!showMembersDrawer)}
            className={`py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center transition-all relative ${
              showMembersDrawer
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
            }`}
            title="Active Channel Operators"
          >
            <Users className="w-3.5 h-3.5 mb-0.5" />
            <span>UNITS ({onlineMembers.length})</span>
          </button>
        </div>

        {/* CHANNEL SELECTION & PRESETS DRAWER */}
        {showChannelDrawer && (
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="font-tactical font-bold text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Layers className="w-3.5 h-3.5" />
                CHANNEL PRESETS
              </span>
              <div className="flex items-center gap-2">
                {onOpenChannelGroupingModal && (
                  <button
                    onClick={() => {
                      onOpenChannelGroupingModal();
                      setShowChannelDrawer(false);
                    }}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Manage Groups</span>
                  </button>
                )}
                <button
                  onClick={() => setShowChannelDrawer(false)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Presets Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 text-[9.5px] font-tactical scrollbar-none">
              <button
                onClick={() => setSelectedGroupFilter('ALL')}
                className={`px-2 py-0.5 rounded transition-all shrink-0 ${
                  selectedGroupFilter === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ALL
              </button>
              {availableGroups.map((grp) => {
                const count = channels.filter((c) => (c.group || 'General') === grp).length;
                return (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={`px-2 py-0.5 rounded transition-all shrink-0 flex items-center gap-1 ${
                      selectedGroupFilter === grp
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{grp}</span>
                    <span className="opacity-70 font-code text-[8.5px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Filtered Channel List */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {channels
                .filter((ch) => {
                  if (selectedGroupFilter === 'ALL') return true;
                  return (ch.group || 'General') === selectedGroupFilter;
                })
                .map((ch) => {
                  const isActive = ch.id === currentChannel.id;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => {
                        playChannelSwitchClick(0.35);
                        onSelectChannel(ch.id);
                        setShowChannelDrawer(false);
                      }}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isActive
                          ? ch.isEmergency
                            ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                            : 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isActive ? (ch.isEmergency ? 'bg-rose-500 animate-ping' : 'bg-emerald-400') : 'bg-slate-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="font-tactical font-bold truncate flex items-center gap-1.5">
                            <span>{ch.name}</span>
                            {ch.isEmergency && (
                              <span className="text-[8px] bg-rose-600 text-white px-1 py-0.2 rounded font-code">
                                SOS
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-code opacity-70 truncate">{ch.frequency}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-code px-1.5 py-0.5 rounded shrink-0 ${
                          isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'TUNE'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TACTICAL MAP PREVIEW COLLAPSIBLE DRAWER */}
        {showMapDrawer && latestLocationMessage?.location && (
          <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-2.5 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="font-tactical font-bold text-white mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Navigation className="w-3.5 h-3.5" />
                TACTICAL GPS RADAR PREVIEW
              </span>
              <button
                onClick={() => setShowMapDrawer(false)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Hide
              </button>
            </div>
            <TacticalMapPreview
              location={latestLocationMessage.location}
              callsign={latestLocationMessage.callsign}
              timestamp={latestLocationMessage.timestamp}
            />
          </div>
        )}

        {/* ACTIVE OPERATORS COLLAPSIBLE LIST */}
        {showMembersDrawer && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="font-tactical font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>ACTIVE IN {currentChannel.name.toUpperCase()}</span>
              <span className="text-[10px] text-emerald-400">{onlineMembers.length} ACTIVE</span>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {onlineMembers.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-1">No other units currently on this channel.</div>
              ) : (
                onlineMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${member.isTransmitting ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                      <span className="font-code font-bold text-slate-200">{member.callsign}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase font-code">
                      {member.isTransmitting ? 'TRANSMITTING' : member.deviceType}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SPEAKER GRILLE */}
        <div className="w-full h-14 speaker-grille-pattern rounded-xl border border-slate-800 relative flex items-center justify-center shadow-inner overflow-hidden">
          <div
            className={`w-12 h-12 rounded-full border border-slate-700/60 transition-transform ${
              isReceiving ? 'scale-110 bg-emerald-500/10 border-emerald-500/30' : ''
            }`}
          ></div>
        </div>

        {/* GIANT TACTICAL PUSH-TO-TALK BUTTON */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="w-full flex items-center justify-between px-2 text-[11px] text-slate-400 font-tactical">
            <span>HOLD TO TRANSMIT</span>
            <div className="flex items-center gap-1.5">
              {onToggleScan && (
                <button
                  type="button"
                  onClick={onToggleScan}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                    isScanning
                      ? isScanPaused
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse'
                        : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle 5-second channel scan"
                >
                  <RotateCw className={`w-3 h-3 ${isScanning && !isScanPaused ? 'animate-spin' : ''}`} />
                  <span>
                    {isScanning
                      ? isScanPaused
                        ? 'SCAN (PAUSED)'
                        : `SCAN (${scanCountdown}s)`
                      : 'SCAN'}
                  </span>
                </button>
              )}
              {voxSettings && onToggleVox && (
                <button
                  type="button"
                  onClick={onToggleVox}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                    voxSettings.enabled
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle VOX (Voice Activated Transmission)"
                >
                  <Zap className={`w-3 h-3 ${voxSettings.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>VOX {voxSettings.enabled ? 'ON' : 'OFF'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleLatchedPtt}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  isLatchedPtt
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {isLatchedPtt ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {isLatchedPtt ? 'LATCHED (ON)' : 'LATCH LOCK'}
              </button>
            </div>
          </div>

          {/* PTT Main Button */}
          <div className="w-full relative">
            <button
              type="button"
              onMouseDown={() => {
                if (!isLatchedPtt) onPttDown();
              }}
              onMouseUp={() => {
                if (!isLatchedPtt) onPttUp();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (!isLatchedPtt) onPttDown();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (!isLatchedPtt) onPttUp();
              }}
              disabled={connectionStatus === 'offline' && !micAllowed}
              className={`w-full py-7 rounded-2xl font-tactical font-black text-xl tracking-widest flex flex-col items-center justify-center transition-all cursor-pointer relative select-none border-2 shadow-2xl active:scale-[0.98] ${
                isTransmitting
                  ? 'bg-gradient-to-b from-red-600 to-rose-800 border-red-400 text-white ptt-glow-transmitting'
                  : isReceiving
                  ? 'bg-gradient-to-b from-emerald-700 to-teal-900 border-emerald-400 text-emerald-100 ptt-glow-receiving'
                  : 'bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 border-slate-600 hover:border-slate-500 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isTransmitting ? (
                  <Mic className="w-7 h-7 text-white animate-pulse" />
                ) : isReceiving ? (
                  <Volume2 className="w-7 h-7 text-emerald-300 animate-bounce" />
                ) : (
                  <Radio className="w-6 h-6 text-slate-400" />
                )}
                <span>
                  {isTransmitting
                    ? isVoxActive
                      ? 'VOX TRANSMITTING (AUTO)'
                      : 'TRANSMITTING VOICE'
                    : isReceiving
                    ? `RECEIVING [${receivingCallsign || 'INCOMING'}]`
                    : voxSettings?.enabled
                    ? 'PUSH TO TALK (VOX ARMED)'
                    : 'PUSH TO TALK'}
                </span>
              </div>
              <span className="text-[10px] font-sans font-normal opacity-70 tracking-normal mt-1 flex items-center gap-1">
                {voxSettings?.enabled ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Voice Activation Active (Threshold: {voxSettings.threshold}%) or hold
                  </span>
                ) : (
                  <span>Hold mouse, tap touch, or press</span>
                )}
                <kbd className="bg-black/40 px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-code">SPACEBAR</kbd>
              </span>
            </button>
          </div>
        </div>

        {/* Roger Beep, Modulation & Settings Controls */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 px-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-tactical uppercase font-bold text-slate-400">Modulation:</span>
              <select
                value={voiceModulation}
                onChange={(e) => onChangeVoiceModulation(e.target.value as VoiceModulation)}
                className="bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-[11px] text-emerald-300 font-sans focus:outline-none"
              >
                <option value="standard">Standard Raw FM</option>
                <option value="high-pitch">High-Pitch (Tactical Comms)</option>
                <option value="low-pitch">Low-Pitch (Heavy Radio)</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-tactical uppercase font-bold text-slate-400">Roger:</span>
              <select
                value={rogerBeep}
                onChange={(e) => onChangeRogerBeep(e.target.value as RogerBeepStyle)}
                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 font-sans focus:outline-none"
              >
                <option value="kenwood">Kenwood</option>
                <option value="nasa">NASA</option>
                <option value="motorola">Motorola</option>
                <option value="tactical">Tri-tone</option>
                <option value="none">Off</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[10px] font-tactical font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                title="Open Tactical Settings & VOX Calibration"
              >
                <Settings className="w-3 h-3 text-emerald-400" />
                <span>SETTINGS</span>
              </button>
            )}
            <div className="text-[10px] font-code text-slate-500">
              DSP ACTIVE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
