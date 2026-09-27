import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Monitor } from 'lucide-react';
import { HandheldWalkieTalkie } from './components/HandheldWalkieTalkie';
import { TacticalHeader } from './components/TacticalHeader';
import { TacticalSettingsModal } from './components/TacticalSettingsModal';
import { E2EESecurityModal } from './components/E2EESecurityModal';
import { EmergencySosModal } from './components/EmergencySosModal';
import { ShareLocationModal } from './components/ShareLocationModal';
import { OfflineNotificationsModal } from './components/OfflineNotificationsModal';
import { ChannelGroupingModal } from './components/ChannelGroupingModal';
import { TacticalMapPreview } from './components/TacticalMapPreview';
import { AudioLog } from './components/AudioLog';
import {
  playMicChirp,
  playRogerBeep,
  playSquelchStatic,
  playEmergencySiren,
  playAudioMessage,
  VoiceRecorderManager,
} from './utils/audioEngine';
import { encryptAudioPayload, decryptAudioPayload } from './utils/cryptoEngine';
import { offlineManager } from './utils/offlineManager';
import { getCurrentTacticalPosition } from './utils/geoUtils';
import {
  Channel,
  ConnectionStatus,
  DeviceSettings,
  LcdColorTheme,
  LocationStamp,
  Member,
  OfflineNotification,
  RogerBeepStyle,
  VoiceMessage,
  VoiceModulation,
  VoxSettings,
} from './types';

const SETTINGS_KEY = 'apex_ptt_settings_v1';
const DEVICE_ID_KEY = 'apex_ptt_device_id_v1';
const SESSION_ID_KEY = 'apex_ptt_session_id_v1';
const CHANNELS_KEY = 'apex_ptt_channels_v1';
const GROUPS_KEY = 'apex_ptt_groups_v1';
const SYNC_CODE_KEY = 'apex_ptt_sync_code_v1';

const DEFAULT_GROUPS = ['Team Alpha', 'Emergency Services', 'Tactical Operations', 'Security & Patrol'];

const DEFAULT_CHANNELS: Channel[] = [
  { id: 'alpha', name: 'Alpha Ops', frequency: '462.5625 MHz', description: 'Operations & Logistics Dispatch', group: 'Team Alpha' },
  { id: 'bravo', name: 'Bravo Tactical', frequency: '462.5875 MHz', description: 'Field Response & Ground Units', group: 'Team Alpha' },
  { id: 'emergency', name: 'Emergency 9-1-1', frequency: '462.6750 MHz', description: 'Emergency Priority Distress Channel', isEmergency: true, group: 'Emergency Services' },
  { id: 'medevac', name: 'Medevac & SAR', frequency: '462.7000 MHz', description: 'Medical Evacuation & Search and Rescue', isEmergency: true, group: 'Emergency Services' },
  { id: 'charlie', name: 'Charlie Command', frequency: '462.6125 MHz', description: 'Tactical Command & Air Supervision', group: 'Tactical Operations' },
  { id: 'echo', name: 'Echo Recon', frequency: '462.6500 MHz', description: 'Forward Reconnaissance & Grid Patrol', group: 'Tactical Operations' },
  { id: 'delta', name: 'Delta Security', frequency: '462.6375 MHz', description: 'Perimeter, Checkpoints & Escort', group: 'Security & Patrol' },
];

const DEFAULT_SETTINGS: DeviceSettings = {
  callsign: 'APEX-1',
  micGain: 1,
  squelchThreshold: 20,
  volume: 0.7,
  rogerBeep: 'kenwood',
  lcdTheme: 'green',
  voiceModulation: 'standard',
  voxSettings: { enabled: false, threshold: 25, hangTimeMs: 700 },
  noiseSuppression: true,
  autoPlayIncoming: true,
  soundEffects: true,
  e2eeEnabled: false,
  e2eePassphrase: '',
  handsFreeToggle: false,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...(fallback as object), ...JSON.parse(raw) } as T : fallback;
  } catch {
    return fallback;
  }
}

