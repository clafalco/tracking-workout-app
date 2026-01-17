
import { Exercise, Routine, WorkoutLog, MuscleGroup, ExerciseType, BodyMeasurement, ThemeType, RoutineTemplate, Language, RoutineDay, UserProfile, CustomMetricConfig } from '../types';
import { DEFAULT_EXERCISES } from './defaultData';

const EXERCISE_KEY = 'iron_track_exercises';
const ROUTINE_KEY = 'iron_track_routines';
const TEMPLATE_KEY = 'iron_track_templates';
const LOG_KEY = 'iron_track_logs';
const MEASUREMENTS_KEY = 'iron_track_measurements';
const THEME_KEY = 'iron_track_theme';
const CUSTOM_COLORS_KEY = 'iron_track_custom_colors';
const WAKE_LOCK_KEY = 'iron_track_wake_lock';
const VOLUME_KEY = 'iron_track_volume';
const LANGUAGE_KEY = 'iron_track_language';
const ACTIVE_SESSION_KEY = 'iron_track_active_session';
const PROFILE_KEY = 'iron_track_profile';
const CUSTOM_METRICS_KEY = 'iron_track_custom_metrics';

export interface CustomColors {
  primary: string;
  secondary: string;
}

// Add FullBackupData interface for backup/restore operations
export interface FullBackupData {
  exercises: Exercise[];
  routines: Routine[];
  templates: RoutineTemplate[];
  logs: WorkoutLog[];
  measurements: BodyMeasurement[];
  profile: UserProfile;
  customMetrics: CustomMetricConfig[];
  timestamp: string;
}

export const getProfile = (): UserProfile => {
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored ? JSON.parse(stored) : { birthDate: undefined, gender: 'M', height: undefined };
};

