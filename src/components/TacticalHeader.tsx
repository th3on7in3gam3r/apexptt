import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  Bell,
  Monitor,
  Smartphone,
  Columns,
  User,
  Check,
  Volume2,
  VolumeX,
  Navigation,
  Settings,
  Zap,
  Menu,
  X,
  Sliders,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ConnectionStatus, Channel } from '../types';

interface Props {
  connectionStatus: ConnectionStatus;
  latency?: number | null;
  currentChannel: Channel;
  e2eeEnabled: boolean;
  viewMode: 'handheld' | 'desktop' | 'dual';
  onChangeViewMode: (mode: 'handheld' | 'desktop' | 'dual') => void;
  onOpenE2eeModal: () => void;
  onOpenNotificationsModal: () => void;
  unreadNotificationsCount: number;
  queuedMessagesCount: number;
  callsign: string;
  onUpdateCallsign: (newCallsign: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenShareLocationModal: () => void;
  onOpenSettingsModal: () => void;
  voxEnabled?: boolean;
  onOpenChannelGroupingModal?: () => void;
}

export const TacticalHeader: React.FC<Props> = ({
  connectionStatus,
  latency,
  currentChannel,
  e2eeEnabled,
  viewMode,
  onChangeViewMode,
  onOpenE2eeModal,
  onOpenNotificationsModal,
  unreadNotificationsCount,
  queuedMessagesCount,
  callsign,
  onUpdateCallsign,
  isMuted,
  onToggleMute,
  onOpenShareLocationModal,
  onOpenSettingsModal,
  voxEnabled,
  onOpenChannelGroupingModal,
}) => {
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [tempCallsign, setTempCallsign] = useState(callsign);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Sync temp callsign if prop changes
  useEffect(() => {
    setTempCallsign(callsign);
  }, [callsign]);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleSaveCallsign = () => {
    if (tempCallsign.trim()) {
      onUpdateCallsign(tempCallsign.trim().toUpperCase());
    }
    setIsEditingCallsign(false);
  };

  const handleSelectPresetCallsign = (preset: string) => {
    onUpdateCallsign(preset);
    setTempCallsign(preset);
    setIsEditingCallsign(false);
  };

  const tacticalCallsignPresets = ['APEX-1', 'GHOST-7', 'ECHO-4', 'VIPER-2', 'BRAVO-6'];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md select-none text-slate-200 shadow-md">
        <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
          
          {/* LEFT: Tactical Brand & Active Channel Readout */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink">
            {/* Status Beacon & Radio Icon */}
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400'
                      : connectionStatus === 'offline'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
              </span>
            </div>

            {/* Brand Title & Frequency Display */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-tactical font-black text-xs sm:text-sm tracking-wider text-white">
                  APEX<span className="text-emerald-400">PTT</span>
                </span>
                <span className="hidden sm:inline text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-code">
                  VHF/UHF
                </span>
              </div>
              <div
                onClick={onOpenChannelGroupingModal}
                className={`text-[11px] text-slate-400 flex items-center gap-1.5 font-code mt-0.5 truncate ${
                  onOpenChannelGroupingModal ? 'cursor-pointer hover:text-emerald-300 transition-colors' : ''
                }`}
                title="Click to view and organize Channel Presets"
              >
                <span className="text-emerald-400 font-bold truncate">{currentChannel.name}</span>
                {currentChannel.group && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-tactical border border-slate-700/60 hidden sm:inline">
                    {currentChannel.group}
                  </span>
                )}
                <span className="opacity-40 shrink-0">·</span>
                <span className="text-slate-400 shrink-0">{currentChannel.frequency}</span>
              </div>
            </div>
          </div>

          {/* CENTER: Clean View Switcher (Desktop Full Tabs / Mobile Compact Switcher) */}
          <div className="flex items-center justify-center shrink-0">
            {/* Desktop / Tablet Segmented Tabs (hidden on small mobile screens) */}
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-tactical">
              <button
                onClick={() => onChangeViewMode('handheld')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'handheld'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Handheld Tactical Radio View"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Handheld</span>
              </button>
              <button
                onClick={() => onChangeViewMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'desktop'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop Companion Dispatch Console"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Companion</span>
              </button>
              <button
                onClick={() => onChangeViewMode('dual')}
                className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'dual'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Dual Split View (Both Mobile & Desktop Station)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Dual</span>
              </button>
            </div>

            {/* Mobile Compact View Toggle (visible only below md) */}
            <div className="flex md:hidden items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => onChangeViewMode('handheld')}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                  viewMode === 'handheld'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Handheld Radio"
                aria-label="Handheld Radio View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeViewMode('desktop')}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                  viewMode === 'desktop'
                    ? 'bg-emerald-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Desktop Companion"
                aria-label="Desktop Companion View"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT: Desktop Controls (md+) vs Mobile Compact Controls (<md) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* --- DESKTOP CONTROLS (Hidden on mobile < md) --- */}
            <div className="hidden md:flex items-center gap-2">
              {/* Callsign Editor */}
              <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                <User className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                {isEditingCallsign ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tempCallsign}
                      onChange={(e) => setTempCallsign(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCallsign()}
                      className="w-24 bg-slate-950 border border-emerald-500 rounded px-1.5 py-0.5 text-emerald-300 font-code text-xs focus:outline-none uppercase"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCallsign}
                      className="text-emerald-400 hover:text-white p-0.5"
                      title="Save Callsign"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setTempCallsign(callsign);
                      setIsEditingCallsign(true);
                    }}
                    className="font-code text-slate-300 hover:text-emerald-400 tracking-wider flex items-center gap-1"
                    title="Click to rename Callsign"
                  >
                    <span className="font-bold text-emerald-400">{callsign}</span>
                  </button>
                )}
              </div>

              {/* Share GPS Location Stamp */}
              <button
                onClick={onOpenShareLocationModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500 hover:text-emerald-300 transition-colors text-xs font-tactical"
                title="Share GPS Location Coordinates to Channel"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>GPS STAMP</span>
              </button>

              {/* E2EE Shield Status Button */}
              <button
                onClick={onOpenE2eeModal}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-tactical tracking-wider transition-all ${
                  e2eeEnabled
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
                title="Configure End-to-End Encryption"
              >
                {e2eeEnabled ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>AES-256</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>CLEAR VHF</span>
                  </>
                )}
              </button>
            </div>

            {/* --- SHARED BUTTONS (Both Mobile & Desktop): Mute & Notifications --- */}
            {/* Mute Toggle (Instant Field Silence) */}
            <button
              onClick={onToggleMute}
              className={`p-2 sm:p-1.5 rounded-lg border text-xs transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ${
                isMuted
                  ? 'bg-rose-950/80 border-rose-600/70 text-rose-300 shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Offline Status & Outbox Bell */}
            <button
              onClick={onOpenNotificationsModal}
              className={`relative p-2 sm:p-1.5 rounded-lg border text-xs transition-all min-h-[38px] min-w-[38px] flex items-center justify-center ${
                connectionStatus === 'offline'
                  ? 'bg-rose-950/80 border-rose-600/60 text-rose-300 animate-pulse'
                  : queuedMessagesCount > 0
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title="Connection Status & Offline Outbox"
              aria-label="Connection Status and Notifications"
            >
              {connectionStatus === 'offline' ? (
                <WifiOff className="w-4 h-4 text-rose-400" />
              ) : (
                <Bell className="w-4 h-4" />
              )}

              {queuedMessagesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {queuedMessagesCount}
                </span>
              )}
              {queuedMessagesCount === 0 && unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 w-2 h-2 rounded-full" />
              )}
            </button>

            {/* Desktop Settings Shortcut */}
            <button
              onClick={onOpenSettingsModal}
              className={`hidden md:flex relative p-1.5 rounded-lg border text-xs transition-all items-center gap-1 min-h-[34px] ${
                voxEnabled
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title="Radio Settings & VOX Voice Activation"
            >
              <Settings className="w-4 h-4" />
              {voxEnabled && (
                <span className="text-[10px] font-tactical font-bold text-emerald-400 pr-0.5">
                  VOX
                </span>
              )}
              {voxEnabled && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>

            {/* --- MOBILE TACTICAL MENU BUTTON (Only visible below md) --- */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden relative p-2 rounded-lg border transition-all min-h-[38px] min-w-[38px] flex items-center justify-center ${
                isMobileMenuOpen
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              aria-label="Toggle Tactical Mobile Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
              {/* Feature indicator pips */}
              {(e2eeEnabled || voxEnabled) && !isMobileMenuOpen && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-2 ring-slate-950" />
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* --- MOBILE TACTICAL ACTION SHEET / DRAWER (Below md) --- */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 top-14 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-down Tactical Panel */}
          <div
            ref={mobileMenuRef}
            className="fixed top-14 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800 backdrop-blur-2xl shadow-2xl p-4 space-y-4 md:hidden animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            {/* Panel Header Banner */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-tactical font-bold uppercase tracking-wider text-slate-400">
                  TACTICAL FIELD CONTROLS
                </span>
                <span className="text-[10px] text-emerald-400 font-code font-bold">
                  {currentChannel.name} ({currentChannel.frequency})
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close Mobile Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Operator Callsign Section */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-tactical text-slate-400">
                <span className="flex items-center gap-1.5 font-bold">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  OPERATOR CALLSIGN
                </span>
                <span className="text-[11px] font-code text-emerald-400 font-bold">
                  {callsign}
                </span>
              </div>

              {/* Callsign Input & Action */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempCallsign}
                  onChange={(e) => setTempCallsign(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCallsign()}
                  placeholder="ENTER CALLSIGN"
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-emerald-300 font-code font-bold text-xs uppercase focus:outline-none"
                />
                <button
                  onClick={handleSaveCallsign}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-tactical font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SET</span>
                </button>
              </div>

              {/* Quick Tactical Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-tactical mr-1">PRESETS:</span>
                {tacticalCallsignPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleSelectPresetCallsign(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-code transition-colors ${
                      callsign === preset
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Tactical Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-tactical">
              {/* E2EE Toggle Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenE2eeModal();
                }}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left ${
                  e2eeEnabled
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  {e2eeEnabled ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Shield className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-[10px] font-code uppercase px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                    {e2eeEnabled ? 'SECURE' : 'CLEAR'}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-white tracking-wide">ENCRYPTION</div>
                  <div className="text-[10px] text-slate-400">
                    {e2eeEnabled ? 'AES-256 E2EE Enabled' : 'Clear VHF (No Crypto)'}
                  </div>
                </div>
              </button>

              {/* GPS Stamp Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenShareLocationModal();
                }}
                className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/50 flex flex-col items-start gap-1.5 transition-all text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-code uppercase px-1.5 py-0.5 rounded bg-black/40 text-emerald-400">
                    GPS
                  </span>
                </div>
                <div>
                  <div className="font-bold text-white tracking-wide">LOCATION STAMP</div>
                  <div className="text-[10px] text-slate-400">Send Grid Coordinates</div>
                </div>
              </button>

              {/* Channel Presets & Grouping Modal Button */}
              {onOpenChannelGroupingModal && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenChannelGroupingModal();
                  }}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900 hover:border-emerald-500/60 text-slate-300 hover:text-white flex flex-col items-start gap-1.5 transition-all text-left col-span-2"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white tracking-wide">
                        CHANNEL PRESETS & GROUPING
                      </span>
                    </div>
                    {currentChannel.group && (
                      <span className="text-[10px] font-tactical font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                        {currentChannel.group}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Organize frequencies into presets like Team Alpha, Emergency Services & Tactical Ops
                  </div>
                </button>
              )}

              {/* Radio DSP & VOX Settings Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSettingsModal();
                }}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left col-span-2 ${
                  voxEnabled
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white tracking-wide">
                      RADIO CONFIGURATION & DSP
                    </span>
                  </div>
                  {voxEnabled && (
                    <span className="text-[10px] font-tactical font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" /> VOX ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Noise Suppression, VOX Sensitivity, LCD Themes & Roger Beep Sound FX
                </div>
              </button>
            </div>

            {/* View Mode Detailed Switcher */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="text-xs font-tactical font-bold text-slate-400 uppercase tracking-wider block">
                DEVICE VIEW MODE
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-tactical">
                <button
                  onClick={() => {
                    onChangeViewMode('handheld');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 transition-all ${
                    viewMode === 'handheld'
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div>Handheld Radio</div>
                    <div className="text-[9px] opacity-75 font-normal">Physical Chassis</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onChangeViewMode('desktop');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-lg border flex items-center gap-2 transition-all ${
                    viewMode === 'desktop'
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div>Companion Console</div>
                    <div className="text-[9px] opacity-75 font-normal">Logs & Multi-Track</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Offline Status & Message Summary Footer */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-code">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="uppercase">
                  {connectionStatus === 'connected' && latency !== null && latency !== undefined
                    ? `ONLINE • ${latency}ms`
                    : connectionStatus}
                </span>
              </div>
              {queuedMessagesCount > 0 ? (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenNotificationsModal();
                  }}
                  className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <WifiOff className="w-3 h-3" />
                  <span>{queuedMessagesCount} Queued Offline</span>
                </button>
              ) : (
                <span className="text-slate-500">Signal Low Latency</span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
