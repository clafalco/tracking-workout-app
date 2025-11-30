
import { Exercise, MuscleGroup, ExerciseType } from '../types';

export const DEFAULT_EXERCISES: Exercise[] = [
    // PETTO
    { id: 'def_1', name: 'Panca Piana Bilanciere', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted, defaultRestSeconds: 120 },
    { id: 'def_2', name: 'Panca Inclinata Manubri', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted, defaultRestSeconds: 90 },
    { id: 'def_3', name: 'Croci ai Cavi', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_4', name: 'Push-ups (Piegamenti)', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Bodyweight, defaultRestSeconds: 60 },
    { id: 'def_5', name: 'Dips', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Bodyweight, defaultRestSeconds: 90 },
    
    // SCHIENA
    { id: 'def_6', name: 'Stacco da Terra (Deadlift)', muscleGroup: MuscleGroup.Back, type: ExerciseType.Weighted, defaultRestSeconds: 180 },
    { id: 'def_7', name: 'Trazioni (Pull-ups)', muscleGroup: MuscleGroup.Back, type: ExerciseType.Bodyweight, defaultRestSeconds: 90 },
    { id: 'def_8', name: 'Rematore Bilanciere', muscleGroup: MuscleGroup.Back, type: ExerciseType.Weighted, defaultRestSeconds: 90 },
    { id: 'def_9', name: 'Lat Machine', muscleGroup: MuscleGroup.Back, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_10', name: 'Pulley Basso', muscleGroup: MuscleGroup.Back, type: ExerciseType.Weighted, defaultRestSeconds: 60 },

    // GAMBE
    { id: 'def_11', name: 'Squat Bilanciere', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted, defaultRestSeconds: 180 },
    { id: 'def_12', name: 'Leg Press', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted, defaultRestSeconds: 120 },
    { id: 'def_13', name: 'Affondi Manubri', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted, defaultRestSeconds: 90 },
    { id: 'def_14', name: 'Leg Extension', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_15', name: 'Leg Curl', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_16', name: 'Calf Raise', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Weighted, defaultRestSeconds: 45 },

    // SPALLE
    { id: 'def_17', name: 'Military Press (Overhead)', muscleGroup: MuscleGroup.Shoulders, type: ExerciseType.Weighted, defaultRestSeconds: 120 },
    { id: 'def_18', name: 'Alzate Laterali', muscleGroup: MuscleGroup.Shoulders, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_19', name: 'Face Pull', muscleGroup: MuscleGroup.Shoulders, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_20', name: 'Arnold Press', muscleGroup: MuscleGroup.Shoulders, type: ExerciseType.Weighted, defaultRestSeconds: 90 },

    // BRACCIA
    { id: 'def_21', name: 'Curl Bilanciere', muscleGroup: MuscleGroup.Arms, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_22', name: 'Hammer Curl', muscleGroup: MuscleGroup.Arms, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_23', name: 'French Press', muscleGroup: MuscleGroup.Arms, type: ExerciseType.Weighted, defaultRestSeconds: 60 },
    { id: 'def_24', name: 'Push-down Tricipiti', muscleGroup: MuscleGroup.Arms, type: ExerciseType.Weighted, defaultRestSeconds: 60 },

    // ADDOME
    { id: 'def_25', name: 'Plank', muscleGroup: MuscleGroup.Abs, type: ExerciseType.Duration, defaultRestSeconds: 60 },
    { id: 'def_26', name: 'Crunch', muscleGroup: MuscleGroup.Abs, type: ExerciseType.Bodyweight, defaultRestSeconds: 45 },
    { id: 'def_27', name: 'Leg Raise', muscleGroup: MuscleGroup.Abs, type: ExerciseType.Bodyweight, defaultRestSeconds: 60 },

    // CARDIO
    { id: 'def_28', name: 'Tapis Roulant', muscleGroup: MuscleGroup.Cardio, type: ExerciseType.Duration, defaultRestSeconds: 0 },
    { id: 'def_29', name: 'Cyclette', muscleGroup: MuscleGroup.Cardio, type: ExerciseType.Duration, defaultRestSeconds: 0 },
    { id: 'def_30', name: 'Ellittica', muscleGroup: MuscleGroup.Cardio, type: ExerciseType.Duration, defaultRestSeconds: 0 },
    { id: 'def_31', name: 'Salto con la corda', muscleGroup: MuscleGroup.Cardio, type: ExerciseType.Duration, defaultRestSeconds: 60 },

    // CALISTHENICS / SKILLS
    { id: 'def_32', name: 'Muscle Up', muscleGroup: MuscleGroup.FullBody, type: ExerciseType.Bodyweight, defaultRestSeconds: 180 },
    { id: 'def_33', name: 'Front Lever', muscleGroup: MuscleGroup.Abs, type: ExerciseType.Duration, defaultRestSeconds: 120 },
    { id: 'def_34', name: 'Handstand (Verticale)', muscleGroup: MuscleGroup.Shoulders, type: ExerciseType.Duration, defaultRestSeconds: 90 },
    { id: 'def_35', name: 'Pistol Squat', muscleGroup: MuscleGroup.Legs, type: ExerciseType.Bodyweight, defaultRestSeconds: 90 }
];
