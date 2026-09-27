export interface Channel {
  id: string;
  name: string;
  frequency: string;
  description: string;
  group?: string; // Preset group name, e.g. 'Team Alpha', 'Emergency Services'
  isEmergency?: boolean;
  activeMembers?: number;
  scanEnabled?: boolean;
}

export interface ChannelGroup {
  id: string;
  name: string;
  description?: string;
}

export interface Member {
  id: string;
  callsign: string;
  deviceType: 'mobile' | 'desktop';
  isTransmitting: boolean;
  lastSeen: number;
}

export interface LocationStamp {
  latitude: number;
  longitude: number;
  accuracy?: number;
  gridRef?: string;
  label?: string;
  altitude?: number;
}

export interface VoiceMessage {
  id: string;
  senderId: string;
  callsign: string;
  channelId: string;
  audioData?: string; // base64 data url or raw audio string (optional for location-only dispatches)
  duration?: number; // in seconds
  isEncrypted: boolean;
  iv?: string;
  salt?: string;
  timestamp: number;
  startedAt?: number;
  endedAt?: number;
  isEmergency?: boolean;
  isOfflineQueued?: boolean;
  decryptionError?: boolean;
  location?: LocationStamp;
  messageType?: 'voice' | 'location' | 'voice_with_location';
  transcript?: string;
  summary?: string;
  urgency?: 'routine' | 'priority' | 'emergency';
  isTranscribing?: boolean;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'offline';

export type RogerBeepStyle = 'nasa' | 'kenwood' | 'motorola' | 'tactical' | 'none';

export type LcdColorTheme = 'green' | 'amber' | 'cyan' | 'red';

export type VoiceModulation = 'standard' | 'high-pitch' | 'low-pitch';

export interface VoxSettings {
  enabled: boolean;
  threshold: number; // 5 to 90 (percentage, default 25)
  hangTimeMs: number; // 300 to 1500 (milliseconds, default 700)
}

export interface DeviceSettings {
  callsign: string;
  micGain: number; // 0.1 to 2.0
  squelchThreshold: number; // 0 to 100
  volume: number; // 0 to 1.0
  rogerBeep: RogerBeepStyle;
  lcdTheme: LcdColorTheme;
  voiceModulation: VoiceModulation;
  voxSettings: VoxSettings;
  noiseSuppression: boolean;
  autoPlayIncoming: boolean;
  soundEffects: boolean;
  e2eeEnabled: boolean;
  e2eePassphrase: string;
  handsFreeToggle: boolean; // toggle vs hold-to-talk
}

export interface CompanionSyncState {
  isPaired: boolean;
  syncCode: string;
  pairedDeviceId?: string;
  lastSyncTimestamp?: number;
}

export interface OfflineNotification {
  id: string;
  type: 'user_offline' | 'user_online' | 'network_drop' | 'network_restored' | 'queue_synced' | 'emergency';
  title: string;
  detail: string;
  timestamp: number;
}

export interface AirtimeStats {
  totalAirtimeSeconds: number;
  transmissionsCount: number;
  lastTransmissionDuration: number;
  sessionStartTime: number;
}
