/**
 * Web Audio Frequency Synthesizer & Solfeggio Sound Engine
 * lib/audio.ts
 */

export type SolfeggioPresetKey = '369' | '396' | '528' | '639' | '963';

export interface SolfeggioPreset {
  id: SolfeggioPresetKey;
  frequency: number;
  name: string;
  subtitle: string;
  chakra: string;
  digitalRoot: 3 | 6 | 9;
  description: string;
}

export type BrainwaveState = 'theta' | 'alpha' | 'delta';

export interface BrainwavePreset {
  id: BrainwaveState;
  name: string;
  deltaHz: number;
  description: string;
}

export interface AudioEngineState {
  isPlaying: boolean;
  frequency: number;
  presetId: SolfeggioPresetKey;
  binauralEnabled: boolean;
  binauralState: BrainwaveState;
  volume: number;
  isMuted: boolean;
}

export const SOLFEGGIO_PRESETS: Record<SolfeggioPresetKey, SolfeggioPreset> = {
  '369': {
    id: '369',
    frequency: 369.0,
    name: 'Tesla Harmonic',
    subtitle: 'Universal Creation Matrix',
    chakra: 'Universal / Vortex Apex',
    digitalRoot: 9,
    description: 'The master resonance of creation, intuition, and manifestation.'
  },
  '396': {
    id: '396',
    frequency: 396.0,
    name: 'Liberation',
    subtitle: 'Releasing Guilt & Fear',
    chakra: 'Root Chakra',
    digitalRoot: 9,
    description: 'Dissolves energetic blockages, grief, and subconscious hesitation.'
  },
  '528': {
    id: '528',
    frequency: 528.0,
    name: 'Transformation',
    subtitle: 'Miracles & DNA Resonance',
    chakra: 'Solar Plexus / Heart',
    digitalRoot: 6,
    description: 'The celebrated miracle tone of deep cellular repair and emotional balance.'
  },
  '639': {
    id: '639',
    frequency: 639.0,
    name: 'Harmonic Connection',
    subtitle: 'Relationships & Love',
    chakra: 'Heart Chakra',
    digitalRoot: 9,
    description: 'Enhances interpersonal empathy, divine love, and harmonious attraction.'
  },
  '963': {
    id: '963',
    frequency: 963.0,
    name: 'Crown Awakening',
    subtitle: 'Higher Consciousness',
    chakra: 'Crown / Pineal Gland',
    digitalRoot: 9,
    description: 'Connects to higher spiritual planes and pure conscious awareness.'
  }
};

export const BRAINWAVE_PRESETS: Record<BrainwaveState, BrainwavePreset> = {
  theta: {
    id: 'theta',
    name: 'Theta (6 Hz)',
    deltaHz: 6.0,
    description: 'Deep visualization & manifestation state. Optimal for 3-6-9 scripting.'
  },
  alpha: {
    id: 'alpha',
    name: 'Alpha (10 Hz)',
    deltaHz: 10.0,
    description: 'Calm morning focus, flow state, and clear mental intention.'
  },
  delta: {
    id: 'delta',
    name: 'Delta (3 Hz)',
    deltaHz: 3.0,
    description: 'Deep restorative evening release and subconscious sleep integration.'
  }
};

export function getDigitalRoot(n: number): number {
  return 1 + ((Math.round(n) - 1) % 9);
}

