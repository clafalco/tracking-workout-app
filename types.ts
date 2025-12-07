

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

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup; // Gruppo Primario
  secondaryMuscles?: MuscleGroup[]; // Gruppi Secondari (Opzionale)
  type: ExerciseType;
  notes?: string;
  link?: string; // URL video o tutorial
  defaultRestSeconds?: number; // Tempo recupero preferito
}

export interface WorkoutSet {
  id: string;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  completed: boolean;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  targetSets: number;
  targetReps?: string; // String to allow range "8-12"
  targetWeight?: string; // String to allow range "80-90" or simple "20"
  targetRestSeconds?: number;
  isSuperset: boolean;
  supersetGroupId?: string; // Links exercises in a superset
}

export interface RoutineDay {
  id: string;
  name: string; // e.g., "Push Day"
  exercises: RoutineExercise[];
}

export interface Routine {
  id: string;
  name: string;
  startDate: string; // ISO Date
  endDate?: string; // ISO Date
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
  type?: SetType; // Tipologia di set
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

export interface WorkoutLogExercise {
  exerciseId: string;
  sets: CompletedSet[];
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO Date
  routineId?: string; // Optional if ad-hoc
  routineDayId?: string;
  exercises: WorkoutLogExercise[];
  durationMinutes: number;
  calories?: number; // Stima calorie bruciate
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
}

export type NavigationTab = 'dashboard' | 'exercises' | 'routines' | 'history' | 'stats' | 'measurements' | 'calculator' | 'settings';