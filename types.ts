
export enum MuscleGroup {
  Chest = 'Petto',
  Back = 'Schiena',
  Legs = 'Gambe',
  Shoulders = 'Spalle',
  Arms = 'Braccia',
  Abs = 'Addominali',
  Cardio = 'Cardio',
  FullBody = 'Full Body',
  Other = 'Altro'
}

export enum ExerciseType {
  Weighted = 'Peso e Ripetizioni',
  Duration = 'Tempo',
  Bodyweight = 'Corpo Libero'
}

export type ThemeType = 'iron' | 'ocean' | 'fire' | 'light';
export type Language = 'it' | 'en' | 'fr' | 'de';
export type SetType = 'normal' | 'warmup' | 'failure' | 'drop';
export type Gender = 'M' | 'F' | 'O';

export interface UserProfile {
  birthDate?: string; // Formato ISO YYYY-MM-DD
  gender?: Gender;
  height?: number; // In cm
}

export interface CustomMetricConfig {
  id: string;
  label: string;
  unit: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  type: ExerciseType;
  notes?: string;
  link?: string;
  defaultRestSeconds?: number;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetReps?: string;
  targetWeight?: string;
  targetRestSeconds?: number;
  isSuperset: boolean;
  supersetGroupId?: string;
}

export interface RoutineDay {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  days: RoutineDay[];
}

export interface RoutineTemplate {
  id: string;
  name: string;
  days: RoutineDay[];
}

export interface CompletedSet {
  reps: number;
  weight: number;
  durationSeconds: number;
  completed: boolean;
  type?: SetType;
  rpe?: number;
}

export interface WorkoutLogExercise {
  exerciseId: string;
  sets: CompletedSet[];
}

export interface WorkoutLog {
  id: string;
  date: string;
  routineId?: string;
  routineDayId?: string;
  exercises: WorkoutLogExercise[];
  durationMinutes: number;
  calories?: number;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  arms?: number;
  legs?: number;
  neck?: number;   // Aggiunto per BF Calc
  hips?: number;   // Aggiunto per BF Calc
  customValues?: Record<string, number>;
}

export type NavigationTab = 'dashboard' | 'exercises' | 'routines' | 'history' | 'stats' | 'measurements' | 'calculator' | 'settings';
