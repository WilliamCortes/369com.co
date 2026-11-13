'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Copy,
  ChevronDown,
  ChevronUp,
  Award,
  ArrowRight,
  Sun,
  Sunset,
  Moon
} from 'lucide-react';
import {
  loadChamberProfile,
  saveChamberProfile,
  recalculateStreak,
  getTodayKey,
  createEmptyDailyEntry,
  ChamberProfile,
  DailyRitualEntry,
  IntentionCategory
} from '@/lib/storage';

const CATEGORY_PRESETS: Record<
  IntentionCategory,
  { label: string; icon: string; intention: string }
> = {
  wealth: {
    label: 'Abundance & Wealth',
    icon: '🪙',
    intention: 'I am a magnet for extraordinary wealth and effortless financial sovereignty.'
  },
  love: {
    label: 'Magnetic Love & Harmony',
    icon: '💫',
    intention: 'I radiate unconditional love, magnetic harmony, and authentic connection.'
  },
  vitality: {
    label: 'Radiant Cellular Vitality',
    icon: '⚡',
    intention: 'My mind and body vibrate with radiant health, energy, and cellular vitality.'
  },
  purpose: {
    label: 'Life Purpose & Mastery',
    icon: '🎯',
    intention: 'I boldly manifest my highest purpose with unwavering clarity and confidence.'
  },
  custom: {
    label: 'Custom Focus',
    icon: '✨',
    intention: 'I align my thoughts with the infinite abundance of the universe.'
  }
};

