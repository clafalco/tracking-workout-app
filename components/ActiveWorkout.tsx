
import React, { useState, useEffect, useRef } from 'react';
import { Routine, RoutineDay, WorkoutLog, WorkoutLogExercise, CompletedSet, Exercise, MuscleGroup, ExerciseType, RoutineExercise, SetType, BodyMeasurement } from '../types';
import { getExercises, saveExercises, saveWorkoutLog, getWorkoutLogs, getWakeLockEnabled, saveActiveSession, getActiveSession, clearActiveSession, getVolume, getMeasurements } from '../services/storageService';
import { Timer, ChevronLeft, Check, Plus, Minus, Trash2, Layers, Clock, Search, X, History, AlertTriangle, Trophy, RefreshCcw, FastForward, Bell, Play, Square, Zap, User, PlusCircle } from 'lucide-react';
import { playTimerSound, unlockAudioContext } from '../services/audioService';

interface ActiveWorkoutProps {
  routine: Routine | null;
  dayId: string | null;
  onFinish: () => void;
}

interface VerticalStepperProps {
    value: number;
    onChange: (val: number) => void;
    label: string;
    step: number;
    hasPR?: boolean;
    className?: string;
}

const VerticalStepper: React.FC<VerticalStepperProps> = ({ value, onChange, label, step, hasPR, className = "" }) => {
    const handleStep = (s: number) => {
        unlockAudioContext();
        const currentValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        const newValue = Math.max(0, parseFloat((currentValue + s).toFixed(2)));
        onChange(newValue);
    };

    return (
        <div className={`flex flex-col flex-1 min-w-[42px] ${className}`}>
            <span className="text-[7px] font-black text-slate-500 uppercase text-center mb-0.5">{label}</span>
            <div className={`flex flex-col bg-slate-800 rounded-lg border transition-all overflow-hidden ${hasPR ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'border-slate-700'}`}>
                <button 
                    onClick={() => handleStep(step)} 
                    className={`h-7 flex items-center justify-center active:bg-primary/20 ${hasPR ? 'text-yellow-400' : 'text-primary'}`}
                >
                    <Plus size={10} strokeWidth={3} />
                </button>
                <input 
                    type="text"
                    inputMode="decimal"
                    className={`w-full bg-slate-900 text-center font-black text-xs focus:outline-none py-1 border-y border-slate-700/50 ${hasPR ? 'text-yellow-400 animate-pulse' : 'text-white'}`}
                    value={value === 0 ? '' : value}
                    onChange={e => {
                        const val = e.target.value.replace(',', '.');
                        if (val === '') onChange(0);
                        else if (!isNaN(Number(val))) onChange(parseFloat(val));
                    }}
                />
                <button 
                    onClick={() => handleStep(-step)} 
                    className="h-7 flex items-center justify-center text-slate-500 active:bg-red-500/20"
                >
                    <Minus size={10} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ routine, dayId, onFinish }) => {
  const [exercisesDB, setExercisesDB] = useState<Exercise[]>([]);
  const [logsDB, setLogsDB] = useState<WorkoutLog[]>([]);
  const [activeDay, setActiveDay] = useState<RoutineDay | null>(null);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastWeight, setLastWeight] = useState<number>(0);
  
  const [restTimer, setRestTimer] = useState<{ remaining: number, total: number, isMinimized: boolean } | null>(null);
  const [activeSetTimer, setActiveSetTimer] = useState<{ exIdx: number, setIdx: number, remaining: number } | null>(null);
  
  const restIntervalRef = useRef<number | null>(null);
  const setTimerIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Selector States
  const [showExSelector, setShowExSelector] = useState(false);
  const [isCreatingQuickExercise, setIsCreatingQuickExercise] = useState(false);
  const [quickExData, setQuickExData] = useState<Partial<Exercise>>({ name: '', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted });
  const [replacingExIdx, setReplacingExIdx] = useState<number | null>(null);
  const [selectorSearch, setSelectorSearch] = useState('');
  
  const [showExitConfirm, setShowExitConfirm] = useState<'cancel' | 'finish' | null>(null);

  const requestWakeLock = async () => {
    if (getWakeLockEnabled() && 'wakeLock' in navigator) {
        try {
            // @ts-ignore
            wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.warn("Wake Lock fail:", err);
        }
    }
  };

  useEffect(() => {
    setExercisesDB(getExercises());
    setLogsDB(getWorkoutLogs());
    
    const measurements = getMeasurements().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (measurements.length > 0) {
        setLastWeight(measurements[0].weight);
    }

    const saved = getActiveSession();
    if (saved) {
        setWorkoutLog(saved.log);
        setActiveDay(saved.activeRoutineDay);
        setStartTime(saved.startTime);
        setElapsedTime(Math.floor((Date.now() - saved.startTime) / 1000));
    } else if (routine && dayId) {
        const day = routine.days.find(d => d.id === dayId);
        if (day) {
            setActiveDay(day);
            const newLog: WorkoutLog = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                routineId: routine.id,
                routineDayId: day.id,
                durationMinutes: 0,
                exercises: day.exercises.map(re => ({
                    exerciseId: re.exerciseId,
                    sets: Array.from({ length: re.targetSets }, () => {
                        const dbEx = getExercises().find(e => e.id === re.exerciseId);
                        const initialReps = dbEx?.type === ExerciseType.Duration ? parseInt(re.targetReps || '60') : parseInt(re.targetReps || '10');
                        return {
                            reps: initialReps,
                            weight: parseFloat(re.targetWeight || '0'),
                            durationSeconds: 0,
                            completed: false,
                            type: 'normal'
                        };
                    })
                }))
            };
            setWorkoutLog(newLog);
            const now = Date.now();
            setStartTime(now);
            saveActiveSession({ log: newLog, activeRoutineDay: day, startTime: now, routineId: routine.id, dayId: day.id });
        }
    }

    const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    const handleVisibilityChange = async () => {
        if (wakeLockRef.current !== null && document.visibilityState === 'visible') await requestWakeLock();
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        clearInterval(timer);
        if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        if (setTimerIntervalRef.current) clearInterval(setTimerIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [routine, dayId]);

  useEffect(() => {
    if (activeSetTimer && !setTimerIntervalRef.current) {
        setTimerIntervalRef.current = window.setInterval(() => {
            setActiveSetTimer(prev => {
                if (!prev || prev.remaining <= 1) {
                    if (setTimerIntervalRef.current) clearInterval(setTimerIntervalRef.current);
                    setTimerIntervalRef.current = null;
                    if (prev && prev.remaining <= 1) {
                        playTimerSound('rest_finish', getVolume());
                        toggleSet(prev.exIdx, prev.setIdx);
                    }
                    return null;
                }
                return { ...prev, remaining: prev.remaining - 1 };
            });
        }, 1000);
    }
  }, [activeSetTimer]);

  useEffect(() => {
    if (workoutLog && activeDay) {
        saveActiveSession({ log: workoutLog, activeRoutineDay: activeDay, startTime, routineId: routine?.id, dayId: activeDay.id });
    }
  }, [workoutLog]);

  const toggleSetType = (exIdx: number, setIdx: number) => {
      if (!workoutLog) return;
      const types: SetType[] = ['normal', 'warmup', 'failure', 'drop'];
      const newLog = { ...workoutLog };
      const currentType = newLog.exercises[exIdx].sets[setIdx].type || 'normal';
      const nextIndex = (types.indexOf(currentType) + 1) % types.length;
      newLog.exercises[exIdx].sets[setIdx].type = types[nextIndex];
      setWorkoutLog(newLog);
      unlockAudioContext();
  };

  const getSetTypeStyles = (type?: SetType) => {
      switch(type) {
          case 'warmup': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'W' };
          case 'failure': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'F' };
          case 'drop': return { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'D' };
          default: return { color: 'text-slate-500', bg: 'bg-slate-800/50', border: 'border-slate-700/50', label: '' };
      }
  };

  const checkIsPR = (exerciseId: string, weight: number, reps: number) => {
      let maxWeight = 0;
      let maxRepsForWeight = 0;
      logsDB.forEach(log => {
          const ex = log.exercises.find(e => e.exerciseId === exerciseId);
          if (ex) ex.sets.forEach(s => {
              if (s.completed) {
                  if (s.weight > maxWeight) maxWeight = s.weight;
                  if (s.weight === weight && s.reps > maxRepsForWeight) maxRepsForWeight = s.reps;
              }
          });
      });
      return { 
          isWeightPR: weight > maxWeight && maxWeight > 0, 
          isRepsPR: weight === maxWeight && reps > maxRepsForWeight && maxRepsForWeight > 0 
      };
  };

  const getPersonalRecord = (exerciseId: string) => {
      let maxWeight = 0;
      logsDB.forEach(log => {
          const ex = log.exercises.find(e => e.exerciseId === exerciseId);
          if (ex) ex.sets.forEach(s => {
              if (s.completed && s.weight > maxWeight) maxWeight = s.weight;
          });
      });
      return maxWeight;
  };

  const getGhostSet = (exerciseId: string, setIndex: number) => {
      const relevantLogs = logsDB
        .filter(l => l.exercises.some(e => e.exerciseId === exerciseId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (relevantLogs.length > 0) {
          const exLog = relevantLogs[0].exercises.find(e => e.exerciseId === exerciseId);
          return exLog?.sets[setIndex] || exLog?.sets[exLog.sets.length - 1];
      }
      return null;
  };

  const startSetTimer = (exIdx: number, setIdx: number, seconds: number) => {
    if (seconds <= 0) return;
    unlockAudioContext();
    setActiveSetTimer({ exIdx, setIdx, remaining: seconds });
  };

  const toggleSet = (exIdx: number, setIdx: number) => {
    if (!workoutLog) return;
    unlockAudioContext();
    const newLog = { ...workoutLog };
    const set = newLog.exercises[exIdx].sets[setIdx];
    const isNowCompleted = !set.completed;
    set.completed = isNowCompleted;
    setWorkoutLog(newLog);

    if (activeSetTimer && activeSetTimer.exIdx === exIdx && activeSetTimer.setIdx === setIdx) setActiveSetTimer(null);

    if (isNowCompleted) {
        const prStatus = checkIsPR(newLog.exercises[exIdx].exerciseId, set.weight, set.reps);
        playTimerSound((prStatus.isWeightPR || prStatus.isRepsPR) ? 'test' : 'finish', getVolume());
        const exId = newLog.exercises[exIdx].exerciseId;
        const routineEx = activeDay?.exercises.find(re => re.exerciseId === exId);
        const restTime = routineEx?.targetRestSeconds || exercisesDB.find(e => e.id === exId)?.defaultRestSeconds || 60;
        startRestTimer(restTime);
    }
  };

  const startRestTimer = (seconds: number) => {
    if (seconds <= 0) return;
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTimer({ remaining: seconds, total: seconds, isMinimized: false });
    restIntervalRef.current = window.setInterval(() => {
        setRestTimer(prev => {
            if (!prev || prev.remaining <= 1) {
                if (restIntervalRef.current) clearInterval(restIntervalRef.current);
                playTimerSound('rest_finish', getVolume());
                return null;
            }
            if (prev.remaining <= 4) playTimerSound('tick', getVolume());
            return { ...prev, remaining: prev.remaining - 1 };
        });
    }, 1000);
  };

  const adjustRestTime = (seconds: number) => {
      setRestTimer(prev => {
          if (!prev) return null;
          const newTime = Math.max(0, prev.remaining + seconds);
          if (newTime === 0) { if (restIntervalRef.current) clearInterval(restIntervalRef.current); return null; }
          return { ...prev, remaining: newTime };
      });
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof CompletedSet, value: any) => {
    if (!workoutLog) return;
    const newLog = { ...workoutLog };
    newLog.exercises[exIdx].sets[setIdx] = { ...newLog.exercises[exIdx].sets[setIdx], [field]: value };
    setWorkoutLog(newLog);
  };

  const addSet = (exIdx: number) => {
    if (!workoutLog) return;
    const newLog = { ...workoutLog };
    const lastSet = newLog.exercises[exIdx].sets[newLog.exercises[exIdx].sets.length - 1];
    newLog.exercises[exIdx].sets.push({ 
        reps: lastSet?.reps || 10, 
        weight: lastSet?.weight || 0, 
        durationSeconds: 0, 
        completed: false,
        type: lastSet?.type || 'normal'
    });
    setWorkoutLog(newLog);
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    if (!workoutLog) return;
    const newLog = { ...workoutLog };
    if (setIdx === -1) {
        if (window.confirm("Rimuovere l'intero esercizio?")) { newLog.exercises.splice(exIdx, 1); setWorkoutLog(newLog); }
        return;
    }
    newLog.exercises[exIdx].sets.splice(setIdx, 1);
    if (newLog.exercises[exIdx].sets.length === 0) newLog.exercises.splice(exIdx, 1);
    setWorkoutLog(newLog);
  };

  const handleExerciseSelection = (exerciseId: string) => {
    if (!workoutLog) return;
    const newLog = { ...workoutLog };
    const dbEx = exercisesDB.find(e => e.id === exerciseId);
    const initialSet = { reps: dbEx?.type === ExerciseType.Duration ? 60 : 10, weight: 0, durationSeconds: 0, completed: false, type: 'normal' as SetType };
    if (replacingExIdx !== null) { newLog.exercises[replacingExIdx] = { exerciseId, sets: [initialSet] }; setReplacingExIdx(null); }
    else newLog.exercises.push({ exerciseId, sets: [initialSet] });
    setWorkoutLog(newLog);
    setShowExSelector(false);
    setIsCreatingQuickExercise(false);
  };

  const handleQuickCreateExercise = () => {
      if (!quickExData.name) return;
      const newEx: Exercise = {
          id: 'quick_' + Date.now(),
          name: quickExData.name,
          muscleGroup: quickExData.muscleGroup || MuscleGroup.Chest,
          type: quickExData.type || ExerciseType.Weighted,
          defaultRestSeconds: 60
      };
      const updatedDB = [...exercisesDB, newEx];
      saveExercises(updatedDB);
      setExercisesDB(updatedDB);
      handleExerciseSelection(newEx.id);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const confirmFinish = () => {
    if (!workoutLog) return;
    saveWorkoutLog({ ...workoutLog, durationMinutes: Math.floor(elapsedTime / 60) });
    clearActiveSession();
    onFinish();
  };

  if (!workoutLog || !activeDay) return null;

  return (
    <div className="min-h-screen bg-dark pb-32">
      <div className="sticky top-0 z-50 bg-dark/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <button onClick={() => setShowExitConfirm('cancel')} className="text-slate-500 p-2"><ChevronLeft size={24}/></button>
            <div className="leading-tight">
                <h1 className="text-xs font-black text-white uppercase tracking-tighter truncate max-w-[120px]">{activeDay.name}</h1>
                <div className="text-[10px] font-bold text-primary tabular-nums">{formatTime(elapsedTime)}</div>
            </div>
        </div>
        {restTimer && restTimer.isMinimized && (
          <button onClick={() => setRestTimer({...restTimer, isMinimized: false})} className="bg-emerald-500 text-white px-3 py-1 rounded-full flex items-center gap-2 animate-pulse active:scale-95">
              <Timer size={12} /> <span className="font-black tabular-nums text-[10px]">{formatTime(restTimer.remaining)}</span>
          </button>
        )}
        <button onClick={() => setShowExitConfirm('finish')} className="bg-primary text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95">Fine</button>
      </div>

      <div className="p-3 space-y-4">
        {workoutLog.exercises.map((exLog, exIdx) => {
            const dbEx = exercisesDB.find(e => e.id === exLog.exerciseId);
            const routineEx = activeDay.exercises.find(re => re.exerciseId === exLog.exerciseId);
            const isSuperset = routineEx?.isSuperset;
            const isTimed = dbEx?.type === ExerciseType.Duration;
            const isBodyweight = dbEx?.type === ExerciseType.Bodyweight;
            const allTimePR = getPersonalRecord(exLog.exerciseId);

            return (
                <div key={exIdx} className={`bg-surface rounded-3xl border ${isSuperset ? 'border-indigo-500/30' : 'border-slate-800'} overflow-hidden shadow-xl`}>
                    <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-black text-white uppercase truncate">
                                        {isSuperset && <Layers size={14} className="text-indigo-400 inline-block mr-1 shrink-0" />}
                                        {dbEx?.name || 'Esercizio'}
                                    </h2>
                                    <button onClick={() => { setReplacingExIdx(exIdx); setShowExSelector(true); }} className="text-slate-600 active:text-primary transition-all p-1"><RefreshCcw size={14} /></button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{dbEx?.muscleGroup}</span>
                                    {isBodyweight && (
                                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-tighter flex items-center gap-1">
                                            <User size={8}/> Corpo Libero
                                        </span>
                                    )}
                                    {allTimePR > 0 && (
                                        <span className="flex items-center gap-1 text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20 uppercase tracking-tighter">
                                            <Trophy size={8} /> PB: {allTimePR}kg
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => addSet(exIdx)} className="p-1.5 bg-slate-800 text-slate-400 rounded-lg active:bg-slate-700 transition-transform active:scale-90"><Plus size={16}/></button>
                                <button onClick={() => removeSet(exIdx, -1)} className="text-slate-700 active:text-red-500 p-1.5"><Trash2 size={16}/></button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {exLog.sets.map((set, sIdx) => {
                                const ghost = getGhostSet(exLog.exerciseId, sIdx);
                                const isTimingThisSet = activeSetTimer?.exIdx === exIdx && activeSetTimer?.setIdx === sIdx;
                                const setPRStatus = set.completed ? checkIsPR(exLog.exerciseId, set.weight, set.reps) : { isWeightPR: false, isRepsPR: false };
                                const typeStyle = getSetTypeStyles(set.type);
                                const isWeightPR = set.weight >= allTimePR && allTimePR > 0 && set.completed;
                                const totalEffectiveWeight = isBodyweight ? (lastWeight + set.weight) : set.weight;

                                return (
                                    <div key={sIdx} className={`flex items-center gap-2 p-1 rounded-xl transition-all ${set.completed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-dark/40 border border-slate-800/50'} ${isTimingThisSet ? 'ring-1 ring-emerald-500 animate-pulse' : ''}`}>
                                        <button 
                                            onClick={() => toggleSetType(exIdx, sIdx)}
                                            className={`w-7 h-7 flex flex-col items-center justify-center rounded-lg border transition-all ${typeStyle.bg} ${typeStyle.border} ${typeStyle.color} active:scale-90`}
                                        >
                                            <span className="text-[10px] font-black">{typeStyle.label || (sIdx + 1)}</span>
                                            {typeStyle.label && <span className="text-[6px] font-bold -mt-1">{sIdx + 1}</span>}
                                        </button>

                                        <div className="flex-1 flex gap-1 items-center">
                                            <VerticalStepper label={isBodyweight ? "Zav." : "Kg"} value={set.weight} step={isBodyweight ? 1 : 2.5} hasPR={isWeightPR} onChange={v => updateSet(exIdx, sIdx, 'weight', v)} />
                                            {isTimed ? (
                                                <>
                                                    <VerticalStepper label="Min" value={Math.floor(set.reps / 60)} step={1} onChange={m => updateSet(exIdx, sIdx, 'reps', (m * 60) + (set.reps % 60))} />
                                                    <VerticalStepper label="Sec" value={set.reps % 60} step={5} onChange={s => updateSet(exIdx, sIdx, 'reps', (Math.floor(set.reps / 60) * 60) + s)} />
                                                </>
                                            ) : (
                                                <VerticalStepper label="Reps" value={set.reps} step={1} hasPR={setPRStatus.isRepsPR} onChange={v => updateSet(exIdx, sIdx, 'reps', v)} />
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col items-center min-w-[30px]">
                                            {isBodyweight && lastWeight > 0 && (
                                                <div className="bg-dark/80 px-1.5 py-0.5 rounded border border-slate-700/50 flex flex-col items-center">
                                                    <span className="text-[6px] font-black text-gray-500 uppercase leading-none">Totale</span>
                                                    <span className="text-[10px] font-black text-emerald-400 tabular-nums">{totalEffectiveWeight}<span className="text-[6px] ml-0.5">kg</span></span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {(setPRStatus.isWeightPR || setPRStatus.isRepsPR) && (
                                            <div className="flex flex-col items-center px-1 animate-bounce">
                                                <Trophy size={14} className="text-yellow-500" />
                                                <span className="text-[6px] font-black text-yellow-500 uppercase tracking-tighter">New PR</span>
                                            </div>
                                        )}

                                        {ghost && !set.completed && !isTimingThisSet && (
                                            <div className="flex flex-col items-center px-1 opacity-40">
                                                <History size={10} className="text-slate-500 mb-0.5" />
                                                <span className="text-[7px] font-black text-slate-500 tabular-nums">{isTimed ? formatTime(ghost.reps) : `${ghost.weight}/${ghost.reps}`}</span>
                                            </div>
                                        )}
                                        {isTimingThisSet && <span className="text-[10px] font-black text-emerald-400 tabular-nums px-2">{formatTime(activeSetTimer.remaining)}</span>}

                                        <div className="flex items-center gap-1">
                                            {isTimed && !set.completed && !isTimingThisSet && (
                                                <button onClick={() => startSetTimer(exIdx, sIdx, set.reps)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20 text-primary border border-primary/30 active:scale-90"><Play size={16} fill="currentColor" /></button>
                                            )}
                                            {isTimingThisSet && (
                                                <button onClick={() => setActiveSetTimer(null)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/20 text-red-500 border border-red-500/30 active:scale-90"><Square size={16} fill="currentColor" /></button>
                                            )}
                                            <button onClick={() => removeSet(exIdx, sIdx)} className="p-1.5 text-slate-700 active:text-red-500"><Trash2 size={12} /></button>
                                            <button 
                                                onClick={() => toggleSet(exIdx, sIdx)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-500 text-white animate-set-pop' : 'bg-slate-800 text-slate-600 border border-slate-700'}`}
                                            >
                                                <Check size={20} strokeWidth={4} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        })}
        <button onClick={() => { setReplacingExIdx(null); setShowExSelector(true); }} className="w-full py-5 bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl text-slate-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:bg-slate-800/50 transition-colors">
            <Plus size={16} /> Aggiungi Esercizio
        </button>
      </div>

      {activeSetTimer && (
          <div className="fixed inset-0 z-[400] bg-indigo-600 flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex flex-col items-center gap-2 mb-12">
                  <div className="bg-white/20 p-4 rounded-full mb-2 animate-pulse">
                      <Play size={48} className="text-white" fill="currentColor" />
                  </div>
                  <h2 className="text-white font-black uppercase tracking-[0.2em] text-sm">Esercizio in corso</h2>
                  <div className="text-white/80 font-bold uppercase text-[10px] tracking-widest text-center px-4">
                      {exercisesDB.find(e => e.id === workoutLog.exercises[activeSetTimer.exIdx].exerciseId)?.name}
                  </div>
              </div>
              <div className="text-[10rem] font-black text-white tabular-nums drop-shadow-2xl mb-12 leading-none">
                  {formatTime(activeSetTimer.remaining)}
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12">
                   <button onClick={() => setActiveSetTimer(prev => prev ? {...prev, remaining: Math.max(0, prev.remaining - 15)} : null)} className="bg-white/10 py-5 rounded-3xl border border-white/20 text-white font-black uppercase text-xs flex items-center justify-center gap-2"><Minus size={18} /> 15s</button>
                   <button onClick={() => setActiveSetTimer(prev => prev ? {...prev, remaining: prev.remaining + 15} : null)} className="bg-white/10 py-5 rounded-3xl border border-white/20 text-white font-black uppercase text-xs flex items-center justify-center gap-2"><Plus size={18} /> 15s</button>
              </div>
              <div className="flex flex-col gap-4 w-full max-w-sm">
                  <button onClick={() => { toggleSet(activeSetTimer.exIdx, activeSetTimer.setIdx); setActiveSetTimer(null); }} className="w-full bg-white text-indigo-600 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl active:scale-95">Termina Set</button>
                  <button onClick={() => setActiveSetTimer(null)} className="w-full bg-red-500/20 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border border-red-500/30 active:scale-95">Annulla</button>
              </div>
          </div>
      )}

      {restTimer && !restTimer.isMinimized && (
          <div className="fixed inset-0 z-[300] bg-emerald-600 flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom duration-300">
              <button onClick={() => setRestTimer({...restTimer, isMinimized: true})} className="absolute top-6 right-6 bg-white/10 p-3 rounded-full text-white border border-white/20 active:scale-90"><X size={24} /></button>
              <div className="flex flex-col items-center gap-2 mb-12"><div className="bg-white/20 p-4 rounded-full mb-2 animate-bounce"><Timer size={48} className="text-white" /></div><h2 className="text-white font-black uppercase tracking-[0.2em] text-sm">Recupero</h2></div>
              <div className="text-8xl font-black text-white tabular-nums drop-shadow-2xl mb-12">{formatTime(restTimer.remaining)}</div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12">
                  <button onClick={() => adjustRestTime(-15)} className="bg-white/10 py-5 rounded-3xl border border-white/20 text-white font-black uppercase text-xs flex items-center justify-center gap-2"><Minus size={18} /> 15s</button>
                  <button onClick={() => adjustRestTime(15)} className="bg-white/10 py-5 rounded-3xl border border-white/20 text-white font-black uppercase text-xs flex items-center justify-center gap-2"><Plus size={18} /> 15s</button>
              </div>
              <button onClick={() => { if(restIntervalRef.current) clearInterval(restIntervalRef.current); setRestTimer(null); }} className="w-full max-w-sm bg-white text-emerald-600 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl active:scale-95 flex items-center justify-center gap-3"><FastForward size={20} fill="currentColor" /> Salta</button>
          </div>
      )}

      {showExitConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-surface p-8 rounded-[3rem] w-full max-w-xs text-center border border-slate-700 shadow-2xl">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${showExitConfirm === 'finish' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}><AlertTriangle size={32} /></div>
                  <h3 className="text-xl font-black text-white uppercase mb-2">{showExitConfirm === 'finish' ? 'Termina?' : 'Annulla?'}</h3>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                      <button onClick={() => setShowExitConfirm(null)} className="py-4 text-gray-400 font-black uppercase text-xs tracking-widest">No</button>
                      <button onClick={() => { if(showExitConfirm === 'finish') confirmFinish(); else { clearActiveSession(); onFinish(); } }} className={`py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white ${showExitConfirm === 'finish' ? 'bg-primary' : 'bg-red-600'}`}>Sì</button>
                  </div>
              </div>
          </div>
      )}

      {showExSelector && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4 animate-in fade-in overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white uppercase">{isCreatingQuickExercise ? "Nuovo Esercizio" : "Cerca Esercizio"}</h3>
                <button onClick={() => { setShowExSelector(false); setIsCreatingQuickExercise(false); setReplacingExIdx(null); }} className="text-gray-400 p-2"><X size={24}/></button>
              </div>
              
              {!isCreatingQuickExercise ? (
                  <>
                    <input autoFocus placeholder="Cerca..." value={selectorSearch} onChange={e => setSelectorSearch(e.target.value)} className="w-full bg-surface border border-slate-700 p-5 rounded-2xl text-white font-bold mb-4 outline-none focus:border-primary transition-colors" />
                    <button onClick={() => { setIsCreatingQuickExercise(true); setQuickExData({...quickExData, name: selectorSearch}); }} className="w-full py-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase border border-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                        <PlusCircle size={16} /> Manca? Crea Nuovo
                    </button>
                    <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                        {exercisesDB.filter(e => e.name.toLowerCase().includes(selectorSearch.toLowerCase())).map(ex => (
                            <button key={ex.id} onClick={() => handleExerciseSelection(ex.id)} className="w-full bg-surface p-5 rounded-2xl flex justify-between items-center border border-slate-800 text-left active:bg-slate-800 transition-colors">
                                <div><div className="font-bold text-white text-sm uppercase">{ex.name}</div><div className="text-[9px] text-slate-500 font-black uppercase mt-0.5">{ex.muscleGroup}</div></div>
                                <Plus size={18} className="text-primary" />
                            </button>
                        ))}
                    </div>
                  </>
              ) : (
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                      <div className="space-y-4">
                          <div>
                              <label className="text-[10px] text-slate-500 font-black uppercase mb-1 block px-1">Nome Esercizio</label>
                              <input autoFocus placeholder="Es. Crunch..." className="w-full bg-surface border border-slate-700 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary" value={quickExData.name} onChange={e => setQuickExData({...quickExData, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 font-black uppercase mb-1 block px-1">Gruppo Muscolare</label>
                              <select className="w-full bg-surface border border-slate-700 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary appearance-none" value={quickExData.muscleGroup} onChange={e => setQuickExData({...quickExData, muscleGroup: e.target.value as MuscleGroup})}>
                                  {Object.values(MuscleGroup).map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 font-black uppercase mb-1 block px-1">Tipologia</label>
                              <select className="w-full bg-surface border border-slate-700 p-5 rounded-2xl text-white font-bold outline-none focus:border-primary appearance-none" value={quickExData.type} onChange={e => setQuickExData({...quickExData, type: e.target.value as ExerciseType})}>
                                  {Object.values(ExerciseType).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                      </div>
                      <div className="pt-4 space-y-3">
                        <button onClick={handleQuickCreateExercise} className="w-full py-5 bg-primary text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-transform">Salva e Aggiungi</button>
                        <button onClick={() => setIsCreatingQuickExercise(false)} className="w-full py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest">Annulla</button>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default ActiveWorkout;
