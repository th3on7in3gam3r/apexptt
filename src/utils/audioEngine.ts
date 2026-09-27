/**
 * Tactical Audio Engine for ApexPTT Walkie Talkie
 * Provides Web Audio API synthesizers for Roger Beeps, Squelch Static, Mic Chirps,
 * real-time VU-meter / frequency analyser, and voice recording.
 */

import { RogerBeepStyle, VoiceModulation, VoxSettings } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play authentic Radio Key-Down Mic Chirp (tactical burst when PTT is pressed)
 */
export function playMicChirp(volume = 0.5) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);

    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.warn('Audio chirp error', e);
  }
}

/**
 * Play Roger Beep upon releasing PTT button
 */
export function playRogerBeep(style: RogerBeepStyle = 'kenwood', volume = 0.5) {
  if (style === 'none') return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (style === 'nasa') {
      // Classic NASA Apollo Quindar Tone (2524 Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2524, now);
      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (style === 'motorola') {
      // Classic Motorola MDC1200 style chirps
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.setValueAtTime(1800, now + 0.06);
      gain.gain.setValueAtTime(volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (style === 'tactical') {
      // Tri-tone tactical rapid chirp
      const freqs = [1040, 1318, 1568];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = now + idx * 0.05;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(volume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      });
    } else {
      // Default: Kenwood dual tone (1000Hz -> 800Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(1150, now);
      osc2.frequency.setValueAtTime(880, now + 0.07);

      gain.gain.setValueAtTime(volume * 0.35, now);
      gain.gain.setValueAtTime(volume * 0.35, now + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.07);
      osc2.start(now + 0.07);
      osc2.stop(now + 0.16);
    }
  } catch (e) {
    console.warn('Audio roger beep error', e);
  }
}

/**
 * Play authentic analog Radio Squelch burst (filtered white noise)
 */
export function playSquelchStatic(durationMs = 90, volume = 0.3) {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * (durationMs / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter to give authentic VHF/UHF radio squelch timbre
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  } catch (e) {
    console.warn('Squelch noise error', e);
  }
}

/**
 * Play Emergency Siren tone for priority distress override
 */
export function playEmergencySiren(volume = 0.6) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Warble between 700Hz and 1300Hz
    for (let i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(650, now + i * 0.25);
      osc.frequency.linearRampToValueAtTime(1350, now + i * 0.25 + 0.12);
      osc.frequency.linearRampToValueAtTime(650, now + i * 0.25 + 0.25);
    }

    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  } catch (e) {
    console.warn('Emergency siren error', e);
  }
}

/**
 * Play Mechanical Channel Click Sound
 */
export function playChannelSwitchClick(volume = 0.4) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {
    console.warn('Click sound error', e);
  }
}

/**
 * Voice Recording & Analyser Manager with Voice Modulation DSP Filters
 */
export class VoiceRecorderManager {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private startTime = 0;
  private voiceModulation: VoiceModulation = 'standard';

  // VOX (Voice Activated Transmission) State
  private voxSettings: VoxSettings = { enabled: false, threshold: 25, hangTimeMs: 700 };
  private isVoxMonitoring = false;
  private voxFrameId: number | null = null;
  private voxHangTimer: any = null;
  private isVoxActive = false;
  private isManualPtt = false;
  private isReceivingIncoming = false;
  private onVoxTriggerStart?: () => void;
  private onVoxTriggerStop?: () => void;
  private onVoxLevelSample?: (level: number) => void;

  // Background Noise Suppression via Web Audio DynamicsCompressorNode
  private noiseSuppressionEnabled = true;
  private compressorNode: DynamicsCompressorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private processedDestination: MediaStreamAudioDestinationNode | null = null;

  setNoiseSuppression(enabled: boolean) {
    this.noiseSuppressionEnabled = enabled;
    this.updateAudioRouting();
  }

  getNoiseSuppression(): boolean {
    return this.noiseSuppressionEnabled;
  }

  getCompressorReductionDb(): number {
    if (!this.compressorNode) return 0;
    return Math.abs(this.compressorNode.reduction || 0);
  }

