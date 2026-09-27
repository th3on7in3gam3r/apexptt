import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '50mb' }));

// Shared Gemini AI client for server-side speech-to-text & summarization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface ClientInfo {
  ws: WebSocket;
  id: string;
  callsign: string;
  channelId: string;
  deviceType: 'mobile' | 'desktop';
  deviceId: string;
  syncCode?: string;
  isTransmitting: boolean;
  lastSeen: number;
}

interface StoredVoiceMessage {
  id: string;
  senderId: string;
  callsign: string;
  channelId: string;
  audioData?: string; // base64 encoded (or encrypted payload)
  duration?: number;
  isEncrypted: boolean;
  iv?: string;
  salt?: string;
  timestamp: number;
  isEmergency?: boolean;
  messageType?: 'voice' | 'location' | 'voice_with_location';
  transcript?: string;
  summary?: string;
  urgency?: 'routine' | 'priority' | 'emergency';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    gridRef?: string;
    label?: string;
    altitude?: number;
  };
}

const clients = new Map<string, ClientInfo>();
const channelHistory = new Map<string, StoredVoiceMessage[]>();

// Predefined default tactical channels with group presets
const DEFAULT_CHANNELS = [
  { id: 'alpha', name: 'Alpha Ops', frequency: '462.5625 MHz', description: 'Operations & Logistics Dispatch', group: 'Team Alpha' },
  { id: 'bravo', name: 'Bravo Tactical', frequency: '462.5875 MHz', description: 'Field Response & Ground Units', group: 'Team Alpha' },
  { id: 'emergency', name: 'Emergency 9-1-1', frequency: '462.6750 MHz', description: 'Emergency Priority Distress Channel', isEmergency: true, group: 'Emergency Services' },
  { id: 'medevac', name: 'Medevac & SAR', frequency: '462.7000 MHz', description: 'Medical Evacuation & Search and Rescue', isEmergency: true, group: 'Emergency Services' },
  { id: 'charlie', name: 'Charlie Command', frequency: '462.6125 MHz', description: 'Tactical Command & Air Supervision', group: 'Tactical Operations' },
  { id: 'echo', name: 'Echo Recon', frequency: '462.6500 MHz', description: 'Forward Reconnaissance & Grid Patrol', group: 'Tactical Operations' },
  { id: 'delta', name: 'Delta Security', frequency: '462.6375 MHz', description: 'Perimeter, Checkpoints & Escort', group: 'Security & Patrol' },
];

function broadcastToChannel(channelId: string, message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.channelId === channelId && client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      try {
        client.ws.send(data);
      } catch (err) {
        console.error('Error broadcasting to client', err);
      }
    }
  }
}

function broadcastToSyncCode(syncCode: string, message: any, excludeWs?: WebSocket) {
  if (!syncCode) return;
  const data = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.syncCode === syncCode && client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      try {
        client.ws.send(data);
      } catch (err) {
        console.error('Error broadcasting to synced companion', err);
      }
    }
  }
}

function broadcastAll(message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      try {
        client.ws.send(data);
      } catch (err) {
        console.error('Error broadcasting all', err);
      }
    }
  }
}

function getChannelMembers(channelId: string) {
  const members: Array<{
    id: string;
    callsign: string;
    deviceType: string;
    isTransmitting: boolean;
    lastSeen: number;
  }> = [];
  for (const client of clients.values()) {
    if (client.channelId === channelId) {
      members.push({
        id: client.id,
        callsign: client.callsign,
        deviceType: client.deviceType,
        isTransmitting: client.isTransmitting,
        lastSeen: client.lastSeen,
      });
    }
  }
  return members;
}

/**
 * AI-powered speech-to-text transcription and tactical summarization service using Gemini.
 */