function getOrCreateId(key: string, prefix: string, store: Storage = localStorage): string {
  try {
    const existing = store.getItem(key);
    if (existing) return existing;
    const created = `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    store.setItem(key, created);
    return created;
  } catch {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function withAudioWindow(message: VoiceMessage): VoiceMessage {
  if (message.startedAt && message.endedAt) return message;
  const endedAt = message.endedAt ?? message.timestamp;
  const durationMs = message.duration && message.duration > 0 ? message.duration * 1000 : 0;
  const startedAt = message.startedAt ?? (durationMs ? endedAt - durationMs : undefined);
  return { ...message, startedAt, endedAt };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export default function App() {
  const deviceId = useMemo(() => getOrCreateId(DEVICE_ID_KEY, 'DEV'), []);
  const sessionId = useMemo(() => getOrCreateId(SESSION_ID_KEY, 'UNIT', sessionStorage), []);
  const [clientId, setClientId] = useState(sessionId);
  const [settings, setSettings] = useState<DeviceSettings>(() => loadJson(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [channels, setChannels] = useState<Channel[]>(() => {
    try {
      const raw = localStorage.getItem(CHANNELS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_CHANNELS;
    } catch {
      return DEFAULT_CHANNELS;
    }
  });
  const [availableGroups, setAvailableGroups] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GROUPS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_GROUPS;
    } catch {
      return DEFAULT_GROUPS;
    }
  });
  const [currentChannelId, setCurrentChannelId] = useState('alpha');
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [latency, setLatency] = useState<number | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receivingCallsign, setReceivingCallsign] = useState<string | undefined>();
  const [audioLevels, setAudioLevels] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(16).fill(20));
  const [liveMicLevel, setLiveMicLevel] = useState(0);
  const [micAllowed, setMicAllowed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoxActive, setIsVoxActive] = useState(false);
  const [viewMode, setViewMode] = useState<'handheld' | 'desktop' | 'dual'>('handheld');
  const [notifications, setNotifications] = useState<OfflineNotification[]>(() => offlineManager.getNotifications());
  const [queuedMessages, setQueuedMessages] = useState<VoiceMessage[]>(() => offlineManager.getQueue());
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [syncCode, setSyncCode] = useState(() => getOrCreateId(SYNC_CODE_KEY, 'SYNC', sessionStorage));
  const [isScanning, setIsScanning] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(5);
  const [liveTxStartedAt, setLiveTxStartedAt] = useState<number | null>(null);
  const [airtimeSeconds, setAirtimeSeconds] = useState(0);
  const [transmissionsCount, setTransmissionsCount] = useState(0);
  const [compressorReductionDb, setCompressorReductionDb] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [e2eeOpen, setE2eeOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [groupingOpen, setGroupingOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef(new VoiceRecorderManager());
  const reconnectTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const txStartRef = useRef(0);
  const settingsRef = useRef(settings);
  const channelIdRef = useRef(currentChannelId);
  const clientIdRef = useRef(clientId);
  const mutedRef = useRef(isMuted);
  const transmittingRef = useRef(isTransmitting);
  const receivingRef = useRef(isReceiving);
  const syncCodeRef = useRef(syncCode);
  const viewModeRef = useRef(viewMode);

  settingsRef.current = settings;
  channelIdRef.current = currentChannelId;
  clientIdRef.current = clientId;
  mutedRef.current = isMuted;
  transmittingRef.current = isTransmitting;
  receivingRef.current = isReceiving;
  syncCodeRef.current = syncCode;
  viewModeRef.current = viewMode;

  const currentChannel = useMemo(
    () => channels.find((c) => c.id === currentChannelId) || channels[0] || DEFAULT_CHANNELS[0],
    [channels, currentChannelId]
  );

  const latestLocationMessage = useMemo(
    () => [...messages].reverse().find((m) => m.location),
    [messages]
  );

  const persistSettings = useCallback((next: DeviceSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const persistChannels = useCallback((next: Channel[]) => {
    setChannels(next);
    try {
      localStorage.setItem(CHANNELS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const persistGroups = useCallback((next: string[]) => {
    setAvailableGroups(next);
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const sendWs = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const upsertMessage = useCallback((incoming: VoiceMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === incoming.id);
      if (idx === -1) return [...prev, incoming].slice(-80);
      const next = [...prev];
      next[idx] = { ...next[idx], ...incoming };
      return next;
    });
  }, []);

  const requestMic = useCallback(async () => {
    const granted = await recorderRef.current.requestMicrophone();
    setMicAllowed(granted);
    recorderRef.current.setNoiseSuppression(settingsRef.current.noiseSuppression);
    recorderRef.current.setVoiceModulation(settingsRef.current.voiceModulation);
    return granted;
  }, []);

  const transcribeLocally = useCallback(async (message: VoiceMessage, audioData: string) => {
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData,
          messageId: message.id,
          channelId: message.channelId,
          callsign: message.callsign,
          isEmergency: message.isEmergency,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      upsertMessage({
        ...message,
        transcript: data.transcript,
        summary: data.summary,
        urgency: data.urgency,
        isTranscribing: false,
      });
    } catch (err) {
      console.warn('Client transcription failed', err);
    }
  }, [upsertMessage]);

  const handleIncomingVoice = useCallback(async (raw: VoiceMessage) => {
    let message: VoiceMessage = withAudioWindow({ ...raw, isTranscribing: !raw.transcript && !raw.isEncrypted });
    const cfg = settingsRef.current;

    if (raw.isEncrypted && raw.audioData && raw.iv && raw.salt && cfg.e2eeEnabled && cfg.e2eePassphrase) {
      try {
        const decrypted = await decryptAudioPayload(
          { ciphertext: raw.audioData, iv: raw.iv, salt: raw.salt },
          cfg.e2eePassphrase
        );
        message = { ...message, audioData: decrypted, decryptionError: false };
        transcribeLocally(message, decrypted);
      } catch {
        message = { ...message, decryptionError: true, audioData: undefined };
      }
    } else if (raw.isEncrypted && !cfg.e2eeEnabled) {
      message = { ...message, decryptionError: true, audioData: undefined };
    }

    upsertMessage(message);

    const isSelf = raw.senderId === clientIdRef.current;
    if (isSelf) return;

    setIsReceiving(true);
    setReceivingCallsign(raw.callsign);
    recorderRef.current.setReceivingState(true);

    const canPlay = Boolean(message.audioData) && !message.decryptionError && cfg.autoPlayIncoming && !mutedRef.current && !transmittingRef.current;
    if (canPlay && message.audioData) {
      if (cfg.soundEffects) playSquelchStatic(80, cfg.volume * 0.4);
      await playAudioMessage(message.audioData, Math.max(0.15, cfg.volume));
      if (cfg.soundEffects) playSquelchStatic(60, cfg.volume * 0.25);
    }

    setIsReceiving(false);
    setReceivingCallsign(undefined);
    recorderRef.current.setReceivingState(false);
  }, [transcribeLocally, upsertMessage]);

  const flushOfflineQueue = useCallback(() => {
    const queue = offlineManager.getQueue();
    if (!queue.length || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setQueuedMessages(queue);
      return;
    }

    for (const msg of queue) {
      if (msg.messageType === 'location' && msg.location) {
        sendWs({
          type: 'location_share',
          id: msg.id,
          location: msg.location,
          isEncrypted: msg.isEncrypted,
          isEmergency: msg.isEmergency,
        });
      } else {
        sendWs({
          type: 'voice_message',
          id: msg.id,
          audioData: msg.audioData,
          duration: msg.duration,
          isEncrypted: msg.isEncrypted,
          iv: msg.iv,
          salt: msg.salt,
          isEmergency: msg.isEmergency,
        });
      }
      offlineManager.removeQueuedMessage(msg.id);
    }
    setQueuedMessages(offlineManager.getQueue());
    offlineManager.addNotification({
      id: `sync-${Date.now()}`,
      type: 'queue_synced',
      title: 'OUTBOX SYNCHRONIZED',
      detail: `${queue.length} cached transmission${queue.length === 1 ? '' : 's'} dispatched to the network.`,
      timestamp: Date.now(),
    });
  }, [sendWs]);

  const connectSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus((prev) => (prev === 'offline' ? 'reconnecting' : 'connecting'));
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      sendWs({
        type: 'register',
        id: sessionId,
        callsign: settingsRef.current.callsign,
        channelId: channelIdRef.current,
        deviceType: viewModeRef.current === 'desktop' ? 'desktop' : 'mobile',
        deviceId,
        syncCode: syncCodeRef.current,
      });
      flushOfflineQueue();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'registered':
            setClientId(msg.id);
            clientIdRef.current = msg.id;
            if (Array.isArray(msg.channels) && msg.channels.length) {
              setChannels((prev) => {
                const grouped = new Map(prev.map((c) => [c.id, c.group]));
                return msg.channels.map((ch: Channel) => ({ ...ch, group: grouped.get(ch.id) || ch.group }));
              });
            }
            setMembers(msg.members || []);
            if (Array.isArray(msg.history)) {
              setMessages(msg.history.map((item: VoiceMessage) => withAudioWindow(item)));
            }
            break;
          case 'channel_joined':
            setCurrentChannelId(msg.channelId);
            setMembers(msg.members || []);
            if (Array.isArray(msg.history)) setMessages(msg.history.map((item: VoiceMessage) => withAudioWindow(item)));
            break;
          case 'user_joined':
          case 'user_left':
          case 'presence_update':
            if (msg.members) setMembers(msg.members);
            if (msg.type === 'user_joined' && msg.id !== clientIdRef.current) {
              offlineManager.addNotification({
                id: `join-${msg.id}-${Date.now()}`,
                type: 'user_online',
                title: `${msg.callsign} ONLINE`,
                detail: `${msg.callsign} joined ${msg.channelId?.toUpperCase() || 'channel'}.`,
                timestamp: Date.now(),
              });
            }
            break;
          case 'user_offline':
            if (msg.members) setMembers(msg.members);
            if (msg.id !== clientIdRef.current) {
              offlineManager.addNotification({
                id: `off-${msg.id}-${Date.now()}`,
                type: 'user_offline',
                title: `${msg.callsign} OFFLINE`,
                detail: `${msg.callsign} left the tactical net.`,
                timestamp: Date.now(),
              });
            }
            break;
          case 'ptt_started':
            if (msg.senderId !== clientIdRef.current) {
              setIsReceiving(true);
              setReceivingCallsign(msg.callsign);
              recorderRef.current.setReceivingState(true);
              setMembers((prev) => prev.map((m) => (m.id === msg.senderId ? { ...m, isTransmitting: true, lastSeen: Date.now() } : m)));
            }
            break;
          case 'ptt_stopped':
            if (msg.senderId !== clientIdRef.current) {
              setIsReceiving(false);
              setReceivingCallsign(undefined);
              recorderRef.current.setReceivingState(false);
              setMembers((prev) => prev.map((m) => (m.id === msg.senderId ? { ...m, isTransmitting: false, lastSeen: Date.now() } : m)));
            }
            break;
          case 'voice_message_received':
          case 'sync_voice_message':
            if (msg.message) handleIncomingVoice(msg.message);
            break;
          case 'location_message_received':
          case 'sync_location_message':
            if (msg.message) upsertMessage(withAudioWindow(msg.message));
            break;
          case 'voice_message_transcribed':
          case 'sync_voice_message_transcribed':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msg.messageId
                  ? { ...m, transcript: msg.transcript, summary: msg.summary, urgency: msg.urgency, isTranscribing: false }
                  : m
              )
            );
            break;
          case 'emergency_broadcast':
            playEmergencySiren(settingsRef.current.volume);
            offlineManager.addNotification({
              id: `sos-${Date.now()}`,
              type: 'emergency',
              title: `SOS FROM ${msg.callsign}`,
              detail: msg.message || 'Priority distress beacon activated.',
              timestamp: msg.timestamp || Date.now(),
            });
            break;
          case 'sync_channel_switch':
            if (msg.senderId !== clientIdRef.current && msg.channelId) {
              setCurrentChannelId(msg.channelId);
              sendWs({ type: 'join_channel', channelId: msg.channelId });
            }
            break;
          case 'sync_ptt_status':
            if (msg.senderId !== clientIdRef.current) {
              setIsReceiving(!!msg.isTransmitting);
              if (!msg.isTransmitting) setReceivingCallsign(undefined);
            }
            break;
          case 'sync_code_updated':
            if (msg.syncCode) setSyncCode(msg.syncCode);
            break;
          case 'pong':
            if (typeof msg.clientTimestamp === 'number') {
              setLatency(Math.max(1, Date.now() - msg.clientTimestamp));
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn('Failed to parse radio packet', err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus(navigator.onLine ? 'reconnecting' : 'offline');
      if (pingTimerRef.current) {
        window.clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(connectSocket, 1500);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [deviceId, flushOfflineQueue, handleIncomingVoice, sendWs, sessionId, upsertMessage]);

  useEffect(() => {
    connectSocket();
    requestMic();

    pingTimerRef.current = window.setInterval(() => {
      sendWs({ type: 'ping', clientTimestamp: Date.now() });
      setCompressorReductionDb(recorderRef.current.getCompressorReductionDb());
    }, 4000);

    offlineManager.setCallbacks({
      onOnline: () => {
        setConnectionStatus('reconnecting');
        connectSocket();
      },
      onOffline: () => setConnectionStatus('offline'),
      onNotification: (notif) => {
        setNotifications(offlineManager.getNotifications());
        setUnreadNotificationsCount((n) => n + 1);
        setQueuedMessages(offlineManager.getQueue());
        void notif;
      },
    });

    return () => {
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) window.clearInterval(pingTimerRef.current);
      wsRef.current?.close();
    };
  }, [connectSocket, requestMic, sendWs]);

  useEffect(() => {
    return () => {
      recorderRef.current.dispose();
    };
  }, []);

  const startTransmit = useCallback(async (fromVox = false) => {
    if (transmittingRef.current || receivingRef.current) return;
    await requestMic();
    transmittingRef.current = true;
    const startedAt = Date.now();
    setIsTransmitting(true);
    txStartRef.current = startedAt;
    setLiveTxStartedAt(startedAt);
    recorderRef.current.setManualPtt(!fromVox);

    const cfg = settingsRef.current;
    if (cfg.soundEffects && !isMuted) playMicChirp(cfg.volume);
    sendWs({ type: 'ptt_start' });

    const started = recorderRef.current.startRecording((level, bars) => {
      setAudioLevels(level);
      setWaveformBars(bars);
    }, cfg.voiceModulation);

    if (!started) {
      setAudioLevels(45);
      setWaveformBars([20, 40, 55, 35, 70, 50, 30, 65, 45, 25, 60, 40, 20, 50, 35, 15]);
    }
  }, [isMuted, requestMic, sendWs]);

  const stopTransmit = useCallback(async () => {
    if (!transmittingRef.current) return;
    transmittingRef.current = false;
    setIsTransmitting(false);
    setLiveTxStartedAt(null);
    recorderRef.current.setManualPtt(false);
    setIsVoxActive(false);

    const cfg = settingsRef.current;
    const elapsed = Math.max(0.4, (Date.now() - txStartRef.current) / 1000);
    setAirtimeSeconds((s) => s + elapsed);
    setTransmissionsCount((n) => n + 1);
    if (cfg.soundEffects && !mutedRef.current) playRogerBeep(cfg.rogerBeep, cfg.volume);
    sendWs({ type: 'ptt_stop' });
    setAudioLevels(0);

    let recorded = await recorderRef.current.stopRecording();
    if (!recorded) {
      recorded = await recorderRef.current.generateSimulatedVoice(cfg.callsign, Math.min(2.2, elapsed), cfg.voiceModulation);
    }

    const endedAt = Date.now();
    const startedAt = txStartRef.current || endedAt - recorded.duration * 1000;
    const voiceMsg: VoiceMessage = {
      id: `vm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: clientIdRef.current,
      callsign: cfg.callsign,
      channelId: channelIdRef.current,
      audioData: recorded.audioData,
      duration: recorded.duration,
      isEncrypted: false,
      timestamp: endedAt,
      startedAt,
      endedAt,
      messageType: 'voice',
      isTranscribing: !cfg.e2eeEnabled,
    };

    if (cfg.e2eeEnabled && cfg.e2eePassphrase) {
      try {
        const encrypted = await encryptAudioPayload(recorded.audioData, cfg.e2eePassphrase);
        voiceMsg.audioData = encrypted.ciphertext;
        voiceMsg.iv = encrypted.iv;
        voiceMsg.salt = encrypted.salt;
        voiceMsg.isEncrypted = true;
        voiceMsg.isTranscribing = false;
      } catch (err) {
        console.warn('E2EE encrypt failed, sending clear', err);
      }
    }

    upsertMessage({ ...voiceMsg, audioData: recorded.audioData, isEncrypted: cfg.e2eeEnabled });

    const sent = sendWs({
      type: 'voice_message',
      id: voiceMsg.id,
      audioData: voiceMsg.audioData,
      duration: voiceMsg.duration,
      isEncrypted: voiceMsg.isEncrypted,
      iv: voiceMsg.iv,
      salt: voiceMsg.salt,
    });

    if (!sent) {
      offlineManager.enqueueMessage(voiceMsg);
      setQueuedMessages(offlineManager.getQueue());
    }
  }, [sendWs, upsertMessage]);

  useEffect(() => {
    recorderRef.current.setVoiceModulation(settings.voiceModulation);
    recorderRef.current.setNoiseSuppression(settings.noiseSuppression);
    recorderRef.current.setVoxConfig(settings.voxSettings, {
      onTriggerStart: () => {
        setIsVoxActive(true);
        void startTransmit(true);
      },
      onTriggerStop: () => {
        setIsVoxActive(false);
        void stopTransmit();
      },
      onLevelSample: setLiveMicLevel,
    });
  }, [settings.noiseSuppression, settings.voiceModulation, settings.voxSettings, startTransmit, stopTransmit]);

  useEffect(() => {
    if (!settings.voxSettings.enabled) return;
    void requestMic();
  }, [requestMic, settings.voxSettings.enabled]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isTypingTarget(e.target)) return;
      e.preventDefault();
      void startTransmit(false);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      void stopTransmit();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startTransmit, stopTransmit]);

  const handleSelectChannel = useCallback((channelId: string) => {
    if (channelId === channelIdRef.current) return;
    setCurrentChannelId(channelId);
    setIsReceiving(false);
    setReceivingCallsign(undefined);
    sendWs({ type: 'join_channel', channelId });
  }, [sendWs]);

  useEffect(() => {
    if (!isScanning) {
      setScanCountdown(5);
      return;
    }
    const paused = isTransmitting || isReceiving;
    if (paused) return;

    const timer = window.setInterval(() => {
      setScanCountdown((prev) => {
        if (prev > 1) return prev - 1;
        const idx = channels.findIndex((c) => c.id === channelIdRef.current);
        const next = channels[(idx + 1) % channels.length];
        if (next) handleSelectChannel(next.id);
        return 5;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [channels, handleSelectChannel, isReceiving, isScanning, isTransmitting]);

  const handleUpdateCallsign = (next: string) => {
    const callsign = next.trim().toUpperCase() || settings.callsign;
    persistSettings({ ...settings, callsign });
    sendWs({ type: 'update_callsign', callsign });
  };

  const handleShareLocation = (location: LocationStamp) => {
    const locMsg: VoiceMessage = {
      id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: clientId,
      callsign: settings.callsign,
      channelId: currentChannelId,
      timestamp: Date.now(),
      isEncrypted: false,
      messageType: 'location',
      location,
    };
    upsertMessage(locMsg);
    const sent = sendWs({ type: 'location_share', id: locMsg.id, location });
    if (!sent) {
      offlineManager.enqueueMessage(locMsg);
      setQueuedMessages(offlineManager.getQueue());
    }
    setLocationOpen(false);
  };

  const handleBroadcastSos = async (message: string) => {
    sendWs({ type: 'emergency_sos', message, callsign: settings.callsign });
    handleSelectChannel('emergency');
    try {
      const { stamp } = await getCurrentTacticalPosition();
      handleShareLocation({ ...stamp, label: `SOS ${settings.callsign}` });
    } catch {}
  };

  const playbackVolume = isMuted ? 0 : settings.volume;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col">
      <TacticalHeader
        connectionStatus={connectionStatus}
        latency={latency}
        currentChannel={currentChannel}
        e2eeEnabled={settings.e2eeEnabled}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenE2eeModal={() => setE2eeOpen(true)}
        onOpenNotificationsModal={() => {
          setNotificationsOpen(true);
          setUnreadNotificationsCount(0);
        }}
        unreadNotificationsCount={unreadNotificationsCount}
        queuedMessagesCount={queuedMessages.length}
        callsign={settings.callsign}
        onUpdateCallsign={handleUpdateCallsign}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((m) => !m)}
        onOpenShareLocationModal={() => setLocationOpen(true)}
        onOpenSettingsModal={() => setSettingsOpen(true)}
        voxEnabled={settings.voxSettings.enabled}
        onOpenChannelGroupingModal={() => setGroupingOpen(true)}
      />

      <main className={`flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 ${viewMode === 'dual' ? 'grid xl:grid-cols-2 gap-4' : ''}`}>
        {(viewMode === 'handheld' || viewMode === 'dual') && (
          <HandheldWalkieTalkie
            currentChannel={currentChannel}
            channels={channels}
            onSelectChannel={handleSelectChannel}
            members={members}
            isTransmitting={isTransmitting}
            isReceiving={isReceiving}
            receivingCallsign={receivingCallsign}
            onPttDown={() => void startTransmit(false)}
            onPttUp={() => void stopTransmit()}
            connectionStatus={connectionStatus}
            latency={latency}
            e2eeEnabled={settings.e2eeEnabled}
            lcdTheme={settings.lcdTheme}
            onChangeLcdTheme={(theme: LcdColorTheme) => persistSettings({ ...settings, lcdTheme: theme })}
            rogerBeep={settings.rogerBeep}
            onChangeRogerBeep={(beep: RogerBeepStyle) => persistSettings({ ...settings, rogerBeep: beep })}
            voiceModulation={settings.voiceModulation}
            onChangeVoiceModulation={(modulation: VoiceModulation) => persistSettings({ ...settings, voiceModulation: modulation })}
            volume={playbackVolume}
            onChangeVolume={(vol) => {
              persistSettings({ ...settings, volume: vol });
              if (vol > 0 && isMuted) setIsMuted(false);
            }}
            onOpenSos={() => setSosOpen(true)}
            audioLevels={audioLevels}
            waveformBars={waveformBars}
            micAllowed={micAllowed}
            onOpenShareLocationModal={() => setLocationOpen(true)}
            latestLocationMessage={latestLocationMessage}
            voxSettings={settings.voxSettings}
            onToggleVox={() =>
              persistSettings({
                ...settings,
                voxSettings: { ...settings.voxSettings, enabled: !settings.voxSettings.enabled },
              })
            }
            onOpenSettings={() => setSettingsOpen(true)}
            isVoxActive={isVoxActive}
            isScanning={isScanning}
            onToggleScan={() => setIsScanning((s) => !s)}
            scanCountdown={scanCountdown}
            isScanPaused={isScanning && (isTransmitting || isReceiving)}
            scanPausedReason={isTransmitting ? 'transmitting' : isReceiving ? 'traffic' : null}
            availableGroups={availableGroups}
            onOpenChannelGroupingModal={() => setGroupingOpen(true)}
          />
        )}

        {(viewMode === 'desktop' || viewMode === 'dual') && (
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 min-h-[640px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <h2 className="font-tactical font-semibold tracking-wider text-sm text-slate-100">COMPANION</h2>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-code text-slate-500">
                <Link2 className="w-3 h-3" />
                <span>{syncCode}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-code text-slate-400 border-y border-slate-800/80 py-2">
              <span>AIRTIME <span className="text-emerald-300">{formatDuration(airtimeSeconds)}</span></span>
              <span className="text-slate-700">·</span>
              <span>{transmissionsCount} TX</span>
              <span className="text-slate-700">·</span>
              <span>{members.length} UNIT{members.length === 1 ? '' : 'S'}</span>
              <span className="text-slate-700">·</span>
              <span className={queuedMessages.length ? 'text-amber-300' : undefined}>QUEUE {queuedMessages.length}</span>
            </div>

            <div className="grid lg:grid-cols-[168px_1fr] gap-6 flex-1 min-h-0">
              <div className="min-w-0">
                <div className="text-[10px] font-tactical tracking-[0.16em] text-slate-500 mb-2">CHANNELS</div>
                <div className="space-y-0.5 overflow-y-auto max-h-[420px] pr-1">
                  {channels.map((ch) => {
                    const isActive = ch.id === currentChannel.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleSelectChannel(ch.id)}
                        className={`w-full text-left py-1.5 pl-2.5 border-l-2 transition-colors ${
                          isActive
                            ? 'border-emerald-400 text-emerald-300'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <div className="text-xs font-tactical truncate">{ch.name}</div>
                        <div className="font-code text-[10px] text-slate-600">{ch.frequency}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col min-h-0">
                {viewMode === 'desktop' ? (
                  <AudioLog
                    messages={messages}
                    channels={channels}
                    isTransmitting={isTransmitting}
                    liveCallsign={settings.callsign}
                    liveChannelId={currentChannelId}
                    liveStartedAt={liveTxStartedAt}
                    volume={playbackVolume}
                  />
                ) : (
                  <div className="flex flex-col min-h-0">
                    <div className="text-[10px] font-tactical tracking-[0.16em] text-slate-500 mb-2">COMMS LOG</div>
                    <div className="grid grid-cols-[88px_72px_1fr] gap-3 px-0 pb-1.5 text-[10px] font-tactical tracking-wider text-slate-600 border-b border-slate-800/80">
                      <span>UNIT</span>
                      <span>TIME</span>
                      <span>NOTE</span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-slate-800/70">
                      {messages.length === 0 && (
                        <div className="text-xs text-slate-500 py-10 text-center">No traffic on this net yet.</div>
                      )}
                      {[...messages].reverse().map((msg) => {
                        const note = msg.decryptionError
                          ? 'Encrypted — key required'
                          : msg.transcript || msg.summary || (msg.messageType === 'location'
                            ? (msg.location?.gridRef || 'Location stamp')
                            : 'Voice dispatch');
                        return (
                          <div key={msg.id} className="grid grid-cols-[88px_72px_1fr] gap-3 py-2.5 items-baseline">
                            <span className="text-xs font-tactical text-slate-200 truncate">
                              {msg.callsign}
                              {msg.isEmergency ? ' · SOS' : ''}
                            </span>
                            <span className="font-code text-[11px] text-slate-500">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">{note}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {latestLocationMessage?.location && (
                  <div className="mt-4">
                    <TacticalMapPreview
                      location={latestLocationMessage.location}
                      callsign={latestLocationMessage.callsign}
                      timestamp={latestLocationMessage.timestamp}
                    />
                  </div>
                )}
              </div>
            </div>

            {viewMode === 'desktop' && (
              <button
                type="button"
                onMouseDown={() => void startTransmit(false)}
                onMouseUp={() => void stopTransmit()}
                onTouchStart={(e) => {
                  e.preventDefault();
                  void startTransmit(false);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  void stopTransmit();
                }}
                className={`w-full py-4 rounded-xl font-tactical font-black tracking-widest border-2 ${
                  isTransmitting
                    ? 'bg-rose-700 border-rose-400 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-emerald-500'
                }`}
              >
                {isTransmitting ? 'TRANSMITTING' : 'HOLD TO TALK / SPACEBAR'}
              </button>
            )}
          </section>
        )}
      </main>

      <TacticalSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        voxSettings={settings.voxSettings}
        onChangeVoxSettings={(voxSettings: VoxSettings) => persistSettings({ ...settings, voxSettings })}
        liveMicLevel={liveMicLevel}
        isTransmitting={isTransmitting}
        isVoxActive={isVoxActive}
        rogerBeep={settings.rogerBeep}
        onChangeRogerBeep={(rogerBeep) => persistSettings({ ...settings, rogerBeep })}
        voiceModulation={settings.voiceModulation}
        onChangeVoiceModulation={(voiceModulation) => persistSettings({ ...settings, voiceModulation })}
        noiseSuppression={settings.noiseSuppression}
        onChangeNoiseSuppression={(noiseSuppression) => persistSettings({ ...settings, noiseSuppression })}
        compressorReductionDb={compressorReductionDb}
        lcdTheme={settings.lcdTheme}
        onChangeLcdTheme={(lcdTheme) => persistSettings({ ...settings, lcdTheme })}
        volume={settings.volume}
        onChangeVolume={(volume) => persistSettings({ ...settings, volume })}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((m) => !m)}
      />

      <E2EESecurityModal
        isOpen={e2eeOpen}
        onClose={() => setE2eeOpen(false)}
        e2eeEnabled={settings.e2eeEnabled}
        passphrase={settings.e2eePassphrase}
        onUpdate={(enabled, newPassphrase) => persistSettings({ ...settings, e2eeEnabled: enabled, e2eePassphrase: newPassphrase })}
      />

      <EmergencySosModal
        isOpen={sosOpen}
        onClose={() => setSosOpen(false)}
        onBroadcastSos={(message) => void handleBroadcastSos(message)}
        callsign={settings.callsign}
      />

      <ShareLocationModal
        isOpen={locationOpen}
        onClose={() => setLocationOpen(false)}
        onShareLocation={handleShareLocation}
        currentChannelName={currentChannel.name}
      />

      <OfflineNotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        queuedMessages={queuedMessages}
        onClearNotifications={() => {
          offlineManager.clearNotifications();
          setNotifications([]);
          setUnreadNotificationsCount(0);
        }}
        onSyncQueuedNow={flushOfflineQueue}
      />

      <ChannelGroupingModal
        isOpen={groupingOpen}
        onClose={() => setGroupingOpen(false)}
        channels={channels}
        currentChannelId={currentChannel.id}
        onSelectChannel={handleSelectChannel}
        availableGroups={availableGroups}
        onUpdateChannelGroup={(channelId, newGroup) => {
          persistChannels(channels.map((c) => (c.id === channelId ? { ...c, group: newGroup } : c)));
          if (!availableGroups.includes(newGroup)) persistGroups([...availableGroups, newGroup]);
        }}
        onCreateGroup={(groupName) => {
          if (!availableGroups.includes(groupName)) persistGroups([...availableGroups, groupName]);
        }}
        onDeleteGroup={(groupName) => {
          persistGroups(availableGroups.filter((g) => g !== groupName));
          persistChannels(channels.map((c) => (c.group === groupName ? { ...c, group: 'Team Alpha' } : c)));
        }}
        onResetDefaults={() => {
          persistChannels(DEFAULT_CHANNELS);
          persistGroups(DEFAULT_GROUPS);
        }}
      />
    </div>
  );
}