export function calculateBinauralBeat(
  baseFreq: number,
  targetState: BrainwaveState = 'theta'
): { left: number; right: number; beat: number } {
  const delta = BRAINWAVE_PRESETS[targetState]?.deltaHz ?? 6.0;
  return {
    left: baseFreq,
    right: baseFreq + delta,
    beat: delta
  };
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private gainLeft: GainNode | null = null;
  private gainRight: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;

  private state: AudioEngineState = {
    isPlaying: false,
    frequency: 369.0,
    presetId: '369',
    binauralEnabled: true,
    binauralState: 'theta',
    volume: 0.7,
    isMuted: false
  };

  private listeners: Set<(state: AudioEngineState) => void> = new Set();

  private getContext(): AudioContext {
    if (typeof window === 'undefined' && typeof global === 'undefined') {
      throw new Error('Web Audio API is not available on the server.');
    }
    if (!this.ctx) {
      const g = typeof window !== 'undefined' ? window : (global as any);
      const AudioContextClass = g.AudioContext || g.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported in this environment');
      }
      this.ctx = new AudioContextClass();
    }
    return this.ctx!;
  }

  public subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public getState(): AudioEngineState {
    return { ...this.state };
  }

  public async play(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (this.state.isPlaying) {
      this.stopNodes();
    }

    const now = ctx.currentTime;

    // Master Gain Node with anti-pop envelope (50ms linear ramp)
    this.masterGain = ctx.createGain();
    const effectiveVol = this.state.isMuted ? 0.0001 : this.state.volume;
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.linearRampToValueAtTime(effectiveVol, now + 0.05);
    this.masterGain.connect(ctx.destination);

    const baseFreq = this.state.frequency;
    const offset = this.state.binauralEnabled
      ? BRAINWAVE_PRESETS[this.state.binauralState].deltaHz
      : 0;

    if (this.state.binauralEnabled) {
      // Discrete stereo binaural beat via ChannelMerger
      this.merger = ctx.createChannelMerger(2);

      this.oscLeft = ctx.createOscillator();
      this.oscLeft.type = 'sine';
      this.oscLeft.frequency.setValueAtTime(baseFreq, now);

      this.gainLeft = ctx.createGain();
      this.gainLeft.gain.setValueAtTime(0.5, now);
      this.oscLeft.connect(this.gainLeft);
      this.gainLeft.connect(this.merger, 0, 0); // Left channel

      this.oscRight = ctx.createOscillator();
      this.oscRight.type = 'sine';
      this.oscRight.frequency.setValueAtTime(baseFreq + offset, now);

      this.gainRight = ctx.createGain();
      this.gainRight.gain.setValueAtTime(0.5, now);
      this.oscRight.connect(this.gainRight);
      this.gainRight.connect(this.merger, 0, 1); // Right channel

      this.merger.connect(this.masterGain);

      this.oscLeft.start(now);
      this.oscRight.start(now);
    } else {
      // Mono Pure Sine
      this.oscLeft = ctx.createOscillator();
      this.oscLeft.type = 'sine';
      this.oscLeft.frequency.setValueAtTime(baseFreq, now);

      this.gainLeft = ctx.createGain();
      this.gainLeft.gain.setValueAtTime(1.0, now);

      this.oscLeft.connect(this.gainLeft);
      this.gainLeft.connect(this.masterGain);

      this.oscLeft.start(now);
    }

    this.state.isPlaying = true;
    this.emit();
  }

  public stop(): void {
    if (!this.state.isPlaying || !this.ctx || !this.masterGain) {
      this.state.isPlaying = false;
      this.emit();
      return;
    }

    const now = this.ctx.currentTime;
    // 50ms fade-out ramp to avoid audible clicks
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);

    setTimeout(() => {
      this.stopNodes();
      this.state.isPlaying = false;
      this.emit();
    }, 60);
  }

  private stopNodes(): void {
    try {
      if (this.oscLeft) {
        this.oscLeft.stop();
        this.oscLeft.disconnect();
        this.oscLeft = null;
      }
      if (this.oscRight) {
        this.oscRight.stop();
        this.oscRight.disconnect();
        this.oscRight = null;
      }
      if (this.gainLeft) {
        this.gainLeft.disconnect();
        this.gainLeft = null;
      }
      if (this.gainRight) {
        this.gainRight.disconnect();
        this.gainRight = null;
      }
      if (this.merger) {
        this.merger.disconnect();
        this.merger = null;
      }
      if (this.masterGain) {
        this.masterGain.disconnect();
        this.masterGain = null;
      }
    } catch {
      // Ignore disconnect errors on already torn down nodes
    }
  }

  public toggle(): Promise<void> {
    if (this.state.isPlaying) {
      this.stop();
      return Promise.resolve();
    } else {
      return this.play();
    }
  }

  public setPreset(key: SolfeggioPresetKey): void {
    const preset = SOLFEGGIO_PRESETS[key];
    if (!preset) return;

    this.state.presetId = key;
    this.state.frequency = preset.frequency;

    if (this.state.isPlaying && this.ctx) {
      const now = this.ctx.currentTime;
      const offset = this.state.binauralEnabled
        ? BRAINWAVE_PRESETS[this.state.binauralState].deltaHz
        : 0;

      if (this.oscLeft) {
        this.oscLeft.frequency.setTargetAtTime(preset.frequency, now, 0.02);
      }
      if (this.oscRight) {
        this.oscRight.frequency.setTargetAtTime(preset.frequency + offset, now, 0.02);
      }
    }
    this.emit();
  }

  public setBinaural(enabled: boolean, state?: BrainwaveState): void {
    this.state.binauralEnabled = enabled;
    if (state) this.state.binauralState = state;

    if (this.state.isPlaying) {
      this.play();
    } else {
      this.emit();
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.volume = clamped;

    if (this.state.isPlaying && this.ctx && this.masterGain && !this.state.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(clamped, now, 0.02);
    }
    this.emit();
  }

  public toggleMute(): void {
    this.state.isMuted = !this.state.isMuted;
    if (this.state.isPlaying && this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      const target = this.state.isMuted ? 0.0001 : this.state.volume;
      this.masterGain.gain.setTargetAtTime(target, now, 0.02);
    }
    this.emit();
  }

  public destroy(): void {
    this.stopNodes();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.listeners.clear();
  }
}

// Global browser singleton
export const audioEngine = typeof window !== 'undefined' ? new AudioEngine() : (null as unknown as AudioEngine);