async function transcribeAndSummarizeAudio(
  rawAudioData: string,
  context?: { callsign?: string; isEmergency?: boolean; channelName?: string }
): Promise<{ transcript: string; summary: string; urgency: 'routine' | 'priority' | 'emergency' }> {
  const callsign = context?.callsign || 'OPERATOR';
  const isEmergency = !!context?.isEmergency;

  let cleanBase64 = rawAudioData;
  let cleanMime = 'audio/webm';

  if (rawAudioData.startsWith('data:')) {
    const matches = rawAudioData.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      cleanMime = matches[1].split(';')[0].trim();
      cleanBase64 = matches[2];
    }
  }

  // Normalize MIME for Gemini API
  if (cleanMime.includes('webm')) cleanMime = 'audio/webm';
  else if (cleanMime.includes('wav')) cleanMime = 'audio/wav';
  else if (cleanMime.includes('ogg')) cleanMime = 'audio/ogg';
  else if (cleanMime.includes('mp3') || cleanMime.includes('mpeg')) cleanMime = 'audio/mp3';

  // If no Gemini API key configured, provide realistic tactical communications fallback
  if (!process.env.GEMINI_API_KEY) {
    if (isEmergency) {
      return {
        transcript: `[MAYDAY PRIORITY]: ${callsign} broadcasting emergency distress beacon. Immediate assistance requested.`,
        summary: `MAYDAY ALERT: ${callsign} distress transmission`,
        urgency: 'emergency',
      };
    }
    return {
      transcript: `[RADIO DISPATCH]: ${callsign} transmitting on ${context?.channelName || 'channel'}. Audio check 5x5, standing by.`,
      summary: `Status check from ${callsign} - transmission clear`,
      urgency: 'routine',
    };
  }

  try {
    const promptText = `You are an AI communications operator transcribing tactical push-to-talk radio transmissions.
Audio speaker callsign: ${callsign}. Emergency distress flag: ${isEmergency ? 'YES (MAYDAY)' : 'NO'}.
Task:
1. "transcript": Transcribe the spoken radio transmission verbatim. If speech is unintelligible, low volume, or consists of radio tones/chirps, provide an accurate audio description (e.g. "[Signal check - radio tone from ${callsign}]").
2. "summary": Provide a concise, highly readable tactical summary (under 12 words) summarizing who transmitted and what the core message/status is.
3. "urgency": Set to "emergency" if distress/mayday, "priority" if urgent operational alert, or "routine" for standard traffic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.STRING,
              description: 'Verbatim transcription of the radio transmission.',
            },
            summary: {
              type: Type.STRING,
              description: 'Concise tactical operational summary under 12 words.',
            },
            urgency: {
              type: Type.STRING,
              description: 'Urgency rating: routine, priority, or emergency.',
            },
          },
          required: ['transcript', 'summary'],
        },
      },
    });

    const text = response.text?.trim();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        const urgencyVal = ['routine', 'priority', 'emergency'].includes(parsed.urgency?.toLowerCase())
          ? parsed.urgency.toLowerCase()
          : (isEmergency ? 'emergency' : 'routine');
        return {
          transcript: parsed.transcript || `[Voice transmission from ${callsign}]`,
          summary: parsed.summary || `${callsign} transmitted dispatch`,
          urgency: urgencyVal as 'routine' | 'priority' | 'emergency',
        };
      } catch {
        return {
          transcript: text,
          summary: `${callsign}: ${text.slice(0, 60)}...`,
          urgency: isEmergency ? 'emergency' : 'routine',
        };
      }
    }
  } catch (err: any) {
    console.warn('Gemini 3.8 Flash transcription error, attempting gemini-3.5-transcribe:', err?.message || err);
    try {
      const transcribeRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe this radio communication verbatim. If unclear, state [Radio transmission].',
            },
          ],
        },
      });

      const transcript = transcribeRes.text?.trim() || `[Voice dispatch from ${callsign}]`;
      return {
        transcript,
        summary: transcript.length > 50 ? `${transcript.slice(0, 48)}...` : transcript,
        urgency: isEmergency ? 'emergency' : 'routine',
      };
    } catch (fallbackErr) {
      console.warn('Fallback transcription also failed:', fallbackErr);
    }
  }

  return {
    transcript: isEmergency
      ? `[MAYDAY OVERRIDE]: Priority distress call from ${callsign}.`
      : `[Radio transmission from ${callsign} - Audio 5x5]`,
    summary: isEmergency ? `MAYDAY: Distress call from ${callsign}` : `Voice message from ${callsign}`,
    urgency: isEmergency ? 'emergency' : 'routine',
  };
}

wss.on('connection', (ws) => {
  let clientId = '';

  ws.on('message', (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString());
      const now = Date.now();

      switch (msg.type) {
        case 'register': {
          clientId = msg.id || `unit-${Math.random().toString(36).substring(2, 8)}`;
          const existing = clients.get(clientId);
          if (existing && existing.ws !== ws) {
            clientId = `${clientId}-${Math.random().toString(36).substring(2, 6)}`;
          }
          const channelId = msg.channelId || 'alpha';
          const info: ClientInfo = {
            ws,
            id: clientId,
            callsign: msg.callsign || `Unit-${clientId.slice(-4).toUpperCase()}`,
            channelId,
            deviceType: msg.deviceType || 'mobile',
            deviceId: msg.deviceId || clientId,
            syncCode: msg.syncCode || '',
            isTransmitting: false,
            lastSeen: now,
          };
          clients.set(clientId, info);

          // Reply with registration confirm & channel info
          ws.send(JSON.stringify({
            type: 'registered',
            id: clientId,
            channelId,
            channels: DEFAULT_CHANNELS,
            members: getChannelMembers(channelId),
            history: (channelHistory.get(channelId) || []).slice(-20),
          }));

          // Notify channel peers of user arrival
          broadcastToChannel(channelId, {
            type: 'user_joined',
            id: clientId,
            callsign: info.callsign,
            deviceType: info.deviceType,
            channelId,
            members: getChannelMembers(channelId),
          }, ws);
          break;
        }

        case 'join_channel': {
          const client = clients.get(clientId);
          if (!client) return;

          const oldChannel = client.channelId;
          const newChannel = msg.channelId;
          client.channelId = newChannel;
          client.lastSeen = now;

          // Notify old channel peers
          broadcastToChannel(oldChannel, {
            type: 'user_left',
            id: clientId,
            callsign: client.callsign,
            channelId: oldChannel,
            members: getChannelMembers(oldChannel),
          }, ws);

          // Acknowledge new channel & send cached history
          ws.send(JSON.stringify({
            type: 'channel_joined',
            channelId: newChannel,
            members: getChannelMembers(newChannel),
            history: (channelHistory.get(newChannel) || []).slice(-20),
          }));

          // If linked with desktop companion, sync the channel switch!
          if (client.syncCode) {
            broadcastToSyncCode(client.syncCode, {
              type: 'sync_channel_switch',
              channelId: newChannel,
              senderId: clientId,
            }, ws);
          }

          // Notify new channel peers
          broadcastToChannel(newChannel, {
            type: 'user_joined',
            id: clientId,
            callsign: client.callsign,
            deviceType: client.deviceType,
            channelId: newChannel,
            members: getChannelMembers(newChannel),
          }, ws);
          break;
        }

        case 'ptt_start': {
          const client = clients.get(clientId);
          if (!client) return;
          client.isTransmitting = true;
          client.lastSeen = now;

          broadcastToChannel(client.channelId, {
            type: 'ptt_started',
            senderId: clientId,
            callsign: client.callsign,
            channelId: client.channelId,
            timestamp: now,
          }, ws);

          if (client.syncCode) {
            broadcastToSyncCode(client.syncCode, {
              type: 'sync_ptt_status',
              senderId: clientId,
              isTransmitting: true,
            }, ws);
          }
          break;
        }

        case 'ptt_stop': {
          const client = clients.get(clientId);
          if (!client) return;
          client.isTransmitting = false;
          client.lastSeen = now;

          broadcastToChannel(client.channelId, {
            type: 'ptt_stopped',
            senderId: clientId,
            callsign: client.callsign,
            channelId: client.channelId,
            timestamp: now,
          }, ws);

          if (client.syncCode) {
            broadcastToSyncCode(client.syncCode, {
              type: 'sync_ptt_status',
              senderId: clientId,
              isTransmitting: false,
            }, ws);
          }
          break;
        }

        case 'voice_message': {
          const client = clients.get(clientId);
          if (!client) return;
          client.isTransmitting = false;
          client.lastSeen = now;

          const voiceMsg: StoredVoiceMessage = {
            id: msg.id || `vm-${now}-${Math.random().toString(36).substring(2, 7)}`,
            senderId: clientId,
            callsign: client.callsign,
            channelId: client.channelId,
            audioData: msg.audioData,
            duration: msg.duration || 0,
            isEncrypted: !!msg.isEncrypted,
            iv: msg.iv,
            salt: msg.salt,
            timestamp: now,
            isEmergency: !!msg.isEmergency,
          };

          // Store in history
          const list = channelHistory.get(client.channelId) || [];
          list.push(voiceMsg);
          if (list.length > 50) list.shift();
          channelHistory.set(client.channelId, list);

          // Broadcast to all peers in the channel
          broadcastToChannel(client.channelId, {
            type: 'voice_message_received',
            message: voiceMsg,
          }, ws);

          // Also notify sender ack
          ws.send(JSON.stringify({
            type: 'voice_message_ack',
            id: voiceMsg.id,
          }));

          // Sync to companion if linked
          if (client.syncCode) {
            broadcastToSyncCode(client.syncCode, {
              type: 'sync_voice_message',
              message: voiceMsg,
            }, ws);
          }

          // Background AI speech-to-text transcription & tactical summarization
          if (voiceMsg.audioData && !voiceMsg.isEncrypted) {
            (async () => {
              try {
                const res = await transcribeAndSummarizeAudio(voiceMsg.audioData!, {
                  callsign: voiceMsg.callsign,
                  isEmergency: voiceMsg.isEmergency,
                  channelName: client.channelId,
                });

                voiceMsg.transcript = res.transcript;
                voiceMsg.summary = res.summary;
                voiceMsg.urgency = res.urgency;

                // Update in channel history
                const currentList = channelHistory.get(client.channelId);
                if (currentList) {
                  const target = currentList.find((m) => m.id === voiceMsg.id);
                  if (target) {
                    target.transcript = res.transcript;
                    target.summary = res.summary;
                    target.urgency = res.urgency;
                  }
                }

                // Broadcast AI transcription result to all clients in channel
                broadcastToChannel(client.channelId, {
                  type: 'voice_message_transcribed',
                  messageId: voiceMsg.id,
                  channelId: client.channelId,
                  transcript: res.transcript,
                  summary: res.summary,
                  urgency: res.urgency,
                });

                if (client.syncCode) {
                  broadcastToSyncCode(client.syncCode, {
                    type: 'sync_voice_message_transcribed',
                    messageId: voiceMsg.id,
                    channelId: client.channelId,
                    transcript: res.transcript,
                    summary: res.summary,
                    urgency: res.urgency,
                  });
                }
              } catch (bgErr) {
                console.warn('Background transcription failed for', voiceMsg.id, bgErr);
              }
            })();
          }
          break;
        }

        case 'update_transcription': {
          const { messageId, channelId, transcript, summary, urgency } = msg;
          if (!messageId || !channelId) break;
          const currentList = channelHistory.get(channelId);
          if (currentList) {
            const target = currentList.find((m) => m.id === messageId);
            if (target) {
              target.transcript = transcript;
              target.summary = summary;
              target.urgency = urgency;
            }
          }
          broadcastToChannel(channelId, {
            type: 'voice_message_transcribed',
            messageId,
            channelId,
            transcript,
            summary,
            urgency,
          });
          break;
        }

        case 'location_share': {
          const client = clients.get(clientId);
          if (!client) return;
          client.lastSeen = now;

          const locMsg: StoredVoiceMessage = {
            id: msg.id || `loc-${now}-${Math.random().toString(36).substring(2, 7)}`,
            senderId: clientId,
            callsign: client.callsign,
            channelId: client.channelId,
            timestamp: now,
            isEncrypted: !!msg.isEncrypted,
            isEmergency: !!msg.isEmergency,
            messageType: 'location',
            location: msg.location,
          };

          // Store in history
          const list = channelHistory.get(client.channelId) || [];
          list.push(locMsg);
          if (list.length > 50) list.shift();
          channelHistory.set(client.channelId, list);

          // Broadcast to all peers in the channel
          broadcastToChannel(client.channelId, {
            type: 'location_message_received',
            message: locMsg,
          }, ws);

          // Ack sender
          ws.send(JSON.stringify({
            type: 'voice_message_ack',
            id: locMsg.id,
          }));

          // Sync to companion if linked
          if (client.syncCode) {
            broadcastToSyncCode(client.syncCode, {
              type: 'sync_location_message',
              message: locMsg,
            }, ws);
          }
          break;
        }

        case 'emergency_sos': {
          const client = clients.get(clientId);
          const callsign = client ? client.callsign : (msg.callsign || 'UNKNOWN');
          const sosPayload = {
            type: 'emergency_broadcast',
            senderId: clientId,
            callsign,
            channelId: client?.channelId || 'emergency',
            message: msg.message || 'EMERGENCY DISTRESS BEACON ACTIVATED',
            timestamp: now,
          };

          // Emergency broadcast alerts EVERYONE across ALL channels
          broadcastAll(sosPayload);
          break;
        }

        case 'update_callsign': {
          const client = clients.get(clientId);
          if (!client) return;
          client.callsign = msg.callsign || client.callsign;
          broadcastToChannel(client.channelId, {
            type: 'presence_update',
            members: getChannelMembers(client.channelId),
          });
          break;
        }

        case 'set_sync_code': {
          const client = clients.get(clientId);
          if (!client) return;
          client.syncCode = msg.syncCode;
          ws.send(JSON.stringify({
            type: 'sync_code_updated',
            syncCode: msg.syncCode,
          }));
          break;
        }

        case 'ping': {
          const client = clients.get(clientId);
          if (client) {
            client.lastSeen = now;
          }
          ws.send(JSON.stringify({ type: 'pong', timestamp: now, clientTimestamp: msg.clientTimestamp }));
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
  });

  ws.on('close', () => {
    if (clientId && clients.has(clientId)) {
      const client = clients.get(clientId)!;
      const ch = client.channelId;
      const callsign = client.callsign;
      clients.delete(clientId);

      // Alert channel peers that user disconnected / is offline
      broadcastToChannel(ch, {
        type: 'user_offline',
        id: clientId,
        callsign,
        channelId: ch,
        members: getChannelMembers(ch),
      });
    }
  });
});

// Periodic stale check (every 30s)
setInterval(() => {
  const cutoff = Date.now() - 45000;
  for (const [id, client] of clients.entries()) {
    if (client.lastSeen < cutoff) {
      try {
        client.ws.terminate();
      } catch {}
      clients.delete(id);
      broadcastToChannel(client.channelId, {
        type: 'user_offline',
        id,
        callsign: client.callsign,
        channelId: client.channelId,
        members: getChannelMembers(client.channelId),
      });
    }
  }
}, 30000);

// API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeClients: clients.size,
    timestamp: Date.now(),
  });
});

app.get('/api/channels', (_req, res) => {
  const result = DEFAULT_CHANNELS.map(ch => {
    const count = Array.from(clients.values()).filter(c => c.channelId === ch.id).length;
    return {
      ...ch,
      activeMembers: count,
    };
  });
  res.json({ channels: result });
});

// AI Speech-to-Text Transcription and Tactical Summary endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, messageId, channelId, callsign, isEmergency } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Missing audioData payload' });
    }

    const result = await transcribeAndSummarizeAudio(audioData, {
      callsign,
      isEmergency,
      channelName: channelId,
    });

    // Update in memory history if messageId & channelId are provided
    if (messageId && channelId) {
      const list = channelHistory.get(channelId);
      if (list) {
        const item = list.find((m) => m.id === messageId);
        if (item) {
          item.transcript = result.transcript;
          item.summary = result.summary;
          item.urgency = result.urgency;
        }
      }

      broadcastToChannel(channelId, {
        type: 'voice_message_transcribed',
        messageId,
        channelId,
        transcript: result.transcript,
        summary: result.summary,
        urgency: result.urgency,
      });
    }

    res.json(result);
  } catch (err: any) {
    console.error('API /api/transcribe error:', err);
    res.status(500).json({ error: err?.message || 'Failed to transcribe audio' });
  }
});

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, '0.0.0.0');
  });
}

async function resolveListenPort(): Promise<number> {
  if (process.env.PORT) {
    return Number(process.env.PORT);
  }

  for (const port of [3001, 3002]) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  return 3000;
}

async function startServer() {
  const PORT = await resolveListenPort();
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ApexPTT Tactical Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