export default function ManifestationChamber() {
  const [profile, setProfile] = useState<ChamberProfile | null>(null);
  const [todayKey, setTodayKey] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  // 17-second focus ignition timer
  const [timerSeconds, setTimerSeconds] = useState<number>(17);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerFinished, setTimerFinished] = useState<boolean>(false);

  // Load profile from localStorage on client mount
  useEffect(() => {
    const key = getTodayKey();
    setTodayKey(key);
    const loaded = loadChamberProfile();
    // Ensure today's entry exists
    if (!loaded.history[key]) {
      loaded.history[key] = createEmptyDailyEntry(
        key,
        loaded.activeMasterIntention,
        loaded.activeCategory
      );
      saveChamberProfile(loaded);
    }
    const updated = recalculateStreak(loaded, key);
    setProfile(updated);
  }, []);

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setTimerFinished(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  if (!profile || !todayKey) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
        Loading 3-6-9 Manifestation Chamber...
      </div>
    );
  }

  const currentEntry: DailyRitualEntry =
    profile.history[todayKey] || createEmptyDailyEntry(todayKey);

  const updateEntry = (updater: (prev: DailyRitualEntry) => DailyRitualEntry) => {
    const nextEntry = updater({ ...currentEntry });

    // Evaluate section and day completion
    const morningCount = nextEntry.morning.filter((s) => s.trim().length > 0).length;
    const afternoonCount = nextEntry.afternoon.filter((s) => s.trim().length > 0).length;
    const eveningCount = nextEntry.evening.filter((s) => s.trim().length > 0).length;

    nextEntry.isMorningComplete = morningCount === 3;
    nextEntry.isAfternoonComplete = afternoonCount === 6;
    nextEntry.isEveningComplete = eveningCount === 9;
    nextEntry.isDayComplete =
      nextEntry.isMorningComplete && nextEntry.isAfternoonComplete && nextEntry.isEveningComplete;
    nextEntry.updatedAt = Date.now();

    const nextProfile: ChamberProfile = {
      ...profile,
      history: {
        ...profile.history,
        [todayKey]: nextEntry
      }
    };

    const recalculated = recalculateStreak(nextProfile, todayKey);
    setProfile(recalculated);
    saveChamberProfile(recalculated);
  };

  const handleIntentionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateEntry((prev) => ({
      ...prev,
      masterIntention: val
    }));
  };

  const handleCategorySelect = (category: IntentionCategory) => {
    const preset = CATEGORY_PRESETS[category];
    updateEntry((prev) => ({
      ...prev,
      category,
      masterIntention: preset.intention
    }));
  };

  const handleSlotChange = (
    section: 'morning' | 'afternoon' | 'evening',
    index: number,
    value: string
  ) => {
    updateEntry((prev) => {
      const copy = { ...prev };
      if (section === 'morning') {
        const arr = [...copy.morning] as [string, string, string];
        arr[index] = value;
        copy.morning = arr;
      } else if (section === 'afternoon') {
        const arr = [...copy.afternoon] as [string, string, string, string, string, string];
        arr[index] = value;
        copy.afternoon = arr;
      } else if (section === 'evening') {
        const arr = [...copy.evening] as [
          string, string, string, string, string, string, string, string, string
        ];
        arr[index] = value;
        copy.evening = arr;
      }
      return copy;
    });
  };

  const handleCopyToAll = () => {
    const text = currentEntry.masterIntention;
    updateEntry((prev) => ({
      ...prev,
      morning: prev.morning.map((slot) => slot || text) as [string, string, string],
      afternoon: prev.afternoon.map((slot) => slot || text) as [
        string, string, string, string, string, string
      ],
      evening: prev.evening.map((slot) => slot || text) as [
        string, string, string, string, string, string, string, string, string
      ]
    }));
  };

  const handleStartTimer = () => {
    setTimerSeconds(17);
    setTimerFinished(false);
    setIsTimerRunning(true);
  };

  // Counts
  const morningDone = currentEntry.morning.filter((s) => s.trim().length > 0).length;
  const afternoonDone = currentEntry.afternoon.filter((s) => s.trim().length > 0).length;
  const eveningDone = currentEntry.evening.filter((s) => s.trim().length > 0).length;
  const totalWritten = morningDone + afternoonDone + eveningDone;
  const progressPercent = Math.round((totalWritten / 18) * 100);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl"
      id="chamber"
    >
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

      {/* Header bar with streak & progress */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="text-2xl font-bold tracking-tight text-zinc-100">
              369 Daily Manifestation Chamber
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Nikola Tesla&apos;s sacred 3-6-9 frequency ritual • 3 Morning, 6 Midday, 9 Evening
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active streak badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-glow-gold">
            <Flame className="h-4 w-4 text-amber-400 fill-current animate-bounce" />
            <span>
              {profile.activeStreak} {profile.activeStreak === 1 ? 'Day' : 'Days'} Streak
            </span>
          </div>

          {/* Daily completion badge */}
          <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">
            <Award className="h-3.5 w-3.5 text-purple-400" />
            <span>{profile.totalDaysCompleted} Total Days</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-zinc-400">Daily Ritual Alignment</span>
          <span className="font-mono font-bold text-amber-400">
            {totalWritten}/18 Repetitions ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Master Seed Intention Input & Category Select */}
      <div className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <span>Primary Core Intention Seed</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_PRESETS) as IntentionCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-colors border ${
                  currentEntry.category === cat
                    ? 'border-amber-400/80 bg-amber-500/20 text-amber-200 font-semibold'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="mr-1">{CATEGORY_PRESETS[cat].icon}</span>
                {CATEGORY_PRESETS[cat].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={currentEntry.masterIntention}
            onChange={handleIntentionChange}
            placeholder="Type your concentrated affirmation here..."
            className="w-full rounded-lg border border-zinc-700 bg-black/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            onClick={handleCopyToAll}
            title="Auto-fill blank slots with master intention"
            className="flex items-center gap-1.5 shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-200 hover:border-amber-400 hover:text-amber-300 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clone to All</span>
          </button>
        </div>
      </div>

      {/* 17-Second Focus Ignition Timer */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-purple-400 bg-purple-900/40 text-purple-300 font-mono text-base font-black shadow-glow-violet">
            {timerSeconds}s
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
              <span>17-Second Manifestation Combustion Point</span>
            </div>
            <p className="text-xs text-zinc-400">
              Hold absolute pure focus on your desire for 17 seconds to ignite quantum alignment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timerFinished ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Quantum Field Ignited!</span>
            </div>
          ) : (
            <button
              onClick={handleStartTimer}
              disabled={isTimerRunning}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                isTimerRunning
                  ? 'border-purple-500 bg-purple-600/30 text-purple-200 animate-pulse'
                  : 'border-purple-400 bg-purple-600/20 text-purple-200 hover:bg-purple-600/40 shadow-glow-violet'
              }`}
            >
              {isTimerRunning ? 'Holding Focus...' : 'Start 17s Focus'}
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs: Morning (3x), Midday (6x), Evening (9x) */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setActiveTab('morning')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 border transition-all text-xs font-bold ${
            activeTab === 'morning'
              ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-glow-gold'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Sun className="h-4 w-4" />
          <span>Morning (3x)</span>
          <span className="font-mono text-[10px] ml-1 px-1.5 py-0.5 rounded bg-zinc-800">
            {morningDone}/3
          </span>
        </button>

        <button
          onClick={() => setActiveTab('afternoon')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 border transition-all text-xs font-bold ${
            activeTab === 'afternoon'
              ? 'border-amber-400 bg-amber-500/15 text-amber-300 shadow-glow-gold'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Sunset className="h-4 w-4" />
          <span>Midday (6x)</span>
          <span className="font-mono text-[10px] ml-1 px-1.5 py-0.5 rounded bg-zinc-800">
            {afternoonDone}/6
          </span>
        </button>

        <button
          onClick={() => setActiveTab('evening')}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 border transition-all text-xs font-bold ${
            activeTab === 'evening'
              ? 'border-purple-400 bg-purple-500/15 text-purple-300 shadow-glow-violet'
              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Moon className="h-4 w-4" />
          <span>Evening (9x)</span>
          <span className="font-mono text-[10px] ml-1 px-1.5 py-0.5 rounded bg-zinc-800">
            {eveningDone}/9
          </span>
        </button>
      </div>

      {/* Scripting Slots for Active Tab */}
      <div className="space-y-2.5">
        {activeTab === 'morning' && (
          <>
            <div className="text-xs font-semibold text-zinc-400 mb-2">
              🌅 Step 1: Plant the Seed (3 repetitions right upon waking)
            </div>
            {currentEntry.morning.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-950/60 border border-amber-500/30 font-mono text-[11px] font-bold text-amber-400">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={slot}
                  onChange={(e) => handleSlotChange('morning', idx, e.target.value)}
                  placeholder={`Morning repetition #${idx + 1}`}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                />
              </div>
            ))}
          </>
        )}

        {activeTab === 'afternoon' && (
          <>
            <div className="text-xs font-semibold text-zinc-400 mb-2">
              ☀️ Step 2: Amplify the Resonance (6 repetitions at midday)
            </div>
            {currentEntry.afternoon.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-950/60 border border-amber-500/30 font-mono text-[11px] font-bold text-amber-400">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={slot}
                  onChange={(e) => handleSlotChange('afternoon', idx, e.target.value)}
                  placeholder={`Midday repetition #${idx + 1}`}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                />
              </div>
            ))}
          </>
        )}

        {activeTab === 'evening' && (
          <>
            <div className="text-xs font-semibold text-zinc-400 mb-2">
              🌙 Step 3: Anchor into Quantum Field (9 repetitions before sleep)
            </div>
            {currentEntry.evening.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-950/60 border border-purple-500/30 font-mono text-[11px] font-bold text-purple-400">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={slot}
                  onChange={(e) => handleSlotChange('evening', idx, e.target.value)}
                  placeholder={`Evening repetition #${idx + 1}`}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-purple-400 focus:outline-none"
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Completion Celebration & Upsell Hook */}
      {currentEntry.isDayComplete && (
        <div className="mt-8 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-950/30 to-purple-950/30 p-6 text-center shadow-glow-gold animate-fadeIn">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 mb-3 shadow-glow-gold">
            <Sparkles className="h-8 w-8" />
          </div>
          <h4 className="text-xl font-black text-amber-300 tracking-tight">
            Ritual Complete! The 3-6-9 Vortex is Anchored
          </h4>
          <p className="text-xs text-zinc-300 max-w-lg mx-auto mt-2 leading-relaxed">
            You have spoken and scripted your reality 18 times into the universe today (Digital Root: 9).
            Your subconscious vibration has been tuned to receive.
          </p>
          <div className="mt-4">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-bold text-black uppercase tracking-wider shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <span>Accelerate with Your Personalized 369 Blueprint ($7.99)</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
