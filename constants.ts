import { MuscleGroup } from "./types";

export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
    [MuscleGroup.Chest]: 'bg-red-500',
    [MuscleGroup.Back]: 'bg-blue-500',
    [MuscleGroup.Legs]: 'bg-green-500',
    [MuscleGroup.Shoulders]: 'bg-yellow-500',
    [MuscleGroup.Arms]: 'bg-purple-500',
    [MuscleGroup.Abs]: 'bg-pink-500',
    [MuscleGroup.Cardio]: 'bg-orange-500',
    [MuscleGroup.FullBody]: 'bg-teal-500',
    [MuscleGroup.Other]: 'bg-gray-500',
};