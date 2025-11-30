

import { Exercise, Routine, WorkoutLog, MuscleGroup, ExerciseType, BodyMeasurement, ThemeType, RoutineTemplate, Language } from '../types';
import { DEFAULT_EXERCISES } from './defaultData';

const EXERCISE_KEY = 'iron_track_exercises';
const ROUTINE_KEY = 'iron_track_routines';
const TEMPLATE_KEY = 'iron_track_templates';
const LOG_KEY = 'iron_track_logs';
const MEASUREMENTS_KEY = 'iron_track_measurements';
const THEME_KEY = 'iron_track_theme';
const WAKE_LOCK_KEY = 'iron_track_wake_lock';
const VOLUME_KEY = 'iron_track_volume';
const LANGUAGE_KEY = 'iron_track_language';

// Initial seed data
const INITIAL_EXERCISES: Exercise[] = [
  { id: '1', name: 'Panca Piana', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted },
  { id: '2', name: 'Squat', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted },
  { id: '3', name: 'Stacco da Terra', muscleGroup: MuscleGroup.Back, type: ExerciseType.Weighted },
  { id: '4', name: 'Military Press', muscleGroup: MuscleGroup.Shoulders, type: ExerciseType.Weighted },
  { id: '5', name: 'Tapis Roulant', muscleGroup: MuscleGroup.Cardio, type: ExerciseType.Duration },
];

export const getExercises = (): Exercise[] => {
  const stored = localStorage.getItem(EXERCISE_KEY);
  if (!stored) {
    localStorage.setItem(EXERCISE_KEY, JSON.stringify(INITIAL_EXERCISES));
    return INITIAL_EXERCISES;
  }
  return JSON.parse(stored);
};

export const saveExercises = (exercises: Exercise[]) => {
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(exercises));
};

export const deleteExercise = (id: string): Exercise[] => {
  const exercises = getExercises();
  const updated = exercises.filter(e => e.id !== id);
  saveExercises(updated);
  return updated;
};

// --- NEW FUNCTION: LOAD DEFAULTS ---
export const loadDefaultExercises = (): number => {
    const current = getExercises();
    // Create a set of lowercased trimmed names to prevent duplicates
    const currentNames = new Set(current.map(e => e.name.trim().toLowerCase()));
    
    const newToAdd = DEFAULT_EXERCISES.filter(def => !currentNames.has(def.name.trim().toLowerCase()));
    
    if (newToAdd.length === 0) return 0;

    const updated = [...current, ...newToAdd];
    saveExercises(updated);
    return newToAdd.length;
};
// -----------------------------------

