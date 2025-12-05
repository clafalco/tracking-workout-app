

import React, { useState, useEffect, useRef } from 'react';
import { Routine, RoutineDay, WorkoutLog, WorkoutLogExercise, CompletedSet, Exercise, MuscleGroup, ExerciseType, RoutineExercise, SetType } from '../types';
import { getExercises, saveWorkoutLog, saveExercises, getWorkoutLogs, getWakeLockEnabled, getVolume } from '../services/storageService';
import { generateExerciseAdvice } from '../services/geminiService';
import { Timer, HelpCircle, ChevronLeft, Save, Play, Pause, Square, RotateCcw, Check, Plus, Search, X, Filter, ArrowLeft, Minus, SkipForward, History, ExternalLink, StickyNote, AlignLeft, Minimize2, Flame, AlertCircle, Layers } from 'lucide-react';
import { MUSCLE_GROUP_COLORS } from '../constants';

interface ActiveWorkoutProps {
  routine: Routine | null;
  dayId: string | null;
  onFinish: () => void;
}

interface ActiveTimerState {
  exIndex: number;
  setIndex: number;
  timeLeft: number;
  initialTime: number;
  isRunning: boolean;
}

interface RestTimerState {
    isActive: boolean;
    timeLeft: number;
    totalTime: number;
}

// --- GLOBAL AUDIO CONTEXT (Singleton for iOS) ---
let globalAudioCtx: AudioContext | any = null;

const getAudioContext = () => {
    if (!globalAudioCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
            globalAudioCtx = new Ctx();
        }
    }
    return globalAudioCtx;
};

// Helper to unlock AudioContext on user interaction
const unlockAudioContext = async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch(e) { console.error("Resume failed", e); }
    }
}

