'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Headphones,
  Sparkles,
  Waves,
  Zap
} from 'lucide-react';
import {
  AudioEngine,
  SOLFEGGIO_PRESETS,
  BRAINWAVE_PRESETS,
  SolfeggioPresetKey,
  BrainwaveState,
  AudioEngineState
} from '@/lib/audio';

interface FrequencySynthesizerProps {
  initialFrequency?: number;
  className?: string;
}

export default function FrequencySynthesizer({
  initialFrequency,
  className = ''
}: FrequencySynthesizerProps) {
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [audioState, setAudioState] = useState<AudioEngineState>({
    isPlaying: false,
    frequency: 369.0,
    presetId: '369',
    binauralEnabled: true,
    binauralState: 'theta',
    volume: 0.7,
    isMuted: false
  });
  const [hasStarted, setHasStarted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Initialize engine on client mount
  useEffect(() => {
    const eng = new AudioEngine();
    setEngine(eng);

    if (initialFrequency) {
      const match = Object.values(SOLFEGGIO_PRESETS).find(
        (p) => p.frequency === initialFrequency
      );
      if (match) {
        eng.setPreset(match.id);
      }
    }

    const unsubscribe = eng.subscribe((state) => {
      setAudioState(state);
    });

    return () => {
      unsubscribe();
      eng.destroy();
    };
  }, [initialFrequency]);

  // Sine Wave Canvas Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height);
      ctx.stroke();

      const isPlaying = audioState.isPlaying && !audioState.isMuted;
      const baseAmplitude = isPlaying ? height * 0.28 * audioState.volume : 2;
      const frequencyFactor = (audioState.frequency / 369) * 0.04;

      phaseRef.current += isPlaying ? 0.06 : 0.01;

      // Draw glowing harmonic wave
      ctx.lineWidth = isPlaying ? 2.5 : 1;
      ctx.strokeStyle = isPlaying ? '#f59e0b' : '#3f3f46';
      ctx.shadowBlur = isPlaying ? 15 : 0;
      ctx.shadowColor = '#f59e0b';

      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y =
          height / 2 +
          Math.sin(x * frequencyFactor + phaseRef.current) * baseAmplitude +
          (audioState.binauralEnabled && isPlaying
            ? Math.cos(x * 0.015 + phaseRef.current * 1.5) * (baseAmplitude * 0.3)
            : 0);

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Second harmonic wave (violet)
      if (isPlaying) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#8b5cf6';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#8b5cf6';

        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y =
            height / 2 +
            Math.sin(x * frequencyFactor * 1.5 - phaseRef.current * 0.8) *
              (baseAmplitude * 0.6);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioState.isPlaying, audioState.isMuted, audioState.volume, audioState.frequency, audioState.binauralEnabled]);

  const handleTogglePlay = async () => {
    if (!engine) return;
    setHasStarted(true);
    await engine.toggle();
  };

  const handleSelectPreset = (key: SolfeggioPresetKey) => {
    if (!engine) return;
    engine.setPreset(key);
  };

  const handleToggleBinaural = (enabled: boolean) => {
    if (!engine) return;
    engine.setBinaural(enabled);
  };

  const handleSelectBrainwave = (state: BrainwaveState) => {
    if (!engine) return;
    engine.setBinaural(true, state);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!engine) return;
    const vol = parseFloat(e.target.value);
    engine.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (!engine) return;
    engine.toggleMute();
  };

  const activePreset = SOLFEGGIO_PRESETS[audioState.presetId];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 backdrop-blur-xl shadow-2xl ${className}`}
      id="synthesizer"
    >
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              Web Audio Solfeggio Synthesizer
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Browser-native pure harmonic tone generator • 0% external bandwidth • Zero COGS
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-xs font-medium text-purple-300">
            <Headphones className="h-3.5 w-3.5" />
            <span>Stereo Binaural Ready</span>
          </div>
        </div>
      </div>

      {/* Main Tone Control Display */}
      <div className="my-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Play Button & Center Indicator */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring when playing */}
            {audioState.isPlaying && (
              <>
                <div className="absolute h-36 w-36 rounded-full border border-amber-500/20 animate-ping opacity-75" />
                <div className="absolute h-44 w-44 rounded-full border border-purple-500/20 animate-pulse-slow" />
              </>
            )}

            <button
              onClick={handleTogglePlay}
              aria-label={audioState.isPlaying ? 'Stop Frequency' : 'Start Frequency'}
              className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-500/40 ${
                audioState.isPlaying
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-glow-gold'
                  : 'border-zinc-700 bg-zinc-900/90 text-zinc-300 hover:border-amber-400 hover:text-amber-300 hover:shadow-glow-gold'
              }`}
            >
              {audioState.isPlaying ? (
                <div className="flex flex-col items-center">
                  <Square className="h-8 w-8 fill-current" />
                  <span className="text-[10px] uppercase font-bold tracking-widest mt-1">Stop</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Play className="h-9 w-9 fill-current ml-1" />
                  <span className="text-[10px] uppercase font-bold tracking-widest mt-1">Resonate</span>
                </div>
              )}
            </button>
          </div>

          <div className="mt-4 text-center">
            <div className="text-2xl font-black tracking-wider text-amber-400 font-mono">
              {audioState.frequency.toFixed(1)} Hz
            </div>
            <div className="text-sm font-semibold text-zinc-200">{activePreset.name}</div>
            <div className="text-xs text-zinc-400">{activePreset.chakra} • Root {activePreset.digitalRoot}</div>
          </div>
        </div>

        {/* Visualizer & Tone Info */}
        <div className="md:col-span-8 flex flex-col justify-between h-full space-y-4">
          {/* Canvas Wave */}
          <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black/60 p-2">
            <canvas
              ref={canvasRef}
              width={500}
              height={100}
              className="w-full h-24 block"
            />
            <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
              <Waves className="h-3 w-3 text-amber-400" />
              <span>{audioState.isPlaying ? 'HARMONIC ACTIVE' : 'STANDBY'}</span>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 text-xs text-zinc-300">
            <span className="font-semibold text-amber-300 mr-1">{activePreset.subtitle}:</span>
            {activePreset.description}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-4 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60">
            <button
              onClick={handleToggleMute}
              className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
              aria-label={audioState.isMuted ? 'Unmute' : 'Mute'}
            >
              {audioState.isMuted || audioState.volume === 0 ? (
                <VolumeX className="h-5 w-5 text-red-400" />
              ) : (
                <Volume2 className="h-5 w-5 text-zinc-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={audioState.isMuted ? 0 : audioState.volume}
              onChange={handleVolumeChange}
              className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              aria-label="Volume slider"
            />
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">
              {Math.round((audioState.isMuted ? 0 : audioState.volume) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Preset Frequencies Selector */}
      <div className="border-t border-zinc-800/80 pt-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
          Select Sacred Frequency (Tesla Vortex Harmonic Triad)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(SOLFEGGIO_PRESETS) as SolfeggioPresetKey[]).map((key) => {
            const preset = SOLFEGGIO_PRESETS[key];
            const isSelected = audioState.presetId === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition-all border ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-glow-gold'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                }`}
              >
                <div className="text-sm font-bold font-mono">{preset.frequency} Hz</div>
                <div className="text-[11px] font-medium truncate w-full text-zinc-300 mt-0.5">
                  {preset.name}
                </div>
                <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
                  Root {preset.digitalRoot}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Binaural Entrainment Controls */}
      <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Brainwave Entrainment (Binaural Beats)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleBinaural(!audioState.binauralEnabled)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                audioState.binauralEnabled
                  ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
              }`}
            >
              {audioState.binauralEnabled ? 'Stereo Binaural ON' : 'Mono Sine ON'}
            </button>
          </div>
        </div>

        {audioState.binauralEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            {(Object.keys(BRAINWAVE_PRESETS) as BrainwaveState[]).map((stateKey) => {
              const bw = BRAINWAVE_PRESETS[stateKey];
              const isSelected = audioState.binauralState === stateKey;
              return (
                <button
                  key={stateKey}
                  onClick={() => handleSelectBrainwave(stateKey)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-purple-400/80 bg-purple-950/40 text-purple-200'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <span className="font-mono text-purple-400">+{bw.deltaHz} Hz</span>
                    <span>{bw.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                    {bw.description}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
