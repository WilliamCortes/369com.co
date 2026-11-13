/**
 * LocalStorage Persistence & Daily 3-6-9 Ritual Tracker Engine
 * lib/storage.ts
 */

export type IntentionCategory = 'wealth' | 'love' | 'vitality' | 'purpose' | 'custom';

export interface DailyRitualEntry {
  date: string; // ISO date format 'YYYY-MM-DD'
  masterIntention: string;
  category: IntentionCategory;
  morning: [string, string, string]; // Exactly 3 slots
  afternoon: [string, string, string, string, string, string]; // Exactly 6 slots
  evening: [string, string, string, string, string, string, string, string, string]; // Exactly 9 slots
  isMorningComplete: boolean;
  isAfternoonComplete: boolean;
  isEveningComplete: boolean;
  isDayComplete: boolean;
  updatedAt: number;
}

export interface ChamberProfile {
  activeStreak: number;
  longestStreak: number;
  lastActiveDate: string; // 'YYYY-MM-DD'
  totalEntriesWritten: number;
  totalDaysCompleted: number;
  activeMasterIntention: string;
  activeCategory: IntentionCategory;
  history: Record<string, DailyRitualEntry>; // Keyed by 'YYYY-MM-DD'
}

const STORAGE_KEY = '369_chamber_profile_v1';

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createEmptyDailyEntry(
  date: string,
  intention = 'I am a magnet for extraordinary wealth and effortless financial sovereignty.',
  category: IntentionCategory = 'wealth'
): DailyRitualEntry {
  return {
    date,
    masterIntention: intention,
    category,
    morning: ['', '', ''],
    afternoon: ['', '', '', '', '', ''],
    evening: ['', '', '', '', '', '', '', '', ''],
    isMorningComplete: false,
    isAfternoonComplete: false,
    isEveningComplete: false,
    isDayComplete: false,
    updatedAt: Date.now()
  };
}

export function getDefaultProfile(): ChamberProfile {
  const today = getTodayKey();
  const defaultIntention = 'I am a magnet for extraordinary wealth and effortless financial sovereignty.';
  return {
    activeStreak: 0,
    longestStreak: 0,
    lastActiveDate: today,
    totalEntriesWritten: 0,
    totalDaysCompleted: 0,
    activeMasterIntention: defaultIntention,
    activeCategory: 'wealth',
    history: {
      [today]: createEmptyDailyEntry(today, defaultIntention, 'wealth')
    }
  };
}

export function loadChamberProfile(): ChamberProfile {
  if (typeof window === 'undefined') {
    return getDefaultProfile();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProfile();
    const parsed = JSON.parse(raw) as Partial<ChamberProfile>;
    const defaultProf = getDefaultProfile();
    return {
      ...defaultProf,
      ...parsed,
      history: {
        ...defaultProf.history,
        ...(parsed.history || {})
      }
    };
  } catch {
    return getDefaultProfile();
  }
}

export function saveChamberProfile(profile: ChamberProfile): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (err) {
    console.warn('Failed to save chamber profile to localStorage:', err);
    return false;
  }
}

export function recalculateStreak(profile: ChamberProfile, todayKey: string): ChamberProfile {
  const dates = Object.keys(profile.history).sort(); // chronological sort
  if (dates.length === 0) {
    profile.activeStreak = 0;
    return profile;
  }

  // Count total completed days and total entries
  let totalDays = 0;
  let totalEntries = 0;

  for (const dateKey of dates) {
    const entry = profile.history[dateKey];
    if (entry.isDayComplete) totalDays++;
    totalEntries += entry.morning.filter(Boolean).length;
    totalEntries += entry.afternoon.filter(Boolean).length;
    totalEntries += entry.evening.filter(Boolean).length;
  }

  profile.totalDaysCompleted = totalDays;
  profile.totalEntriesWritten = totalEntries;

  // Streak verification from today or yesterday backwards
  let currentStreak = 0;
  const todayEntry = profile.history[todayKey];

  const getPrevDate = (isoDate: string): string => {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const py = date.getFullYear();
    const pm = String(date.getMonth() + 1).padStart(2, '0');
    const pd = String(date.getDate()).padStart(2, '0');
    return `${py}-${pm}-${pd}`;
  };

  let checkDate = todayKey;
  if (todayEntry && todayEntry.isDayComplete) {
    currentStreak++;
    checkDate = getPrevDate(todayKey);
  } else {
    // If today is not yet complete, check if yesterday was complete to keep streak alive
    const yesterday = getPrevDate(todayKey);
    if (profile.history[yesterday]?.isDayComplete) {
      checkDate = yesterday;
    } else {
      // Streak broken
      profile.activeStreak = 0;
      profile.lastActiveDate = todayKey;
      return profile;
    }
  }

  // Iterate backwards while previous days are complete
  while (profile.history[checkDate]?.isDayComplete) {
    currentStreak++;
    checkDate = getPrevDate(checkDate);
  }

  profile.activeStreak = currentStreak;
  if (currentStreak > profile.longestStreak) {
    profile.longestStreak = currentStreak;
  }
  profile.lastActiveDate = todayKey;

  return profile;
}

export interface RitualState {
  date: string;
  morningIntentions: string[];
  afternoonIntentions: string[];
  eveningIntentions: string[];
  completed: boolean;
}

export function getTodayRitual(): RitualState {
  const profile = loadChamberProfile();
  const today = getTodayKey();
  const entry = profile.history[today] || createEmptyDailyEntry(today);
  return {
    date: entry.date,
    morningIntentions: [...entry.morning],
    afternoonIntentions: [...entry.afternoon],
    eveningIntentions: [...entry.evening],
    completed: entry.isDayComplete
  };
}

export function saveRitual(state: RitualState): void {
  const profile = loadChamberProfile();
  const today = state.date || getTodayKey();
  const entry: DailyRitualEntry = {
    date: today,
    masterIntention: profile.activeMasterIntention,
    category: profile.activeCategory,
    morning: [state.morningIntentions[0] || '', state.morningIntentions[1] || '', state.morningIntentions[2] || ''],
    afternoon: [
      state.afternoonIntentions[0] || '',
      state.afternoonIntentions[1] || '',
      state.afternoonIntentions[2] || '',
      state.afternoonIntentions[3] || '',
      state.afternoonIntentions[4] || '',
      state.afternoonIntentions[5] || ''
    ],
    evening: [
      state.eveningIntentions[0] || '',
      state.eveningIntentions[1] || '',
      state.eveningIntentions[2] || '',
      state.eveningIntentions[3] || '',
      state.eveningIntentions[4] || '',
      state.eveningIntentions[5] || '',
      state.eveningIntentions[6] || '',
      state.eveningIntentions[7] || '',
      state.eveningIntentions[8] || ''
    ],
    isMorningComplete: state.morningIntentions.filter(Boolean).length === 3,
    isAfternoonComplete: state.afternoonIntentions.filter(Boolean).length === 6,
    isEveningComplete: state.eveningIntentions.filter(Boolean).length === 9,
    isDayComplete: state.completed,
    updatedAt: Date.now()
  };
  profile.history[today] = entry;
  recalculateStreak(profile, today);
  saveChamberProfile(profile);
}