// Helper for Audio generation
const playTimerSound = async (type: 'start' | 'finish' | 'tick' | 'rest_finish', volume: number) => {
    try {
        if (volume <= 0) return; // Mute if volume is 0

        const ctx = getAudioContext();
        if (!ctx) return;
        
        // NOTE: We don't call resume() here because this might be inside a timer loop.
        // It must be unlocked via unlockAudioContext() on click events first.

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Master Volume Scaling (0.1 is usually good max for simple tones)
        const masterGain = 0.1 * volume;

        if (type === 'start') {
            // Single short high beep
            osc.frequency.value = 880; 
            gain.gain.value = masterGain;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'tick') {
            // Short, sharp tick
            osc.frequency.value = 1000;
            gain.gain.value = masterGain * 0.5; // Ticks slightly quieter
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } else if (type === 'finish') {
            // Double beep pattern
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(masterGain, ctx.currentTime);
            
            osc.start();
            
            // First beep end
            gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
            
            // Second beep start (higher pitch)
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(masterGain, ctx.currentTime + 0.3);
            
            // Second beep end
            osc.stop(ctx.currentTime + 0.6);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        } else if (type === 'rest_finish') {
            // Distinct "Go" sound (slide up)
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(masterGain, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.error("Audio error", e);
    }
};

// --- NEW COMPONENT: Number Stepper for Mobile UX ---
interface NumberStepperProps {
    value: number;
    onChange: (val: number) => void;
    step?: number;
    min?: number;
    suffix?: string;
    placeholder?: string;
    className?: string;
    isTime?: boolean; // New prop for Time formatting
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, step = 1, min = 0, suffix = '', placeholder = '0', className = '', isTime = false }) => {
    const handleDelta = (delta: number) => {
        const current = value || 0;
        const next = Math.max(min, current + delta);
        // Fix floating point issues
        const cleanNext = Math.round(next * 100) / 100;
        onChange(cleanNext);
    };

    // Helper to format seconds into M:SS
    const formatTimeDisplay = (totalSeconds: number) => {
        if (!totalSeconds) return '';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className={`flex items-center bg-dark rounded-lg border border-slate-600 h-10 overflow-hidden ${className}`}>
            <button 
                onClick={() => handleDelta(-step)}
                className="w-8 h-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-gray-400 border-r border-slate-700"
            >
                <Minus size={14} />
            </button>
            <div className="flex-1 px-1 text-center relative flex items-center justify-center">
                {isTime ? (
                    <span className="text-white text-sm font-mono font-bold">
                        {value > 0 ? formatTimeDisplay(value) : <span className="text-gray-600 font-sans font-normal text-xs">{placeholder}</span>}
                    </span>
                ) : (
                    <input 
                        type="number" 
                        className="w-full bg-transparent text-white text-center text-sm focus:outline-none p-0 m-0 appearance-none"
                        value={value === 0 ? '' : value}
                        placeholder={placeholder}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        // Hide arrows in Webkit
                        style={{ MozAppearance: 'textfield' }} 
                    />
                )}
            </div>
            <button 
                onClick={() => handleDelta(step)}
                className="w-8 h-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-gray-400 border-l border-slate-700"
            >
                <Plus size={14} />
            </button>
        </div>
    );
};
// --------------------------------------------------

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ routine, dayId, onFinish }) => {
  const [exercisesDB, setExercisesDB] = useState<Exercise[]>([]);
  const [log, setLog] = useState<WorkoutLog>({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    routineId: routine?.id,
    routineDayId: dayId || undefined,
    exercises: [],
    durationMinutes: 0
  });
  const [activeRoutineDay, setActiveRoutineDay] = useState<RoutineDay | undefined>(undefined);
  const [startTime] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  
  // Timer State
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Auto Rest Timer State
  const [restTimer, setRestTimer] = useState<RestTimerState>({ isActive: false, timeLeft: 0, totalTime: 0 });
  const restTimerIntervalRef = useRef<number | null>(null);
  
  // Settings State
  const [volume, setVolume] = useState(1.0);

  // UI State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [ghostData, setGhostData] = useState<Record<string, string>>({});

  // Notes Modal State
  const [viewingNote, setViewingNote] = useState<{title: string, text: string} | null>(null);

  // Add Exercise Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newExerciseData, setNewExerciseData] = useState<Partial<Exercise>>({
      name: '',
      muscleGroup: MuscleGroup.Chest,
      type: ExerciseType.Weighted
  });

  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // Load Volume
    setVolume(getVolume());

    // Initialize/Unlock Audio on mount (though user interaction is preferred)
    getAudioContext();

    // WAKE LOCK LOGIC
    const enableWakeLock = async () => {
        if (getWakeLockEnabled() && 'wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            } catch (err) {
                console.error('Wake Lock Error:', err);
            }
        }
    };

    enableWakeLock();

    // Re-acquire lock if page visibility changes (e.g. switching tabs and back)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            enableWakeLock();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setExercisesDB(getExercises());
    
    // FETCH GHOST DATA (HISTORY)
    const logs = getWorkoutLogs();
    const history: Record<string, string> = {};

    if (routine && dayId) {
      const day = routine.days.find(d => d.id === dayId);
      if (day) {
        setActiveRoutineDay(JSON.parse(JSON.stringify(day)));
        
        // Init logs for active day
        const initialLogExercises: WorkoutLogExercise[] = day.exercises.map(ex => {
             // Find history for this exercise
             const previousLogs = logs
                .filter(l => l.exercises.some(e => e.exerciseId === ex.exerciseId))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             
             if (previousLogs.length > 0) {
                 const lastLog = previousLogs[0];
                 const lastEx = lastLog.exercises.find(e => e.exerciseId === ex.exerciseId);
                 if (lastEx) {
                     // Calculate summary: e.g. "20kg x 10" (max weight or last set)
                     const bestSet = lastEx.sets.reduce((prev, current) => (current.weight > prev.weight ? current : prev), lastEx.sets[0]);
                     if (bestSet && bestSet.weight > 0) {
                         history[ex.exerciseId] = `${bestSet.weight}kg x ${bestSet.reps}`;
                     } else if (bestSet && bestSet.reps > 0) {
                          history[ex.exerciseId] = `${bestSet.reps} reps`;
                     }
                 }
             }

             // Determine initial value based on type
             const dbEx = getExercises().find(e => e.id === ex.exerciseId);
             const isDuration = dbEx?.type === ExerciseType.Duration;
             
             const targetVal = isDuration 
                ? parseInt(ex.targetReps || '0') 
                : parseInt(ex.targetReps?.split('-')[0] || '0');

             return {
                exerciseId: ex.exerciseId,
                sets: Array(ex.targetSets || 3).fill(null).map((_, i) => ({ 
                    reps: isDuration ? 0 : targetVal || 0,
                    weight: parseFloat(ex.targetWeight?.split('-')[0] || '0') || 0,
                    durationSeconds: isDuration ? targetVal || 0 : 0,
                    completed: false,
                    type: 'normal',
                    rpe: 0
                }))
             };
        });
        setLog(prev => ({ ...prev, exercises: initialLogExercises }));
      }
    }
    setGhostData(history);
  }, [routine, dayId]);

  // Global Workout Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Set Countdown Timer Logic
  useEffect(() => {
    if (activeTimer && activeTimer.isRunning) {
        timerIntervalRef.current = window.setInterval(() => {
            setActiveTimer(prev => {
                if (!prev) return null;
                if (prev.timeLeft <= 0) {
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                    playTimerSound('finish', volume);
                    updateSet(prev.exIndex, prev.setIndex, 'durationSeconds', prev.initialTime);
                    updateSet(prev.exIndex, prev.setIndex, 'completed', true);
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    return { ...prev, isRunning: false, timeLeft: 0 };
                }
                // Tick in last 5 seconds
                if (prev.timeLeft <= 5) {
                    playTimerSound('tick', volume);
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);
    } else {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimer?.isRunning, volume]);

  // Auto Rest Timer Logic
  useEffect(() => {
      if (restTimer.isActive && restTimer.timeLeft > 0) {
          restTimerIntervalRef.current = window.setInterval(() => {
              setRestTimer(prev => {
                  if (prev.timeLeft <= 1) {
                      playTimerSound('rest_finish', volume);
                      if (navigator.vibrate) navigator.vibrate(200);
                      return { ...prev, isActive: false, timeLeft: 0 };
                  }
                  // Tick in last 5 seconds
                  if (prev.timeLeft <= 5) {
                      playTimerSound('tick', volume);
                  }
                  return { ...prev, timeLeft: prev.timeLeft - 1 };
              });
          }, 1000);
      } else {
          if (restTimerIntervalRef.current) clearInterval(restTimerIntervalRef.current);
      }
      return () => {
          if (restTimerIntervalRef.current) clearInterval(restTimerIntervalRef.current);
      }
  }, [restTimer.isActive, volume]);

  const updateSet = (exIndex: number, setIndex: number, field: keyof CompletedSet, value: any) => {
    // Unlock audio on interaction
    unlockAudioContext();

    const newExercises = [...log.exercises];
    newExercises[exIndex].sets[setIndex] = {
      ...newExercises[exIndex].sets[setIndex],
      [field]: value
    };
    setLog({ ...log, exercises: newExercises });

    // TRIGGER AUTO REST TIMER
    if (field === 'completed' && value === true) {
        const routineEx = activeRoutineDay?.exercises[exIndex];
        const restTime = routineEx?.targetRestSeconds;
        
        // Trigger if rest time is defined and greater than 0, regardless of exercise type
        if (restTime && restTime > 0) {
            setRestTimer({ isActive: true, timeLeft: restTime, totalTime: restTime });
        }
    }
  };

  const toggleSetType = (exIndex: number, setIndex: number) => {
      unlockAudioContext();
      const currentType = log.exercises[exIndex].sets[setIndex].type || 'normal';
      let nextType: SetType = 'normal';
      
      switch (currentType) {
          case 'normal': nextType = 'warmup'; break;
          case 'warmup': nextType = 'failure'; break;
          case 'failure': nextType = 'drop'; break;
          case 'drop': nextType = 'normal'; break;
          default: nextType = 'normal';
      }
      
      updateSet(exIndex, setIndex, 'type', nextType);
  };

  const addSet = (exIndex: number) => {
      const newExercises = [...log.exercises];
      const prevSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1];
      newExercises[exIndex].sets.push({...prevSet, completed: false, type: 'normal', rpe: 0}); 
      setLog({ ...log, exercises: newExercises });
  }

  const removeSet = (exIndex: number) => {
      const newExercises = [...log.exercises];
      if (newExercises[exIndex].sets.length > 1) {
          newExercises[exIndex].sets.pop();
          setLog({ ...log, exercises: newExercises });
      }
  }

  // Timer Controls
  const toggleTimer = (exIndex: number, setIndex: number, currentDuration: number) => {
      // Unlock Audio context on click
      unlockAudioContext();

      if (activeTimer?.exIndex === exIndex && activeTimer?.setIndex === setIndex) {
          setActiveTimer(prev => {
              if (prev && !prev.isRunning) playTimerSound('start', volume); 
              return prev ? { ...prev, isRunning: !prev.isRunning } : null
          });
      } else {
          playTimerSound('start', volume);
          setActiveTimer({
              exIndex,
              setIndex,
              initialTime: currentDuration || 60,
              timeLeft: currentDuration || 60,
              isRunning: true
          });
      }
  };

  const stopTimer = () => {
      if (activeTimer) {
          const elapsed = activeTimer.initialTime - activeTimer.timeLeft;
          if (elapsed > 0) {
             updateSet(activeTimer.exIndex, activeTimer.setIndex, 'durationSeconds', elapsed);
             updateSet(activeTimer.exIndex, activeTimer.setIndex, 'completed', true);
          }
          setActiveTimer(null);
      }
  };

  const finishWorkout = () => {
    const finalLog = {
      ...log,
      durationMinutes: Math.floor(elapsed / 60)
    };
    saveWorkoutLog(finalLog);
    onFinish();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const askAI = async (exName: string) => {
      setAdviceLoading(true);
      setAiAdvice(null);
      const advice = await generateExerciseAdvice(exName);
      setAiAdvice(advice);
      setAdviceLoading(false);
  }

  // AD-HOC Exercise Handling
  const handleAddAdHocExercise = (exerciseId: string) => {
      if (!activeRoutineDay) return;

      const newRoutineEx: RoutineExercise = {
          id: Date.now().toString(),
          exerciseId: exerciseId,
          targetSets: 3, 
          targetReps: '',
          targetWeight: '',
          targetRestSeconds: 60,
          isSuperset: false
      };
      
      const updatedDay = {
          ...activeRoutineDay,
          exercises: [...activeRoutineDay.exercises, newRoutineEx]
      };
      setActiveRoutineDay(updatedDay);

      const newLogEx: WorkoutLogExercise = {
          exerciseId: exerciseId,
          sets: Array(3).fill(null).map(() => ({
              reps: 0,
              weight: 0,
              durationSeconds: 0,
              completed: false,
              type: 'normal',
              rpe: 0
          }))
      };
      setLog(prev => ({...prev, exercises: [...prev.exercises, newLogEx]}));
      
      setShowAddModal(false);
      setSearchTerm('');
  };

  const handleQuickCreate = () => {
      if (!newExerciseData.name) return;

      const newEx: Exercise = {
          id: Date.now().toString(),
          name: newExerciseData.name,
          muscleGroup: newExerciseData.muscleGroup as MuscleGroup,
          type: newExerciseData.type as ExerciseType,
          notes: ''
      };

      const updatedList = [...exercisesDB, newEx];
      saveExercises(updatedList);
      setExercisesDB(updatedList);
      
      handleAddAdHocExercise(newEx.id);
      setIsCreatingNew(false);
  };

  const filteredAddExercises = exercisesDB.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper for Row Styling based on Set Type
  const getRowStyle = (type: SetType = 'normal') => {
      switch (type) {
          case 'warmup': return 'bg-yellow-500/10 border-l-2 border-l-yellow-500';
          case 'failure': return 'bg-red-500/10 border-l-2 border-l-red-500';
          case 'drop': return 'bg-purple-500/10 border-l-2 border-l-purple-500';
          default: return 'border-l-2 border-l-transparent';
      }
  };

  const getSetBadge = (type: SetType = 'normal', index: number) => {
      switch (type) {
          case 'warmup': return <span className="text-yellow-500 font-bold text-xs">W</span>;
          case 'failure': return <span className="text-red-500 font-bold text-xs">F</span>;
          case 'drop': return <span className="text-purple-400 font-bold text-xs">D</span>;
          default: return <span className="text-gray-400 font-mono">{index + 1}</span>;
      }
  };

  if (!activeRoutineDay) return <div className="p-10 text-center text-white">Caricamento allenamento...</div>;

  return (
    <div className="bg-dark min-h-screen flex flex-col pb-20 relative">
      {/* Header */}
      <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-slate-700 p-4 z-10 flex justify-between items-center">
        <button onClick={onFinish} className="text-gray-400"><ChevronLeft /></button>
        <div className="text-center">
            <h2 className="font-bold text-white">{activeRoutineDay.name}</h2>
            <div className="text-primary font-mono text-sm flex items-center justify-center gap-1">
                <Timer size={14}/> {formatTime(elapsed)}
            </div>
        </div>
        <button onClick={finishWorkout} className="text-emerald-400 font-bold text-sm uppercase flex items-center gap-1">
            <Save size={18}/> Fine
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {log.exercises.map((exLog, i) => {
            const routineEx = activeRoutineDay.exercises[i];
            const dbEx = exercisesDB.find(e => e.id === routineEx.exerciseId);

            if (!dbEx) return null;

            const isTimed = dbEx.type === ExerciseType.Duration;
            const ghost = ghostData[dbEx.id];

            return (
                <div key={i} className="bg-surface rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${MUSCLE_GROUP_COLORS[dbEx.muscleGroup]}`}></div>
                                <h3 className="font-bold text-lg text-white">{dbEx.name}</h3>
                            </div>
                            
                            {/* EXERCISE INFO: TARGETS + SECONDARY MUSCLES */}
                            <div className="flex flex-col gap-1">
                                {/* Secondary Muscles */}
                                {dbEx.secondaryMuscles && dbEx.secondaryMuscles.length > 0 && (
                                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Layers size={10} className="text-gray-500"/>
                                        + {dbEx.secondaryMuscles.join(', ')}
                                    </div>
                                )}
                                
                                <div className="text-xs text-gray-400 flex items-center gap-3 flex-wrap">
                                    {isTimed ? (
                                        <span>Target: {formatTime(parseInt(routineEx.targetReps || '0'))}</span>
                                    ) : (
                                        <span>Target: {routineEx.targetSets || 0} x {routineEx.targetReps || '-'}</span>
                                    )}
                                    {routineEx.targetWeight && <span>@ {routineEx.targetWeight}kg</span>}
                                    {routineEx.targetRestSeconds && (
                                    <span className="flex items-center gap-1 text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                        <Timer size={10} /> {formatTime(routineEx.targetRestSeconds)} Rest
                                    </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             {dbEx.link && (
                                <a 
                                    href={dbEx.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white bg-slate-700/50 p-2 rounded-full transition-colors"
                                    title="Apri Link Video"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            )}
                            {dbEx.notes && (
                                <button 
                                    onClick={() => setViewingNote({title: dbEx.name, text: dbEx.notes || ''})} 
                                    className="text-gray-400 hover:text-white bg-slate-700/50 p-2 rounded-full transition-colors"
                                    title="Leggi Note"
                                >
                                    <StickyNote size={18} />
                                </button>
                            )}
                            <button onClick={() => askAI(dbEx.name)} className="text-primary bg-primary/10 p-2 rounded-full" title="Chiedi all'AI">
                                <HelpCircle size={20}/>
                            </button>
                        </div>
                    </div>

                    <div className="p-2">
                        <div className="grid grid-cols-12 gap-2 mb-2 text-xs text-gray-500 uppercase font-bold text-center">
                            <div className="col-span-1">Set</div>
                            <div className="col-span-4">Kg</div>
                            <div className="col-span-4">{isTimed ? 'Tempo' : 'Reps'}</div>
                            <div className="col-span-2">RPE</div>
                            <div className="col-span-1"></div>
                        </div>
                        {exLog.sets.map((set, sIndex) => {
                            const isTimerActive = activeTimer?.exIndex === i && activeTimer?.setIndex === sIndex;
                            const rowStyle = getRowStyle(set.type);
                            
                            return (
                                <div key={sIndex} className={`grid grid-cols-12 gap-2 mb-2 items-center transition-all rounded p-1 ${rowStyle} ${set.completed ? 'opacity-60' : 'opacity-100'}`}>
                                    {/* Set Type Toggle */}
                                    <button 
                                        onClick={() => toggleSetType(i, sIndex)}
                                        className="col-span-1 text-center bg-dark rounded py-2 hover:bg-slate-700 transition-colors flex items-center justify-center h-10 border border-slate-600"
                                    >
                                        {getSetBadge(set.type, sIndex)}
                                    </button>

                                    <div className="col-span-4">
                                        <NumberStepper 
                                            value={set.weight || 0}
                                            onChange={(val) => updateSet(i, sIndex, 'weight', val)}
                                            step={1}
                                            placeholder="Kg"
                                        />
                                    </div>
                                    <div className="col-span-4 relative">
                                        {isTimed ? (
                                            <div className="flex items-center gap-1">
                                                {isTimerActive ? (
                                                     <div className="flex-1 flex items-center justify-between bg-dark border border-primary rounded px-2 py-1 h-10">
                                                        <span className="font-mono font-bold text-primary text-lg">
                                                            {formatTime(activeTimer.timeLeft)}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => toggleTimer(i, sIndex, 0)} className="text-yellow-500">
                                                                <Pause size={16} fill="currentColor"/>
                                                            </button>
                                                            <button onClick={stopTimer} className="text-red-500">
                                                                <Square size={16} fill="currentColor"/>
                                                            </button>
                                                        </div>
                                                     </div>
                                                ) : (
                                                    <div className="flex-1 flex gap-1 items-center">
                                                        <div className="flex-1">
                                                            <NumberStepper 
                                                                value={set.durationSeconds || 0}
                                                                onChange={(val) => updateSet(i, sIndex, 'durationSeconds', val)}
                                                                step={10}
                                                                placeholder="Tempo"
                                                                isTime={true}
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => toggleTimer(i, sIndex, set.durationSeconds || 60)}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white w-8 h-10 rounded-lg flex items-center justify-center shrink-0"
                                                        >
                                                            <Play size={14} fill="currentColor" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <NumberStepper 
                                                value={set.reps || 0}
                                                onChange={(val) => updateSet(i, sIndex, 'reps', val)}
                                                step={1}
                                                placeholder="Reps"
                                            />
                                        )}
                                        {/* GHOST SET INFO */}
                                        {ghost && sIndex === 0 && !isTimed && (
                                            <div className="absolute -bottom-3 left-0 w-full text-center text-[9px] text-gray-500 flex items-center justify-center gap-1">
                                                <History size={8}/> Scorsa: {ghost}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* RPE Input */}
                                    <div className="col-span-2">
                                        <input 
                                            type="number"
                                            min="0" max="10"
                                            value={set.rpe || ''}
                                            onChange={(e) => updateSet(i, sIndex, 'rpe', parseFloat(e.target.value))}
                                            placeholder="-"
                                            className="w-full bg-dark text-white text-center h-10 rounded-lg border border-slate-600 focus:outline-none focus:border-primary text-sm"
                                        />
                                    </div>

                                    <div className="col-span-1 flex justify-center">
                                        <button 
                                            onClick={() => updateSet(i, sIndex, 'completed', !set.completed)}
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${set.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600 hover:border-emerald-400'}`}
                                        >
                                            {set.completed && <Check size={16} className="text-white" strokeWidth={4} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => addSet(i)} className="flex-1 py-2 bg-slate-700 rounded text-xs text-gray-300 hover:bg-slate-600">+ Aggiungi Set</button>
                            <button onClick={() => removeSet(i)} className="px-3 py-2 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/50">-</button>
                        </div>
                    </div>
                </div>
            );
        })}

        {/* Add Exercise Button */}
        <button 
            onClick={() => {
                setSearchTerm('');
                setIsCreatingNew(false);
                setShowAddModal(true);
            }} 
            className="w-full py-4 rounded-xl border-2 border-dashed border-slate-600 text-gray-400 hover:text-white hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-semibold"
        >
            <Plus size={20} /> Aggiungi Esercizio Extra
        </button>
      </div>
      
      {/* AUTO REST TIMER POP-UP (FULL SCREEN OVERLAY) */}
      {restTimer.isActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-300">
            <h2 className="text-3xl font-bold text-white mb-8">Recupero</h2>
            
            <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="128" cy="128" r="120" className="text-slate-800" strokeWidth="12" fill="none"/>
                    <circle 
                        cx="128" cy="128" r="120" 
                        className="text-primary transition-all duration-1000 ease-linear" 
                        strokeWidth="12" 
                        fill="none" 
                        strokeDasharray={753} // 2 * PI * 120
                        strokeDashoffset={753 - (753 * restTimer.timeLeft) / restTimer.totalTime}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                     <span className={`text-8xl font-bold tracking-tighter transition-colors ${restTimer.timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {formatTime(restTimer.timeLeft)}
                     </span>
                     <span className="text-xl text-gray-400 mt-2">rimanenti</span>
                </div>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-4">
                <button 
                    onClick={() => {
                        unlockAudioContext(); // Unlock on interaction
                        setRestTimer(prev => ({...prev, timeLeft: prev.timeLeft + 30, totalTime: prev.totalTime + 30}));
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-lg border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={24}/> Aggiungi 30s
                </button>
                <button 
                    onClick={() => setRestTimer(prev => ({...prev, isActive: false}))}
                    className="bg-transparent border-2 border-slate-600 text-gray-400 hover:text-white hover:border-white py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                >
                    <SkipForward size={24}/> Salta Riposo
                </button>
                {/* Optional minimize button if they really want to see logs */}
                <button 
                    onClick={() => setRestTimer(prev => ({...prev, isActive: false}))} 
                    className="mt-4 text-gray-500 text-sm flex items-center justify-center gap-1 hover:text-gray-300"
                >
                   <Minimize2 size={16}/> Chiudi Timer
                </button>
            </div>
        </div>
      )}

      {/* AI Modal */}
      {(aiAdvice || adviceLoading) && (
          <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50">
              <div className="bg-surface w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 border-t sm:border border-slate-700 max-h-[80vh] overflow-y-auto">
                  <h3 className="font-bold text-lg mb-4 text-primary flex items-center gap-2">
                      <Wand2Icon className="animate-pulse"/> Gemini Coach
                  </h3>
                  {adviceLoading ? (
                      <div className="space-y-2">
                          <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4"></div>
                          <div className="h-4 bg-slate-700 rounded animate-pulse"></div>
                          <div className="h-4 bg-slate-700 rounded animate-pulse w-5/6"></div>
                      </div>
                  ) : (
                      <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                          {aiAdvice}
                      </div>
                  )}
                  <button onClick={() => {setAiAdvice(null); setAdviceLoading(false)}} className="w-full mt-6 bg-slate-700 py-3 rounded-xl font-semibold">Chiudi</button>
              </div>
          </div>
      )}

      {/* NOTES Modal */}
      {viewingNote && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-surface p-6 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl relative">
                  <button 
                      onClick={() => setViewingNote(null)} 
                      className="absolute top-4 right-4 text-gray-400 hover:text-white"
                  >
                      <X size={20}/>
                  </button>
                  <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
                      <AlignLeft size={20} className="text-primary"/> Note: {viewingNote.title}
                  </h3>
                  <div className="bg-dark p-4 rounded-lg text-gray-300 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800">
                      {viewingNote.text}
                  </div>
                  <button 
                    onClick={() => setViewingNote(null)} 
                    className="w-full mt-6 bg-slate-700 hover:bg-slate-600 py-2 rounded-xl font-medium text-white transition-colors"
                  >
                    Chiudi
                  </button>
              </div>
          </div>
      )}

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-surface w-full max-w-md rounded-2xl border border-slate-700 flex flex-col max-h-[85vh]">
                {!isCreatingNew ? (
                    <>
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-white">Aggiungi Esercizio</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400"><X size={20}/></button>
                        </div>
                        <div className="p-4 border-b border-slate-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Cerca esercizio..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-dark text-white pl-10 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary border border-slate-600"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {filteredAddExercises.map(ex => (
                                <button 
                                    key={ex.id}
                                    onClick={() => handleAddAdHocExercise(ex.id)}
                                    className="w-full bg-dark p-3 rounded-lg flex justify-between items-center border border-slate-800 hover:border-primary hover:bg-slate-800 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-8 rounded-full ${MUSCLE_GROUP_COLORS[ex.muscleGroup]}`}></div>
                                        <div>
                                            <div className="font-semibold text-sm text-white">{ex.name}</div>
                                            <div className="text-xs text-gray-500">{ex.muscleGroup} • {ex.type}</div>
                                        </div>
                                    </div>
                                    <Plus size={18} className="text-primary"/>
                                </button>
                            ))}
                            {filteredAddExercises.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 mb-4">Nessun esercizio trovato.</p>
                                    <button 
                                        onClick={() => {
                                            setNewExerciseData(prev => ({...prev, name: searchTerm}));
                                            setIsCreatingNew(true);
                                        }}
                                        className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm"
                                    >
                                        + Crea "{searchTerm}"
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-700">
                             <button 
                                onClick={() => {
                                    setNewExerciseData({ name: '', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted });
                                    setIsCreatingNew(true);
                                }}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium"
                             >
                                Crea Nuovo Esercizio
                             </button>
                        </div>
                    </>
                ) : (
                    <>
                         <div className="flex items-center gap-2 p-4 border-b border-slate-700">
                            <button onClick={() => setIsCreatingNew(false)} className="text-gray-400 hover:text-white">
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="text-lg font-bold text-white">Nuovo Esercizio</h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                                <input 
                                    type="text" 
                                    value={newExerciseData.name} 
                                    onChange={e => setNewExerciseData({...newExerciseData, name: e.target.value})}
                                    className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                                    placeholder="Es. Curl Manubri"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Gruppo Muscolare</label>
                                <select 
                                    value={newExerciseData.muscleGroup}
                                    onChange={e => setNewExerciseData({...newExerciseData, muscleGroup: e.target.value as MuscleGroup})}
                                    className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                                >
                                    {Object.values(MuscleGroup).map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                                <select 
                                    value={newExerciseData.type}
                                    onChange={e => setNewExerciseData({...newExerciseData, type: e.target.value as ExerciseType})}
                                    className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                                >
                                    {Object.values(ExerciseType).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleQuickCreate} 
                                className="w-full bg-primary py-3 rounded-xl text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={18} /> Salva e Aggiungi
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

const Wand2Icon = ({className}: {className?: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
);

export default ActiveWorkout;