  private updateAudioRouting() {
    if (!this.sourceNode || !this.audioContext || !this.analyser) return;

    try {
      this.sourceNode.disconnect();
      if (this.filterNode) this.filterNode.disconnect();
      if (this.compressorNode) this.compressorNode.disconnect();

      if (this.noiseSuppressionEnabled && this.compressorNode && this.filterNode) {
        // Highpass Filter (85Hz) -> DynamicsCompressorNode -> Analyser & Destination
        this.sourceNode.connect(this.filterNode);
        this.filterNode.connect(this.compressorNode);
        this.compressorNode.connect(this.analyser);
        if (this.processedDestination) {
          this.compressorNode.connect(this.processedDestination);
        }
      } else {
        // Direct uncompressed audio path
        this.sourceNode.connect(this.analyser);
        if (this.processedDestination) {
          this.sourceNode.connect(this.processedDestination);
        }
      }
    } catch (e) {
      console.warn('Audio routing update warning', e);
    }
  }

  setVoiceModulation(modulation: VoiceModulation) {
    this.voiceModulation = modulation;
  }

  getVoiceModulation(): VoiceModulation {
    return this.voiceModulation;
  }

  setVoxConfig(
    settings: VoxSettings,
    callbacks?: {
      onTriggerStart?: () => void;
      onTriggerStop?: () => void;
      onLevelSample?: (level: number) => void;
    }
  ) {
    this.voxSettings = { ...settings };
    if (callbacks?.onTriggerStart) this.onVoxTriggerStart = callbacks.onTriggerStart;
    if (callbacks?.onTriggerStop) this.onVoxTriggerStop = callbacks.onTriggerStop;
    if (callbacks?.onLevelSample) this.onVoxLevelSample = callbacks.onLevelSample;

    if (this.voxSettings.enabled && this.mediaStream) {
      this.startVoxMonitoring();
    } else if (!this.voxSettings.enabled) {
      this.stopVoxMonitoring();
    }
  }

  getVoxSettings(): VoxSettings {
    return this.voxSettings;
  }

  setManualPtt(active: boolean) {
    this.isManualPtt = active;
    if (active && this.voxHangTimer) {
      clearTimeout(this.voxHangTimer);
      this.voxHangTimer = null;
    }
  }

  setReceivingState(receiving: boolean) {
    this.isReceivingIncoming = receiving;
    if (receiving && this.isVoxActive) {
      this.cancelVoxTransmission();
    }
  }

  cancelVoxTransmission() {
    if (this.voxHangTimer) {
      clearTimeout(this.voxHangTimer);
      this.voxHangTimer = null;
    }
    if (this.isVoxActive) {
      this.isVoxActive = false;
      this.onVoxTriggerStop?.();
    }
  }

  startVoxMonitoring() {
    if (this.isVoxMonitoring) return;
    this.isVoxMonitoring = true;

    const checkVox = () => {
      if (!this.isVoxMonitoring) return;

      const currentLevel = this.getLiveLevel();
      this.onVoxLevelSample?.(currentLevel);

      // Only evaluate VOX triggers if VOX is enabled, microphone allowed, not in manual PTT, and not receiving incoming audio
      if (this.voxSettings.enabled && !this.isManualPtt && !this.isReceivingIncoming) {
        if (currentLevel >= this.voxSettings.threshold) {
          // Volume exceeds user-defined threshold!
          if (this.voxHangTimer) {
            clearTimeout(this.voxHangTimer);
            this.voxHangTimer = null;
          }

          if (!this.isVoxActive && !this.isRecording()) {
            this.isVoxActive = true;
            this.onVoxTriggerStart?.();
          }
        } else {
          // Volume is below threshold
          if (this.isVoxActive && !this.voxHangTimer) {
            this.voxHangTimer = setTimeout(() => {
              this.voxHangTimer = null;
              if (this.isVoxActive) {
                this.isVoxActive = false;
                this.onVoxTriggerStop?.();
              }
            }, this.voxSettings.hangTimeMs);
          }
        }
      }

      this.voxFrameId = requestAnimationFrame(checkVox);
    };

    this.voxFrameId = requestAnimationFrame(checkVox);
  }

  stopVoxMonitoring() {
    this.isVoxMonitoring = false;
    if (this.voxFrameId) {
      cancelAnimationFrame(this.voxFrameId);
      this.voxFrameId = null;
    }
    if (this.voxHangTimer) {
      clearTimeout(this.voxHangTimer);
      this.voxHangTimer = null;
    }
    if (this.isVoxActive) {
      this.isVoxActive = false;
      this.onVoxTriggerStop?.();
    }
  }

  getLiveLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return Math.min(100, Math.round((sum / dataArray.length / 255) * 100));
  }

  async requestMicrophone(): Promise<boolean> {
    try {
      if (this.mediaStream) {
        if (this.voxSettings.enabled) this.startVoxMonitoring();
        return true;
      }
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = getAudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Highpass Filter (85Hz) to filter out ambient room HVAC / sub-bass rumble
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = 'highpass';
      this.filterNode.frequency.value = 85;

      // DynamicsCompressorNode for background noise suppression and voice peak evening
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.compressorNode.threshold.value = -28;
      this.compressorNode.knee.value = 12;
      this.compressorNode.ratio.value = 12;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.15;

      try {
        this.processedDestination = this.audioContext.createMediaStreamDestination();
      } catch (destErr) {
        console.warn('Destination stream not supported', destErr);
      }

      this.updateAudioRouting();

      if (this.voxSettings.enabled) {
        this.startVoxMonitoring();
      }

      return true;
    } catch (err) {
      console.warn('Microphone permission not granted or device unavailable', err);
      return false;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  startRecording(
    onLevelUpdate?: (level: number, waveform: number[]) => void,
    modulation?: VoiceModulation
  ): boolean {
    this.audioChunks = [];
    this.startTime = Date.now();
    if (modulation) {
      this.voiceModulation = modulation;
    }

    if (!this.mediaStream) {
      // Microphone not available; we will use simulated tactical tone transmission
      return false;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : '';

      const recordStream = (this.noiseSuppressionEnabled && this.processedDestination?.stream && this.processedDestination.stream.getAudioTracks().length > 0)
        ? this.processedDestination.stream
        : this.mediaStream;

      this.mediaRecorder = mimeType
        ? new MediaRecorder(recordStream, { mimeType })
        : new MediaRecorder(recordStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);

      // Start audio level visualizer loop
      if (this.analyser && onLevelUpdate) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const updateLoop = () => {
          if (!this.isRecording()) return;
          this.analyser!.getByteFrequencyData(dataArray);

          // Calculate average decibel level
          let sum = 0;
          const bars: number[] = [];
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
            if (i % 2 === 0) {
              bars.push(Math.round((dataArray[i] / 255) * 100));
            }
          }
          const avgLevel = Math.min(100, Math.round((sum / dataArray.length / 255) * 100));
          onLevelUpdate(avgLevel, bars.slice(0, 16));

          this.animationFrameId = requestAnimationFrame(updateLoop);
        };
        this.animationFrameId = requestAnimationFrame(updateLoop);
      }

      return true;
    } catch (err) {
      console.error('Error starting MediaRecorder', err);
      return false;
    }
  }

  async stopRecording(): Promise<{ audioData: string; duration: number } | null> {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const duration = Math.max(0.4, (Date.now() - this.startTime) / 1000);

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });

          // If voice modulation or noise suppression is active, process the audio buffer with Web Audio DSP
          if (this.voiceModulation !== 'standard' || this.noiseSuppressionEnabled) {
            try {
              const dspData = await this.applyAudioDsp(blob, this.voiceModulation, this.noiseSuppressionEnabled);
              if (dspData) {
                resolve({ audioData: dspData.audioData, duration: dspData.duration });
                return;
              }
            } catch (modErr) {
              console.warn('Voice DSP fallback to raw audio', modErr);
            }
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve({ audioData: base64, duration });
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        } catch (e) {
          console.error('Error converting recorded blob', e);
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Applies DSP voice modulation filters and Web Audio DynamicsCompressorNode background noise suppression
   */
  async applyAudioDsp(
    blob: Blob,
    modulation: VoiceModulation,
    noiseSuppression = true
  ): Promise<{ audioData: string; duration: number } | null> {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = getAudioContext();
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Rate scaling for pitch shifting:
    // high-pitch tactical comms: 1.28x rate + highpass bandpass filter + slight overdrive
    // low-pitch radio filter: 0.78x rate + lowpass resonance filter + sub-bass warmth
    const pitchFactor = modulation === 'high-pitch' ? 1.28 : modulation === 'low-pitch' ? 0.78 : 1.0;
    const targetLength = Math.max(1, Math.round(decodedBuffer.length / pitchFactor));
    const targetSampleRate = decodedBuffer.sampleRate;

    const offlineCtx = new OfflineAudioContext(
      decodedBuffer.numberOfChannels,
      targetLength,
      targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.playbackRate.value = pitchFactor;

    // Filters to enhance tactical radio comms timbre and suppress noise
    if (modulation === 'high-pitch') {
      // Tactical Comms Filter: Crisp high bandpass + presence peak + noise compression
      const bandpass = offlineCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 2400;
      bandpass.Q.value = 1.1;

      const highShelf = offlineCtx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 3200;
      highShelf.gain.value = 6;

      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = noiseSuppression ? -26 : -18;
      comp.knee.value = 12;
      comp.ratio.value = noiseSuppression ? 10 : 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;

      source.connect(bandpass);
      bandpass.connect(highShelf);
      highShelf.connect(comp);
      comp.connect(offlineCtx.destination);
    } else if (modulation === 'low-pitch') {
      // Heavy Tactical Low-Pitch Filter: Deep resonant bass + steep lowpass + noise suppression
      const lowpass = offlineCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1400;
      lowpass.Q.value = 1.6;

      const bassBoost = offlineCtx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.value = 350;
      bassBoost.gain.value = 7;

      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = noiseSuppression ? -24 : -16;
      comp.ratio.value = noiseSuppression ? 8 : 5;
      comp.knee.value = 10;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;

      source.connect(lowpass);
      lowpass.connect(bassBoost);
      bassBoost.connect(comp);
      comp.connect(offlineCtx.destination);
    } else if (noiseSuppression) {
      // Standard audio with DynamicsCompressorNode background noise suppression and low-rumble filter
      const highpass = offlineCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 85;

      const comp = offlineCtx.createDynamicsCompressor();
      comp.threshold.value = -28;
      comp.knee.value = 12;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;

      source.connect(highpass);
      highpass.connect(comp);
      comp.connect(offlineCtx.destination);
    } else {
      source.connect(offlineCtx.destination);
    }

    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    const wavBase64 = audioBufferToWavBase64(renderedBuffer);

    return {
      audioData: wavBase64,
      duration: renderedBuffer.duration,
    };
  }

  // Generates a tactical simulated radio test transmission audio if mic is unavailable
  async generateSimulatedVoice(
    callsign: string,
    durationSeconds = 1.8,
    modulation: VoiceModulation = this.voiceModulation
  ): Promise<{ audioData: string; duration: number }> {
    const ctx = getAudioContext();
    const sampleRate = 16000;
    const length = Math.round(sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Determine base frequencies based on voice modulation
    const freqMult = modulation === 'high-pitch' ? 1.45 : modulation === 'low-pitch' ? 0.65 : 1.0;
    const baseF1 = 440 * freqMult;
    const baseF2 = 880 * freqMult;

    // Synthesize human-vowel-like formant harmonics mixed with tactical radio background static
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const f1 = baseF1 + Math.sin(t * 12) * (50 * freqMult);
      const f2 = baseF2 + Math.cos(t * 8) * (70 * freqMult);
      const voice = (Math.sin(2 * Math.PI * f1 * t) * 0.35 + Math.sin(2 * Math.PI * f2 * t) * 0.25);
      const radioNoise = (Math.random() * 2 - 1) * (modulation === 'high-pitch' ? 0.08 : 0.04);
      const envelope = Math.min(1, Math.sin((Math.PI * t) / durationSeconds));
      data[i] = (voice + radioNoise) * envelope * 0.6;
    }

    // Convert AudioBuffer to WAV Base64
    const wavBase64 = audioBufferToWavBase64(buffer);
    return {
      audioData: wavBase64,
      duration: durationSeconds,
    };
  }

  dispose() {
    this.stopVoxMonitoring();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

// Helper to encode AudioBuffer into standard WAV Base64
function audioBufferToWavBase64(buffer: AudioBuffer): string {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  writeString('RIFF');
  setUint32(length - 8);
  writeString('WAVE');
  writeString('fmt ');
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  let binary = '';
  const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${window.btoa(binary)}`;
}

/**
 * Play Audio Data with volume and return playback controls
 */
export function playAudioMessage(audioDataUrl: string, volume = 0.9): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(audioDataUrl);
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.onended = () => resolve();
      audio.onerror = (e) => {
        console.warn('Audio play error', e);
        resolve();
      };
      audio.play().catch((err) => {
        console.warn('Audio autoplay failed', err);
        resolve();
      });
    } catch (err) {
      resolve();
    }
  });
}