export const getRoutines = (): Routine[] => {
  const stored = localStorage.getItem(ROUTINE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveRoutines = (routines: Routine[]) => {
  localStorage.setItem(ROUTINE_KEY, JSON.stringify(routines));
};

export const getRoutineTemplates = (): RoutineTemplate[] => {
    const stored = localStorage.getItem(TEMPLATE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const saveRoutineTemplates = (templates: RoutineTemplate[]) => {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
};

export const getWorkoutLogs = (): WorkoutLog[] => {
  const stored = localStorage.getItem(LOG_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveWorkoutLog = (log: WorkoutLog) => {
  const logs = getWorkoutLogs();
  logs.push(log);
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
};

export const deleteWorkoutLog = (id: string) => {
  const logs = getWorkoutLogs().filter(l => l.id !== id);
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
};

export const getMeasurements = (): BodyMeasurement[] => {
  const stored = localStorage.getItem(MEASUREMENTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveMeasurements = (measurements: BodyMeasurement[]) => {
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(measurements));
};

export const deleteMeasurement = (id: string): BodyMeasurement[] => {
  const current = getMeasurements();
  // Convert both to string to ensure safe comparison regardless of how it was stored
  const updated = current.filter(m => String(m.id) !== String(id));
  saveMeasurements(updated);
  return updated;
};

// --- SETTINGS (Theme, Wake Lock, Volume, Language) ---

export const getTheme = (): ThemeType => {
  return (localStorage.getItem(THEME_KEY) as ThemeType) || 'iron';
};

export const saveTheme = (theme: ThemeType) => {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};

export const applyTheme = (theme: ThemeType) => {
    const root = document.documentElement;
    
    // RESET DEFAULT DARK VARS FIRST
    root.style.setProperty('--bg-body', '#0f172a');
    root.style.setProperty('--bg-card', '#1e293b');
    root.style.setProperty('--text-main', '#f8fafc');
    root.style.setProperty('--text-muted', '#94a3b8');
    root.style.setProperty('--border-color', '#334155');

    if (theme === 'ocean') {
        root.style.setProperty('--color-primary', '#3b82f6'); // Blue 500
        root.style.setProperty('--color-secondary', '#06b6d4'); // Cyan 500
    } else if (theme === 'fire') {
        root.style.setProperty('--color-primary', '#ef4444'); // Red 500
        root.style.setProperty('--color-secondary', '#f97316'); // Orange 500
    } else if (theme === 'light') {
        // LIGHT THEME OVERRIDES
        root.style.setProperty('--bg-body', '#f8fafc'); // Slate 50
        root.style.setProperty('--bg-card', '#ffffff'); // White
        root.style.setProperty('--text-main', '#0f172a'); // Slate 900
        root.style.setProperty('--text-muted', '#64748b'); // Slate 500
        root.style.setProperty('--border-color', '#cbd5e1'); // Slate 300
        
        root.style.setProperty('--color-primary', '#4f46e5'); // Indigo 600 (Darker for contrast)
        root.style.setProperty('--color-secondary', '#059669'); // Emerald 600
        
        // Update meta theme color for browser bar
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
    } else {
        // Iron (Default)
        root.style.setProperty('--color-primary', '#6366f1'); // Indigo 500
        root.style.setProperty('--color-secondary', '#10b981'); // Emerald 500
        
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#0f172a');
    }
};

export const getWakeLockEnabled = (): boolean => {
    const stored = localStorage.getItem(WAKE_LOCK_KEY);
    // Default to true if not set
    return stored !== null ? JSON.parse(stored) : true;
};

export const saveWakeLockEnabled = (enabled: boolean) => {
    localStorage.setItem(WAKE_LOCK_KEY, JSON.stringify(enabled));
};

export const getVolume = (): number => {
    const stored = localStorage.getItem(VOLUME_KEY);
    // Default to 1.0 (100%)
    return stored !== null ? parseFloat(stored) : 1.0;
};

export const saveVolume = (volume: number) => {
    localStorage.setItem(VOLUME_KEY, volume.toString());
};

export const getLanguage = (): Language => {
    return (localStorage.getItem(LANGUAGE_KEY) as Language) || 'it';
};

export const saveLanguage = (lang: Language) => {
    localStorage.setItem(LANGUAGE_KEY, lang);
};


// Funzioni per il Backup Globale

export interface FullBackupData {
    exercises: Exercise[];
    routines: Routine[];
    templates: RoutineTemplate[];
    logs: WorkoutLog[];
    measurements: BodyMeasurement[];
    timestamp: string;
}

export const getAllData = (): FullBackupData => {
    return {
        exercises: getExercises(),
        routines: getRoutines(),
        templates: getRoutineTemplates(),
        logs: getWorkoutLogs(),
        measurements: getMeasurements(),
        timestamp: new Date().toISOString()
    };
};

// Helper generico per unire due array di oggetti basati su ID univoco
const mergeLists = <T extends { id: string }>(localList: T[], importedList: T[]): T[] => {
    const map = new Map<string, T>();
    
    // Prima inseriamo i locali
    localList.forEach(item => map.set(item.id, item));
    
    // Poi inseriamo gli importati (sovrascrivono i locali se l'ID coincide)
    importedList.forEach(item => map.set(item.id, item));
    
    return Array.from(map.values());
};

export const restoreData = (data: FullBackupData, mode: 'merge' | 'overwrite' = 'merge') => {
    if (mode === 'overwrite') {
        // Modalità Distruttiva: Sostituisce tutto
        if (data.exercises) localStorage.setItem(EXERCISE_KEY, JSON.stringify(data.exercises));
        if (data.routines) localStorage.setItem(ROUTINE_KEY, JSON.stringify(data.routines));
        if (data.templates) localStorage.setItem(TEMPLATE_KEY, JSON.stringify(data.templates));
        if (data.logs) localStorage.setItem(LOG_KEY, JSON.stringify(data.logs));
        if (data.measurements) localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(data.measurements));
    } else {
        // Modalità Sync: Unisce i dati
        if (data.exercises) {
            const merged = mergeLists(getExercises(), data.exercises);
            saveExercises(merged);
        }
        if (data.routines) {
            const merged = mergeLists(getRoutines(), data.routines);
            saveRoutines(merged);
        }
        if (data.templates) {
            const merged = mergeLists(getRoutineTemplates(), data.templates);
            saveRoutineTemplates(merged);
        }
        if (data.logs) {
            const merged = mergeLists(getWorkoutLogs(), data.logs);
            localStorage.setItem(LOG_KEY, JSON.stringify(merged));
        }
        if (data.measurements) {
            const merged = mergeLists(getMeasurements(), data.measurements);
            saveMeasurements(merged);
        }
    }
};