export const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getCustomMetricConfigs = (): CustomMetricConfig[] => {
  const stored = localStorage.getItem(CUSTOM_METRICS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveCustomMetricConfigs = (configs: CustomMetricConfig[]) => {
  localStorage.setItem(CUSTOM_METRICS_KEY, JSON.stringify(configs));
};

export const getExercises = (): Exercise[] => {
  const stored = localStorage.getItem(EXERCISE_KEY);
  if (!stored) {
    const initial = [
      { id: '1', name: 'Panca Piana', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted },
      { id: '2', name: 'Squat', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted },
      { id: '3', name: 'Stacco da Terra', muscleGroup: MuscleGroup.Back, type: ExerciseType.Weighted },
    ];
    localStorage.setItem(EXERCISE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

export const saveExercises = (exercises: Exercise[]) => {
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(exercises));
};

export const deleteExercise = (id: string): Exercise[] => {
  const current = getExercises();
  const updated = current.filter(e => e.id !== id);
  saveExercises(updated);
  return updated;
};

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
  const updated = current.filter(m => String(m.id) !== String(id));
  saveMeasurements(updated);
  return updated;
};

export interface ActiveSessionData {
    log: WorkoutLog;
    activeRoutineDay: RoutineDay;
    startTime: number;
    routineId?: string;
    dayId?: string;
    activeTimer?: any;
    restTimer?: any;
}

export const saveActiveSession = (data: ActiveSessionData) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
};

export const getActiveSession = (): ActiveSessionData | null => {
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const clearActiveSession = () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
};

export const getTheme = (): ThemeType => {
  return (localStorage.getItem(THEME_KEY) as ThemeType) || 'iron';
};

export const saveTheme = (theme: ThemeType) => {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};

export const getCustomColors = (): CustomColors | null => {
  const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const saveCustomColors = (colors: CustomColors) => {
  localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
  applyTheme(getTheme());
};

export const applyTheme = (theme: ThemeType) => {
    const root = document.documentElement;
    root.style.setProperty('--bg-body', theme === 'light' ? '#f8fafc' : '#0f172a');
    root.style.setProperty('--bg-card', theme === 'light' ? '#ffffff' : '#1e293b');
    root.style.setProperty('--text-main', theme === 'light' ? '#0f172a' : '#f8fafc');
    root.style.setProperty('--text-muted', theme === 'light' ? '#475569' : '#94a3b8');
    root.style.setProperty('--border-color', theme === 'light' ? '#cbd5e1' : '#334155');

    // Default colors based on theme
    let primary = '#6366f1';
    let secondary = '#10b981';

    if (theme === 'ocean') {
        primary = '#3b82f6';
        secondary = '#06b6d4';
    } else if (theme === 'fire') {
        primary = '#ef4444';
        secondary = '#f97316';
    } else if (theme === 'light') {
        primary = '#4f46e5';
        secondary = '#059669';
    }

    // Override with custom colors if they exist
    const custom = getCustomColors();
    if (custom) {
        primary = custom.primary;
        secondary = custom.secondary;
    }

    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-secondary', secondary);
};

export const getWakeLockEnabled = (): boolean => {
    const stored = localStorage.getItem(WAKE_LOCK_KEY);
    return stored !== null ? JSON.parse(stored) : true;
};

export const saveWakeLockEnabled = (enabled: boolean) => {
    localStorage.setItem(WAKE_LOCK_KEY, JSON.stringify(enabled));
};

export const getVolume = (): number => {
    const stored = localStorage.getItem(VOLUME_KEY);
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

export const loadDefaultExercises = (): number => {
    const current = getExercises();
    const currentNames = new Set(current.map(e => e.name.trim().toLowerCase()));
    const newToAdd = DEFAULT_EXERCISES.filter(def => !currentNames.has(def.name.trim().toLowerCase()));
    if (newToAdd.length === 0) return 0;
    const updated = [...current, ...newToAdd];
    saveExercises(updated);
    return newToAdd.length;
};

export const getAllData = () => {
    return {
        exercises: getExercises(),
        routines: getRoutines(),
        templates: getRoutineTemplates(),
        logs: getWorkoutLogs(),
        measurements: getMeasurements(),
        profile: getProfile(),
        customMetrics: getCustomMetricConfigs(),
        timestamp: new Date().toISOString()
    };
};

export const restoreData = (data: FullBackupData, mode: 'merge' | 'overwrite') => {
  if (mode === 'overwrite') {
    saveExercises(data.exercises || []);
    saveRoutines(data.routines || []);
    saveRoutineTemplates(data.templates || []);
    localStorage.setItem(LOG_KEY, JSON.stringify(data.logs || []));
    saveMeasurements(data.measurements || []);
    saveProfile(data.profile || { birthDate: undefined, gender: 'M', height: undefined });
    saveCustomMetricConfigs(data.customMetrics || []);
  } else {
    // Merge exercises
    const existingExercises = getExercises();
    const exNames = new Set(existingExercises.map(e => e.name.toLowerCase().trim()));
    const newEx = (data.exercises || []).filter(e => !exNames.has(e.name.toLowerCase().trim()));
    saveExercises([...existingExercises, ...newEx]);

    // Merge routines
    const existingRoutines = getRoutines();
    const routineIds = new Set(existingRoutines.map(r => r.id));
    const newRoutines = (data.routines || []).filter(r => !routineIds.has(r.id));
    saveRoutines([...existingRoutines, ...newRoutines]);

    // Merge templates
    const existingTemplates = getRoutineTemplates();
    const templateIds = new Set(existingTemplates.map(t => t.id));
    const newTemplates = (data.templates || []).filter(t => !templateIds.has(t.id));
    saveRoutineTemplates([...existingTemplates, ...newTemplates]);

    // Merge logs
    const existingLogs = getWorkoutLogs();
    const logIds = new Set(existingLogs.map(l => l.id));
    const newLogs = (data.logs || []).filter(l => !logIds.has(l.id));
    localStorage.setItem(LOG_KEY, JSON.stringify([...existingLogs, ...newLogs]));

    // Merge measurements
    const existingMeasurements = getMeasurements();
    const measurementIds = new Set(existingMeasurements.map(m => m.id));
    const newMeasurements = (data.measurements || []).filter(m => !measurementIds.has(m.id));
    saveMeasurements([...existingMeasurements, ...newMeasurements]);
    
    // Custom Metrics
    const existingMetrics = getCustomMetricConfigs();
    const metricIds = new Set(existingMetrics.map(m => m.id));
    const newMetrics = (data.customMetrics || []).filter(m => !metricIds.has(m.id));
    saveCustomMetricConfigs([...existingMetrics, ...newMetrics]);

    if (data.profile) saveProfile(data.profile);
  }
};
