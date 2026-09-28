import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Channel, VoiceMessage } from '../types';
import { createPlayableAudioUrl } from '../utils/audioEngine';

interface Props {
  messages: VoiceMessage[];
  channels: Channel[];
  isTransmitting: boolean;
  liveCallsign?: string;
  liveChannelId?: string;
  liveStartedAt?: number | null;
  volume?: number;
}

function formatClock(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(totalSeconds?: number): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return '—';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function resolveWindow(message: VoiceMessage): { startedAt?: number; endedAt?: number; duration?: number } {
  const endedAt = message.endedAt ?? message.timestamp;
  const duration = message.duration;
  const startedAt =
    message.startedAt ??
    (duration && duration > 0 ? endedAt - duration * 1000 : undefined);
  return { startedAt, endedAt, duration };
}

export const AudioLog: React.FC<Props> = ({
  messages,
  channels,
  isTransmitting,
  liveCallsign,
  liveChannelId,
  liveStartedAt,
  volume = 0.9,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isTransmitting) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isTransmitting]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (objectUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, []);

  const voiceEntries = useMemo(
    () =>
      [...messages]
        .filter((msg) => msg.messageType !== 'location' && (msg.audioData || msg.duration || msg.transcript || msg.summary))
        .reverse(),
    [messages]
  );

  const channelName = (channelId?: string) =>
    channels.find((c) => c.id === channelId)?.name || channelId?.toUpperCase() || 'NET';

  const stopPlayback = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPlayingId(null);
  };

  const handlePlay = (message: VoiceMessage) => {
    if (!message.audioData) return;
    if (playingId === message.id) {
      stopPlayback();
      return;
    }

    stopPlayback();
    const playUrl = createPlayableAudioUrl(message.audioData);
    objectUrlRef.current = playUrl.startsWith('blob:') ? playUrl : null;
    const audio = new Audio();
    audio.setAttribute('playsinline', 'true');
    audio.src = playUrl;
    audio.volume = Math.max(0, Math.min(1, volume));
    audioRef.current = audio;
    setPlayingId(message.id);
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
    };
    audio.onerror = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
    };
    audio.play().catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
    });
  };

  const liveDuration = liveStartedAt ? (now - liveStartedAt) / 1000 : 0;
  const rowGrid = 'grid grid-cols-[minmax(72px,1fr)_72px_72px_44px_28px] gap-3 items-center';

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] font-tactical tracking-[0.16em] text-slate-500">AUDIO LOG</div>
        {liveChannelId && (
          <div className="text-[10px] font-code text-slate-600">{channelName(liveChannelId)}</div>
        )}
      </div>

      <div className={`${rowGrid} pb-1.5 text-[10px] font-tactical tracking-wider text-slate-600 border-b border-slate-800/80`}>
        <span>UNIT</span>
        <span>START</span>
        <span>END</span>
        <span>DUR</span>
        <span />
      </div>

      <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-slate-800/70">
        {isTransmitting && liveStartedAt && (
          <div className={`${rowGrid} py-2.5 bg-rose-950/20`}>
            <div className="min-w-0">
              <div className="text-xs font-tactical text-rose-200 truncate">
                {liveCallsign || 'LOCAL'}
                <span className="ml-2 text-[9px] tracking-wider text-rose-400">LIVE</span>
              </div>
            </div>
            <span className="font-code text-[11px] text-rose-200">{formatClock(liveStartedAt)}</span>
            <span className="font-code text-[11px] text-rose-400">LIVE</span>
            <span className="font-code text-[11px] text-rose-200">{formatDuration(liveDuration)}</span>
            <span />
          </div>
        )}

        {voiceEntries.length === 0 && !isTransmitting && (
          <div className="text-xs text-slate-500 py-10 text-center">No audio traffic logged yet.</div>
        )}

        {voiceEntries.map((msg) => {
          const windowTimes = resolveWindow(msg);
          const canPlay = Boolean(msg.audioData) && !msg.decryptionError;
          const isPlaying = playingId === msg.id;
          const note = msg.decryptionError
            ? 'Encrypted — key required'
            : msg.transcript || msg.summary || 'Voice dispatch';

          return (
            <div key={msg.id} className="py-2.5">
              <div className={rowGrid}>
                <span className="text-xs font-tactical text-slate-200 truncate">
                  {msg.callsign}
                  {msg.isEmergency ? ' · SOS' : ''}
                </span>
                <span className="font-code text-[11px] text-emerald-300/90">{formatClock(windowTimes.startedAt)}</span>
                <span className="font-code text-[11px] text-slate-400">{formatClock(windowTimes.endedAt)}</span>
                <span className="font-code text-[11px] text-slate-500">{formatDuration(windowTimes.duration)}</span>
                <button
                  type="button"
                  onClick={() => handlePlay(msg)}
                  disabled={!canPlay}
                  className={`justify-self-end p-0.5 rounded transition-colors ${
                    !canPlay
                      ? 'text-slate-700 cursor-not-allowed'
                      : isPlaying
                      ? 'text-emerald-300'
                      : 'text-slate-500 hover:text-emerald-300'
                  }`}
                  title={canPlay ? (isPlaying ? 'Stop playback' : 'Play audio') : 'No audio to replay'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 truncate">{note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
