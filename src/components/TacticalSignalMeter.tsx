import React, { useState, useEffect, useRef } from 'react';
import { Radio, Activity, Wifi, WifiOff, Zap } from 'lucide-react';
import { ConnectionStatus, LcdColorTheme } from '../types';

interface TacticalSignalMeterProps {
  connectionStatus: ConnectionStatus;
  latency?: number | null;
  isTransmitting?: boolean;
  isReceiving?: boolean;
  audioLevels?: number;
  lcdTheme?: LcdColorTheme;
  className?: string;
}

export const TacticalSignalMeter: React.FC<TacticalSignalMeterProps> = ({
  connectionStatus,
  latency,
  isTransmitting = false,
  isReceiving = false,
  audioLevels = 0,
  lcdTheme = 'green',
  className = '',
}) => {
  // Meter bars: 14 distinct tactical segments
  // Segments 0..7 = S1 to S7 (normal RF band)
  // Segments 8..10 = S8 to S9 (high signal band)
  // Segments 11..13 = +10dB to +30dB (peak RF overdrive / forward transmit power)
  const TOTAL_BARS = 14;

  const [activeBars, setActiveBars] = useState<number>(10);
  const [peakBar, setPeakBar] = useState<number>(10);
  const [rssiDisplay, setRssiDisplay] = useState<string>('-64.2 dBm');
  const [sUnitDisplay, setSUnitDisplay] = useState<string>('S9');
  const [snrDisplay, setSnrDisplay] = useState<number>(32);
  const [carrierText, setCarrierText] = useState<string>('SQL: AUTO • LOCK 5x5');
  const [sweepPos, setSweepPos] = useState<number>(0);
  const [sweepDir, setSweepDir] = useState<number>(1);

  const peakDecayTimerRef = useRef<any>(null);
  const lastLatencyRef = useRef<number>(35);

  // Update last known latency
  useEffect(() => {
    if (typeof latency === 'number' && latency > 0) {
      lastLatencyRef.current = latency;
    }
  }, [latency]);

  // Radar sweep effect for connecting / reconnecting states
  useEffect(() => {
    if (connectionStatus !== 'connecting' && connectionStatus !== 'reconnecting') return;

    const interval = setInterval(() => {
      setSweepPos((prev) => {
        let next = prev + sweepDir;
        if (next >= TOTAL_BARS - 1) {
          setSweepDir(-1);
          next = TOTAL_BARS - 1;
        } else if (next <= 0) {
          setSweepDir(1);
          next = 0;
        }
        return next;
      });
    }, 85);

    return () => clearInterval(interval);
  }, [connectionStatus, sweepDir]);

  // Peak hold decay timer: slowly steps down peak bar
  useEffect(() => {
    peakDecayTimerRef.current = setInterval(() => {
      setPeakBar((prev) => {
        if (prev > activeBars) {
          return prev - 1;
        }
        return activeBars;
      });
    }, 1100);

    return () => {
      if (peakDecayTimerRef.current) clearInterval(peakDecayTimerRef.current);
    };
  }, [activeBars]);

  // Real-time signal fluctuation and RF propagation flutter loop
  useEffect(() => {
    if (connectionStatus === 'offline') {
      setActiveBars(0);
      setPeakBar(0);
      setRssiDisplay('--- dBm');
      setSUnitDisplay('S0');
      setCarrierText('SQL: CLOSED • NO CARRIER');
      setSnrDisplay(0);
      return;
    }

    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
      setRssiDisplay('ACQ SIG...');
      setSUnitDisplay('SYNC');
      setCarrierText('SQL: HUNTING CARRIER FREQ');
      setSnrDisplay(Math.floor(Math.random() * 6) + 5);
      return;
    }

    // Connection is 'connected'
    const updateRfSignal = () => {
      if (isTransmitting) {
        // Transmitter RF Output Power Mode (PO Meter): 5.0W Forward Power
        const txMicroFlutter = audioLevels > 35 ? 14 : Math.random() > 0.3 ? 14 : 13;
        setActiveBars(txMicroFlutter);
        setPeakBar(14);
        setRssiDisplay('PO: 5.0W');
        setSUnitDisplay('TX 5W');
        setCarrierText('SQL: TX ON • FWD POWER MAX');
        setSnrDisplay(48);
        return;
      }

      if (isReceiving) {
        // Incoming RX Signal: Locked onto incoming RF carrier
        const audioFluct = Math.floor((audioLevels / 100) * 2);
        const rxBars = Math.min(TOTAL_BARS, 11 + audioFluct + (Math.random() > 0.6 ? 1 : 0));
        const rxRssi = -52.0 + (Math.random() * 2.5 - 1.2);
        setActiveBars(rxBars);
        setPeakBar((prev) => Math.max(prev, rxBars));
        setRssiDisplay(`${rxRssi.toFixed(1)} dBm`);
        setSUnitDisplay(rxBars >= 13 ? 'S9+20dB' : rxBars >= 11 ? 'S9+10dB' : 'S9');
        setCarrierText('SQL: OPEN • CARRIER LOCK 5x5');
        setSnrDisplay(Math.round(36 + (Math.random() * 2 - 1)));
        return;
      }

      // Standby Connected Mode: Latency-driven signal level + Natural atmospheric RF flutter (QSB)
      const currentLat = latency ?? lastLatencyRef.current ?? 35;

      // Base target bars calculated from network round-trip latency
      let baseBars = 11;
      let baseRssiDbm = -62.0;
      let baseSnr = 34;

      if (currentLat < 35) {
        baseBars = 12; // S9+10dB
        baseRssiDbm = -54.0;
        baseSnr = 38;
      } else if (currentLat < 60) {
        baseBars = 11; // S9+5dB
        baseRssiDbm = -60.0;
        baseSnr = 34;
      } else if (currentLat < 95) {
        baseBars = 9; // S8
        baseRssiDbm = -71.0;
        baseSnr = 29;
      } else if (currentLat < 140) {
        baseBars = 8; // S7
        baseRssiDbm = -80.0;
        baseSnr = 24;
      } else if (currentLat < 200) {
        baseBars = 6; // S6
        baseRssiDbm = -90.0;
        baseSnr = 19;
      } else if (currentLat < 320) {
        baseBars = 4; // S4
        baseRssiDbm = -102.0;
        baseSnr = 14;
      } else if (currentLat < 500) {
        baseBars = 3; // S3
        baseRssiDbm = -112.0;
        baseSnr = 9;
      } else {
        baseBars = 1; // S1 fringe
        baseRssiDbm = -120.0;
        baseSnr = 4;
      }

      // RF Atmospheric Micro-Flutter (Rayleigh fading / atmospheric micro-jitter simulation)
      // Jitter is between -1 and +1 bar with smooth statistical probability
      const rand = Math.random();
      let flutterDelta = 0;
      if (rand < 0.28) flutterDelta = -1;
      else if (rand > 0.72) flutterDelta = 1;

      // When latency is high or unstable, flutter increases
      if (currentLat > 180 && rand < 0.15) {
        flutterDelta = -2;
      }

      const calculatedBars = Math.max(1, Math.min(TOTAL_BARS, baseBars + flutterDelta));
      const calculatedRssi = baseRssiDbm + (Math.random() * 2.8 - 1.4);
      const calculatedSnr = Math.max(2, Math.round(baseSnr + (Math.random() * 2 - 1)));

      setActiveBars(calculatedBars);
      setPeakBar((prev) => Math.max(prev, calculatedBars));
      setRssiDisplay(`${calculatedRssi.toFixed(1)} dBm`);
      setSnrDisplay(calculatedSnr);

      // Determine S-Unit Display text
      if (calculatedBars >= 13) setSUnitDisplay('S9+20dB');
      else if (calculatedBars >= 11) setSUnitDisplay('S9+10dB');
      else if (calculatedBars >= 9) setSUnitDisplay('S9');
      else if (calculatedBars >= 7) setSUnitDisplay('S7');
      else if (calculatedBars >= 5) setSUnitDisplay('S5');
      else if (calculatedBars >= 3) setSUnitDisplay('S3');
      else setSUnitDisplay('S1');

      // Squelch condition text
      if (currentLat < 75) {
        setCarrierText('SQL: AUTO • LOCK 5x5');
      } else if (currentLat < 180) {
        setCarrierText('SQL: AUTO • STABLE');
      } else if (currentLat < 350) {
        setCarrierText('SQL: MARGINAL • QSB FLUTTER');
      } else {
        setCarrierText('SQL: WEAK • SQUELCH FRINGE');
      }
    };

    updateRfSignal();

    // Fluctuates every 340ms to give that authentic tactile radio needle flutter
    const flutterInterval = setInterval(updateRfSignal, 340);
    return () => clearInterval(flutterInterval);
  }, [connectionStatus, latency, isTransmitting, isReceiving, audioLevels]);

  // Segment illumination determination
  const isSegmentActive = (index: number) => {
    if (connectionStatus === 'offline') return false;
    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
      // 3-bar scanning radar beam
      return Math.abs(index - sweepPos) <= 1;
    }
    return index < activeBars;
  };

  const isSegmentPeak = (index: number) => {
    if (connectionStatus !== 'connected') return false;
    if (isTransmitting) return false;
    return index === peakBar - 1 && index >= activeBars;
  };

  return (
    <div className={`relative z-10 my-1 bg-black/50 p-2 rounded-lg border border-current/20 shadow-inner select-none font-code ${className}`}>
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between text-[9px] mb-1 font-mono tracking-tight">
        {/* Left: Live RSSI / RF Power */}
        <div className="flex items-center gap-1">
          <Activity className={`w-3 h-3 ${isTransmitting ? 'text-rose-400 animate-pulse' : 'text-current opacity-80'}`} />
          <span className="opacity-70 font-tactical text-[8px] tracking-wider">SIG:</span>
          <span className={`font-bold font-mono tracking-wider ${isTransmitting ? 'text-rose-400' : 'text-current'}`}>
            {rssiDisplay}
          </span>
        </div>

        {/* Center: Live S-Unit Badge */}
        <div className="px-1.5 py-0.2 rounded bg-black/60 border border-current/30 text-[9px] font-tactical font-black tracking-widest text-center shadow-xs">
          <span className={isTransmitting ? 'text-rose-400' : isReceiving ? 'text-emerald-400' : 'text-current'}>
            {sUnitDisplay}
          </span>
        </div>

        {/* Right: Real-time Latency / Link status */}
        <div className="flex items-center gap-1 text-[9px]">
          {connectionStatus === 'connected' ? (
            <div className="flex items-center gap-1 font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  (latency ?? 30) < 70
                    ? 'bg-emerald-400 animate-pulse'
                    : (latency ?? 30) < 180
                    ? 'bg-amber-400'
                    : 'bg-rose-400 animate-ping'
                }`}
              />
              <span className="opacity-70 text-[8px]">RTT:</span>
              <span className="font-bold">
                {latency !== null && latency !== undefined ? `${latency}ms` : `${lastLatencyRef.current}ms`}
              </span>
            </div>
          ) : connectionStatus === 'offline' ? (
            <div className="flex items-center gap-1 text-rose-400">
              <WifiOff className="w-2.5 h-2.5" />
              <span className="text-[8px] font-bold">OFFLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-300 animate-pulse">
              <Wifi className="w-2.5 h-2.5" />
              <span className="text-[8px] font-bold">ACQUIRING</span>
            </div>
          )}
        </div>
      </div>

      {/* Segmented S-Meter LED Bar */}
      <div className="w-full h-3 bg-black/80 rounded border border-current/25 p-0.5 flex gap-0.5 items-stretch shadow-inner overflow-hidden">
        {[...Array(TOTAL_BARS)].map((_, i) => {
          const active = isSegmentActive(i);
          const isPeak = isSegmentPeak(i);

          // Color classification:
          // 0-7: Nominal RF (S1 - S7)
          // 8-10: High Carrier (S8 - S9)
          // 11-13: Overdrive / Peak RF Output (+10 to +30dB / 5W TX)
          let barColor = 'bg-emerald-400 shadow-sm shadow-emerald-500/50';
          if (i >= 11) {
            barColor = 'bg-rose-500 shadow-sm shadow-rose-500/50';
          } else if (i >= 8) {
            barColor = 'bg-amber-400 shadow-sm shadow-amber-500/50';
          }

          if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
            barColor = 'bg-cyan-400 shadow-sm shadow-cyan-400/50';
          }

          return (
            <div
              key={i}
              className={`flex-1 h-full rounded-xs transition-all duration-75 relative ${
                active
                  ? barColor
                  : isPeak
                  ? 'bg-rose-400/80 animate-pulse ring-1 ring-rose-400/50'
                  : 'bg-white/5 border border-white/[0.03]'
              }`}
            >
              {/* Subtle inner grid notch */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            </div>
          );
        })}
      </div>

      {/* S-Scale Markings */}
      <div className="flex items-center justify-between text-[7.5px] opacity-75 font-mono px-0.5 pt-0.5 tracking-tight border-b border-current/10 pb-0.5">
        <span className="font-semibold">S1</span>
        <span>S3</span>
        <span>S5</span>
        <span className="font-semibold">S7</span>
        <span className="text-amber-300 font-bold">S9</span>
        <span className="text-rose-400 font-semibold">+10</span>
        <span className="text-rose-400 font-semibold">+20</span>
        <span className="text-rose-400 font-bold">+30dB</span>
      </div>

      {/* Tactical Sub-Telemetry: Squelch & SNR / Quality */}
      <div className="flex items-center justify-between text-[8px] opacity-75 font-mono pt-1">
        <div className="flex items-center gap-1 truncate max-w-[70%]">
          <span
            className={`w-1 h-1 rounded-full shrink-0 ${
              connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span className="font-tactical font-semibold tracking-wide truncate">{carrierText}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-bold">
          {connectionStatus === 'connected' && (
            <span className="opacity-90">SNR: {snrDisplay}dB</span>
          )}
          {isTransmitting && (
            <span className="text-rose-400 animate-pulse font-tactical font-black">TX PEAK</span>
          )}
        </div>
      </div>
    </div>
  );
};
