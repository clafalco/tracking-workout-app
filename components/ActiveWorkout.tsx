

import React, { useState, useEffect, useRef } from 'react';
import { Routine, RoutineDay, WorkoutLog, WorkoutLogExercise, CompletedSet, Exercise, MuscleGroup, ExerciseType, RoutineExercise, SetType } from '../types';
import { getExercises, saveWorkoutLog, saveExercises, getWorkoutLogs, getWakeLockEnabled, getVolume, saveActiveSession, getActiveSession, clearActiveSession, getMeasurements } from '../services/storageService';
import { generateExerciseAdvice } from '../services/geminiService';
import { Timer, HelpCircle, ChevronLeft, Save, Play, Pause, Square, Check, Plus, Search, X, ArrowLeft, Minus, SkipForward, History, ExternalLink, StickyNote, AlignLeft, Minimize2, Layers, ChevronUp, ChevronDown, Calculator, Heart, Bluetooth, Activity } from 'lucide-react';
import { MUSCLE_GROUP_COLORS } from '../constants';
import { playTimerSound, getAudioContext, unlockAudioContext } from '../services/audioService';

interface ActiveWorkoutProps {
  routine: Routine | null;
  dayId: string | null;
  onFinish: () => void;
}

// Update ActiveTimerState to be time-stamp based for background persistence
interface ActiveTimerState {
  exIndex: number;
  setIndex: number;
  initialTime: number; 
  targetEndTime: number | null; // Null if paused
  remainingTime: number | null; // Used when paused
  isRunning: boolean;
}

// Update RestTimerState to be time-stamp based
interface RestTimerState {
    isActive: boolean;
    targetEndTime: number | null;
    remainingTime: number | null;
    totalTime: number;
}

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
    layout?: 'horizontal' | 'vertical'; // New prop for layout
}

const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, step = 1, min = 0, suffix = '', placeholder = '0', className = '', isTime = false, layout = 'horizontal' }) => {
    const handleDelta = (delta: number) => {
        // IMPORTANT: Unlock audio context on stepper interaction
        unlockAudioContext(); 
        
        const current = value || 0;
        const next = Math.max(min, current + delta);
        // Fix floating point issues
        const cleanNext = Math.round(next * 100) / 100;
        onChange(cleanNext);
    };

    // Helper to format seconds into M:SS
    const formatTimeDisplay = (totalSeconds: number) => {
        if (!totalSeconds && totalSeconds !== 0) return '';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const displayValue = isTime ? (
        <span className="text-white text-sm font-mono font-bold">
            {value > 0 || value === 0 ? (suffix ? `${value}${suffix}` : formatTimeDisplay(value)) : <span className="text-gray-600 font-sans font-normal text-xs">{placeholder}</span>}
        </span>
    ) : (
        <input 
            type="number" 
            className="w-full bg-transparent text-white text-center text-sm focus:outline-none p-0 m-0 appearance-none font-bold"
            value={value === 0 ? '' : value}
            placeholder={placeholder}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            // Hide arrows in Webkit
            style={{ MozAppearance: 'textfield' }} 
        />
    );

    if (layout === 'vertical') {
        return (
            <div className={`flex flex-col items-center justify-between bg-slate-800 rounded-lg border border-slate-600 shadow-sm overflow-hidden ${className} h-full`}>
                <button 
                    onClick={() => handleDelta(step)}
                    className="w-full h-1/3 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-primary/80 transition-colors text-gray-300 active:text-white"
                >
                    <ChevronUp size={16} />
                </button>
                <div className="w-full h-1/3 flex items-center justify-center bg-dark/50 border-y border-slate-600/50 shadow-inner px-1">
                    {displayValue}
                </div>
                <button 
                    onClick={() => handleDelta(-step)}
                    className="w-full h-1/3 flex items-center justify-center bg-slate-700 hover:bg-slate-600 active:bg-primary/80 transition-colors text-gray-300 active:text-white"
                >
                    <ChevronDown size={16} />
                </button>
            </div>
        );
    }

    // Default Horizontal Layout
    return (
        <div className={`flex items-center bg-dark rounded-lg border border-slate-600 h-9 overflow-hidden ${className}`}>
            <button 
                onClick={() => handleDelta(-step)}
                className="w-7 h-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-gray-400 border-r border-slate-700 shrink-0"
            >
                <Minus size={14} />
            </button>
            <div className="flex-1 px-1 text-center relative flex items-center justify-center min-w-[30px]">
                {displayValue}
            </div>
            <button 
                onClick={() => handleDelta(step)}
                className="w-7 h-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-gray-400 border-l border-slate-700 shrink-0"
            >
                <Plus size={14} />
            </button>
        </div>
    );
};
// --------------------------------------------------

const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({ routine, dayId, onFinish }) => {
  const [exercisesDB, setExercisesDB] = useState<Exercise[]>([]);
  
  // STATE INITIALIZATION with PERSISTENCE CHECK
  const [log, setLog] = useState<WorkoutLog>(() => {
      const savedSession = getActiveSession();
      if (savedSession) {
          return savedSession.log;
      }
      return {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        routineId: routine?.id,
        routineDayId: dayId || undefined,
        exercises: [],
        durationMinutes: 0
      };
  });

  const [activeRoutineDay, setActiveRoutineDay] = useState<RoutineDay | undefined>(() => {
      const savedSession = getActiveSession();
      if (savedSession) {
          return savedSession.activeRoutineDay;
      }
      return undefined;
  });

  const [startTime] = useState<number>(() => {
      const savedSession = getActiveSession();
      if (savedSession) {
          return savedSession.startTime;
      }
      return Date.now();
  });

  const [elapsed, setElapsed] = useState(0);
  
  // Timer State (Loaded from storage or default)
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState | null>(() => {
      const savedSession = getActiveSession();
      return savedSession?.activeTimer || null;
  });
  
  // Auto Rest Timer State
  const [restTimer, setRestTimer] = useState<RestTimerState>(() => {
       const savedSession = getActiveSession();
       return savedSession?.restTimer || { isActive: false, targetEndTime: null, remainingTime: 0, totalTime: 0 };
  });

  // Display State for Timers (Derived from timestamps for UI updates)
  const [displayActiveTime, setDisplayActiveTime] = useState(0);
  const [displayRestTime, setDisplayRestTime] = useState(0);

  const activeTimerRef = useRef<number | null>(null);
  const restTimerRef = useRef<number | null>(null);
  
  // Settings State
  const [volume, setVolume] = useState(1.0);

  // UI State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [ghostData, setGhostData] = useState<Record<string, string>>({});

  // Notes Modal State
  const [viewingNote, setViewingNote] = useState<{title: string, text: string} | null>(null);

  // Plate Calculator Modal State
  const [showPlateModal, setShowPlateModal] = useState(false);
  const [plateCalcTarget, setPlateCalcTarget] = useState<number>(0);
  const [calculatedPlates, setCalculatedPlates] = useState<number[]>([]);

  // Add Exercise Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newExerciseData, setNewExerciseData] = useState<Partial<Exercise>>({
      name: '',
      muscleGroup: MuscleGroup.Chest,
      type: ExerciseType.Weighted
  });

  // Bluetooth Heart Rate State
  const [bpm, setBpm] = useState<number | null>(null);
  const [isHrConnected, setIsHrConnected] = useState(false);
  const [hrSamples, setHrSamples] = useState<number[]>([]); // To calc average later
  const deviceRef = useRef<any>(null); // BluetoothDevice

  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // Load Volume
    setVolume(getVolume());

    // Initialize/Unlock Audio on mount
    getAudioContext();

    // WAKE LOCK LOGIC
    const enableWakeLock = async () => {
        if (getWakeLockEnabled() && 'wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            } catch (err: any) {
                if (err.name !== 'NotAllowedError') {
                    console.error('Wake Lock Error:', err);
                }
            }
        }
    };

    enableWakeLock();

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            enableWakeLock();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        // Cleanup Bluetooth
        if (deviceRef.current && deviceRef.current.gatt.connected) {
            deviceRef.current.gatt.disconnect();
        }
    };
  }, []);

  // --- AUTO SAVE EFFECT ---
  // Saves current state including running timers to local storage
  useEffect(() => {
      if (log && activeRoutineDay) {
          saveActiveSession({
              log,
              activeRoutineDay,
              startTime,
              routineId: routine?.id,
              dayId: dayId || undefined,
              activeTimer,
              restTimer
          });
      }
  }, [log, activeRoutineDay, startTime, activeTimer, restTimer, routine, dayId]);
  // ------------------------

  // --- BLUETOOTH HEART RATE LOGIC ---
  const connectHeartRate = async () => {
      try {
          const nav = navigator as any;
          if (!nav.bluetooth) {
              alert("Il tuo browser non supporta il Web Bluetooth (usa Chrome/Edge su Android/PC o Bluefy su iOS).");
              return;
          }

          const device = await nav.bluetooth.requestDevice({
              filters: [{ services: ['heart_rate'] }]
          });

          deviceRef.current = device;
          const server = await device.gatt.connect();
          const service = await server.getPrimaryService('heart_rate');
          const characteristic = await service.getCharacteristic('heart_rate_measurement');

          await characteristic.startNotifications();
          
          characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
              const value = event.target.value;
              // Parsing Heart Rate Measurement standard (0x2A37)
              // The first byte contains flags
              const flags = value.getUint8(0);
              
              // 0th bit indicates if Format is UINT8 (0) or UINT16 (1)
              const formatUint16 = (flags & 0x01) === 1;
              
              let hrValue;
              if (formatUint16) {
                  hrValue = value.getUint16(1, true); // Little Endian
              } else {
                  hrValue = value.getUint8(1);
              }
              
              setBpm(hrValue);
              setHrSamples(prev => [...prev, hrValue]);
          });

          device.addEventListener('gattserverdisconnected', () => {
              setIsHrConnected(false);
              setBpm(null);
          });

          setIsHrConnected(true);

      } catch (error) {
          console.error("Bluetooth Error:", error);
          // Don't alert if user cancelled
          if (String(error).includes("User cancelled")) return;
          alert("Connessione fallita. Riprova.");
      }
  };
  // ----------------------------------

  // --- PLATE CALCULATOR LOGIC ---
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const plateColors: Record<number, string> = {
      25: 'bg-red-600',
      20: 'bg-blue-600',
      15: 'bg-yellow-500',
      10: 'bg-green-600',
      5: 'bg-slate-100',
      2.5: 'bg-slate-800',
      1.25: 'bg-slate-400'
  };

  useEffect(() => {
      const barWeight = 20;
      if (!plateCalcTarget || plateCalcTarget <= barWeight) {
          setCalculatedPlates([]);
          return;
      }
      
      let remaining = (plateCalcTarget - barWeight) / 2;
      const plates: number[] = [];

      for (const p of availablePlates) {
          while (remaining >= p) {
              plates.push(p);
              remaining -= p;
          }
      }
      setCalculatedPlates(plates);
  }, [plateCalcTarget]);

  const openPlateCalculator = (weight: number) => {
      setPlateCalcTarget(weight || 20); // Default to bar if 0
      setShowPlateModal(true);
  };
  // ------------------------------

  useEffect(() => {
    setExercisesDB(getExercises());
    
    // Ghost data fetch logic...
    const logs = getWorkoutLogs();
    const history: Record<string, string> = {};

    // If session restored, use existing logs in activeRoutineDay exercises
    const targetExercises = activeRoutineDay?.exercises || [];

    targetExercises.forEach(ex => {
            const previousLogs = logs
            .filter(l => l.exercises.some(e => e.exerciseId === ex.exerciseId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            if (previousLogs.length > 0) {
                const lastLog = previousLogs[0];
                const lastEx = lastLog.exercises.find(e => e.exerciseId === ex.exerciseId);
                if (lastEx) {
                    const bestSet = lastEx.sets.reduce((prev, current) => (current.weight > prev.weight ? current : prev), lastEx.sets[0]);
                    if (bestSet && bestSet.weight > 0) {
                        history[ex.exerciseId] = `${bestSet.weight}kg x ${bestSet.reps}`;
                    } else if (bestSet && bestSet.reps > 0) {
                        history[ex.exerciseId] = `${bestSet.reps} reps`;
                    }
                }
            }
    });
    setGhostData(history);
    
    // Only initialize log if it's empty (first run, not restore)
    if (!getActiveSession() && routine && dayId && !activeRoutineDay) {
         const day = routine.days.find(d => d.id === dayId);
         if (day) {
             setActiveRoutineDay(JSON.parse(JSON.stringify(day)));
             
             const initialLogExercises: WorkoutLogExercise[] = day.exercises.map(ex => {
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

  }, [routine, dayId]);

  // Global Workout Timer
  useEffect(() => {
    const timer = setInterval(() => {
      // Calculate elapsed based on start timestamp, secure against background throttling
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // --- ACTIVE EXERCISE TIMER LOGIC (Timestamp Based) ---
  useEffect(() => {
    if (activeTimer && activeTimer.isRunning) {
        activeTimerRef.current = window.setInterval(() => {
            const now = Date.now();
            const target = activeTimer.targetEndTime || now;
            const diff = Math.ceil((target - now) / 1000);
            const remaining = Math.max(0, diff);
            
            setDisplayActiveTime(remaining);

            if (remaining <= 0) {
                // Timer Finished
                if (activeTimerRef.current) clearInterval(activeTimerRef.current);
                playTimerSound('finish', volume);
                updateSet(activeTimer.exIndex, activeTimer.setIndex, 'durationSeconds', activeTimer.initialTime);
                updateSet(activeTimer.exIndex, activeTimer.setIndex, 'completed', true);
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                setActiveTimer(null);
            } else if (remaining <= 5) {
                // Tick
                playTimerSound('tick', volume);
            }
        }, 1000);

        // Immediate update for UI responsiveness
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil(((activeTimer.targetEndTime || now) - now) / 1000));
        setDisplayActiveTime(remaining);

    } else if (activeTimer && !activeTimer.isRunning) {
        // Paused state
        setDisplayActiveTime(activeTimer.remainingTime || 0);
        if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    } else {
        if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    }
    return () => {
        if (activeTimerRef.current) clearInterval(activeTimerRef.current);
    };
  }, [activeTimer, volume]);

  // --- REST TIMER LOGIC (Timestamp Based) ---
  useEffect(() => {
      if (restTimer.isActive && restTimer.targetEndTime) {
          restTimerRef.current = window.setInterval(() => {
              const now = Date.now();
              const diff = Math.ceil((restTimer.targetEndTime! - now) / 1000);
              const remaining = Math.max(0, diff);
              
              setDisplayRestTime(remaining);

              if (remaining <= 0) {
                  playTimerSound('rest_finish', volume);
                  if (navigator.vibrate) navigator.vibrate(200);
                  setRestTimer({ isActive: false, targetEndTime: null, remainingTime: 0, totalTime: 0 });
              } else if (remaining <= 5) {
                  playTimerSound('tick', volume);
              }
          }, 1000);

          // Immediate update
          const now = Date.now();
          setDisplayRestTime(Math.max(0, Math.ceil((restTimer.targetEndTime - now) / 1000)));

      } else {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
      }
      return () => {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
      }
  }, [restTimer, volume]);


  const updateSet = (exIndex: number, setIndex: number, field: keyof CompletedSet, value: any) => {
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
        
        if (restTime && restTime > 0) {
            setRestTimer({ 
                isActive: true, 
                targetEndTime: Date.now() + (restTime * 1000), 
                remainingTime: restTime, 
                totalTime: restTime 
            });
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

  // Active Timer Controls
  const toggleTimer = (exIndex: number, setIndex: number, currentDuration: number) => {
      unlockAudioContext();

      if (activeTimer?.exIndex === exIndex && activeTimer?.setIndex === setIndex) {
          // Toggle Pause/Resume
          setActiveTimer(prev => {
              if (!prev) return null;
              
              if (prev.isRunning) {
                  // PAUSE: Calculate remaining based on target vs now
                  const now = Date.now();
                  const remaining = Math.max(0, Math.ceil(((prev.targetEndTime || now) - now) / 1000));
                  return { ...prev, isRunning: false, remainingTime: remaining, targetEndTime: null };
              } else {
                  // RESUME: Calculate new target based on stored remaining
                  playTimerSound('start', volume); 
                  return { ...prev, isRunning: true, targetEndTime: Date.now() + (prev.remainingTime || 0) * 1000 };
              }
          });
      } else {
          // START NEW
          playTimerSound('start', volume);
          const duration = currentDuration || 60;
          setActiveTimer({
              exIndex,
              setIndex,
              initialTime: duration,
              targetEndTime: Date.now() + (duration * 1000),
              remainingTime: duration,
              isRunning: true
          });
      }
  };

  const stopTimer = () => {
      if (activeTimer) {
          const timeLeft = displayActiveTime; // Use state which is synced with interval
          const elapsed = activeTimer.initialTime - timeLeft;
          if (elapsed > 0) {
             updateSet(activeTimer.exIndex, activeTimer.setIndex, 'durationSeconds', elapsed);
             updateSet(activeTimer.exIndex, activeTimer.setIndex, 'completed', true);
          }
          setActiveTimer(null);
      }
  };

  const handleExit = () => {
      clearActiveSession();
      if (deviceRef.current && deviceRef.current.gatt.connected) {
         deviceRef.current.gatt.disconnect();
      }
      onFinish();
  };

  const finishWorkout = () => {
    // 1. Get user weight for calorie calculation
    const measurements = getMeasurements();
    const lastWeight = measurements.length > 0 ? measurements[measurements.length - 1].weight : 75; // Default 75kg
    const durationHours = (elapsed / 60) / 60;

    // 2. Estimate Intensity (METs) based on workout composition
    // Weighted/Bodyweight ~ 5 METs (Moderate-Vigorous Weight Lifting)
    // Cardio/Duration ~ 8 METs (Running/Cycling)
    let cardioSets = 0;
    let weightSets = 0;
    
    log.exercises.forEach(logEx => {
        const dbEx = exercisesDB.find(e => e.id === logEx.exerciseId);
        if (dbEx) {
            const completedCount = logEx.sets.filter(s => s.completed).length;
            if (dbEx.type === ExerciseType.Duration || dbEx.muscleGroup === MuscleGroup.Cardio) {
                cardioSets += completedCount;
            } else {
                weightSets += completedCount;
            }
        }
    });

    const totalSets = cardioSets + weightSets;
    // Default MET for Weight training (with rest)
    let estimatedMET = 5.0; 
    
    if (totalSets > 0) {
        // Weighted average of METs
        const cardioRatio = cardioSets / totalSets;
        // Shift MET from 5 (Pure Weights) towards 8 (Pure Cardio) based on ratio
        estimatedMET = 5.0 + (cardioRatio * 3.0); 
    }

    // Formula: Calories = MET * Weight(kg) * Time(hours)
    // Future improvement: use avg HR if available (hrSamples) for better accuracy
    const estimatedCalories = Math.round(estimatedMET * lastWeight * durationHours);

    const finalLog: WorkoutLog = {
      ...log,
      durationMinutes: Math.floor(elapsed / 60),
      calories: estimatedCalories
    };
    
    saveWorkoutLog(finalLog);
    clearActiveSession();
    if (deviceRef.current && deviceRef.current.gatt.connected) {
         deviceRef.current.gatt.disconnect();
    }
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
        <button onClick={handleExit} className="text-gray-400"><ChevronLeft /></button>
        <div className="text-center">
            <h2 className="font-bold text-white max-w-[150px] truncate">{activeRoutineDay.name}</h2>
            <div className="text-primary font-mono text-sm flex items-center justify-center gap-3">
                <span className="flex items-center gap-1"><Timer size={14}/> {formatTime(elapsed)}</span>
                {/* HEART RATE DISPLAY */}
                <button 
                    onClick={connectHeartRate} 
                    className={`flex items-center gap-1 font-bold transition-all ${isHrConnected ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}
                >
                    {isHrConnected ? (
                        <>
                            <Activity size={14} className="animate-pulse" /> {bpm || '--'} <span className="text-[10px]">BPM</span>
                        </>
                    ) : (
                        <Bluetooth size={14} />
                    )}
                </button>
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
                        <div className="grid grid-cols-12 gap-1 mb-2 text-xs text-gray-500 uppercase font-bold text-center">
                            <div className="col-span-1">Set</div>
                            <div className="col-span-4">Kg</div>
                            <div className="col-span-4">{isTimed ? 'Tempo (M : S)' : 'Reps'}</div>
                            <div className="col-span-2">RPE</div>
                            <div className="col-span-1"></div>
                        </div>
                        {exLog.sets.map((set, sIndex) => {
                            const rowStyle = getRowStyle(set.type);
                            
                            return (
                                <div key={sIndex} className={`grid grid-cols-12 gap-1 mb-3 items-center transition-all rounded p-1 ${rowStyle} ${set.completed ? 'opacity-60' : 'opacity-100'}`}>
                                    {/* Set Type Toggle */}
                                    <button 
                                        onClick={() => toggleSetType(i, sIndex)}
                                        className="col-span-1 text-center bg-dark rounded hover:bg-slate-700 transition-colors flex items-center justify-center h-16 border border-slate-600"
                                    >
                                        {getSetBadge(set.type, sIndex)}
                                    </button>

                                    <div className="col-span-4 flex items-center gap-1 h-16">
                                        <div className="flex-1 min-w-0 h-full">
                                            <NumberStepper 
                                                value={set.weight || 0}
                                                onChange={(val) => updateSet(i, sIndex, 'weight', val)}
                                                step={1}
                                                placeholder="Kg"
                                                layout="vertical"
                                                className="h-full"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => openPlateCalculator(set.weight || 0)} 
                                            className="w-8 h-full bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
                                        >
                                            <Calculator size={16}/>
                                        </button>
                                    </div>
                                    <div className="col-span-4 relative h-16">
                                        {isTimed ? (
                                            <div className="flex items-center gap-1 h-full">
                                                <div className="flex gap-1 flex-1 h-full">
                                                    {/* SPLIT STEPPER FOR MINUTES AND SECONDS WITH VERTICAL LAYOUT */}
                                                    <NumberStepper 
                                                        value={Math.floor((set.durationSeconds || 0) / 60)}
                                                        onChange={(val) => {
                                                            const currentSecs = (set.durationSeconds || 0) % 60;
                                                            updateSet(i, sIndex, 'durationSeconds', (val * 60) + currentSecs);
                                                        }}
                                                        step={1}
                                                        placeholder="M"
                                                        isTime={true}
                                                        layout="vertical"
                                                        className="w-1/2 h-full"
                                                    />
                                                    <NumberStepper 
                                                        value={(set.durationSeconds || 0) % 60}
                                                        onChange={(val) => {
                                                            const validSec = Math.min(59, val);
                                                            const currentMins = Math.floor((set.durationSeconds || 0) / 60);
                                                            updateSet(i, sIndex, 'durationSeconds', (currentMins * 60) + validSec);
                                                        }}
                                                        step={5}
                                                        placeholder="S"
                                                        isTime={true}
                                                        layout="vertical"
                                                        className="w-1/2 h-full"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => toggleTimer(i, sIndex, set.durationSeconds || 60)}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white w-8 h-full rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                                                >
                                                    <Play size={14} fill="currentColor" />
                                                </button>
                                            </div>
                                        ) : (
                                            <NumberStepper 
                                                value={set.reps || 0}
                                                onChange={(val) => updateSet(i, sIndex, 'reps', val)}
                                                step={1}
                                                placeholder="Reps"
                                                layout="vertical"
                                                className="h-full"
                                            />
                                        )}
                                        {/* GHOST SET INFO - Adjusted position for taller row */}
                                        {ghost && sIndex === 0 && !isTimed && (
                                            <div className="absolute -bottom-4 left-0 w-full text-center text-[9px] text-gray-500 flex items-center justify-center gap-1 z-10 pointer-events-none">
                                                <History size={8}/> Scorsa: {ghost}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* RPE Input */}
                                    <div className="col-span-2 h-16">
                                        <input 
                                            type="number"
                                            min="0" max="10"
                                            value={set.rpe || ''}
                                            onChange={(e) => updateSet(i, sIndex, 'rpe', parseFloat(e.target.value))}
                                            placeholder="-"
                                            className="w-full h-full bg-dark text-white text-center rounded-lg border border-slate-600 focus:outline-none focus:border-primary text-sm"
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
      
      {/* EXERCISE DURATION TIMER OVERLAY (FULL SCREEN) */}
      {activeTimer && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-gray-400 mb-2 uppercase tracking-widest text-center">
                {exercisesDB.find(e => e.id === activeRoutineDay.exercises[activeTimer.exIndex].exerciseId)?.name || 'Esercizio'}
            </h2>
            <div className="text-3xl font-bold text-white mb-8">
                Set {activeTimer.setIndex + 1}
            </div>
            
            <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="128" cy="128" r="120" className="text-slate-800" strokeWidth="12" fill="none"/>
                    <circle 
                        cx="128" cy="128" r="120" 
                        className="text-emerald-500 transition-all duration-1000 ease-linear" 
                        strokeWidth="12" 
                        fill="none" 
                        strokeDasharray={753} // 2 * PI * 120
                        strokeDashoffset={753 - (753 * displayActiveTime) / activeTimer.initialTime}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                     <span className={`text-8xl font-bold tracking-tighter transition-colors ${displayActiveTime <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {formatTime(displayActiveTime)}
                     </span>
                </div>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-4">
                <button 
                    onClick={() => {
                        unlockAudioContext(); 
                        toggleTimer(activeTimer.exIndex, activeTimer.setIndex, activeTimer.initialTime);
                    }}
                    className={`py-4 rounded-2xl font-bold text-lg border transition-all flex items-center justify-center gap-2 ${activeTimer.isRunning ? 'bg-yellow-600/20 text-yellow-500 border-yellow-600' : 'bg-emerald-600 text-white border-emerald-500'}`}
                >
                    {activeTimer.isRunning ? <><Pause size={24}/> Pausa</> : <><Play size={24}/> Riprendi</>}
                </button>
                <button 
                    onClick={stopTimer}
                    className="bg-transparent border-2 border-red-500/50 text-red-400 hover:text-white hover:bg-red-600 hover:border-red-600 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                >
                    <Square size={24}/> Stop & Completa
                </button>
                <button 
                    onClick={() => setActiveTimer(null)} 
                    className="mt-4 text-gray-500 text-sm flex items-center justify-center gap-1 hover:text-gray-300"
                >
                   <Minimize2 size={16}/> Annulla
                </button>
            </div>
        </div>
      )}

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
                        strokeDashoffset={753 - (753 * displayRestTime) / restTimer.totalTime}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                     <span className={`text-8xl font-bold tracking-tighter transition-colors ${displayRestTime <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {formatTime(displayRestTime)}
                     </span>
                     <span className="text-xl text-gray-400 mt-2">rimanenti</span>
                     {bpm && (
                         <div className="mt-4 flex items-center gap-2 text-red-500 font-bold animate-pulse">
                             <Heart size={20} fill="currentColor"/> {bpm}
                         </div>
                     )}
                </div>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-4">
                <button 
                    onClick={() => {
                        unlockAudioContext(); // Unlock on interaction
                        setRestTimer(prev => ({
                            ...prev, 
                            // Add 30s to the target timestamp
                            targetEndTime: (prev.targetEndTime || Date.now()) + 30000,
                            totalTime: prev.totalTime + 30
                        }));
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
                <button 
                    onClick={() => setRestTimer(prev => ({...prev, isActive: false}))} 
                    className="mt-4 text-gray-500 text-sm flex items-center justify-center gap-1 hover:text-gray-300"
                >
                   <Minimize2 size={16}/> Chiudi Timer
                </button>
            </div>
        </div>
      )}
      
      {/* Plate Calculator Modal */}
      {showPlateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl relative">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                          <Calculator size={20} className="text-primary"/> Calcolatore Dischi
                      </h3>
                      <button onClick={() => setShowPlateModal(false)} className="text-gray-400 hover:text-white p-2">
                          <X size={24}/>
                      </button>
                  </div>

                  <div className="mb-6">
                      <label className="block text-xs text-gray-400 mb-2 uppercase font-bold">Peso Target (Kg)</label>
                      <div className="flex items-center gap-3">
                        <NumberStepper 
                            value={plateCalcTarget}
                            onChange={(val) => setPlateCalcTarget(val)}
                            step={1.25}
                            min={20}
                            className="flex-1 text-lg h-12"
                        />
                        <div className="text-right">
                             <div className="text-[10px] text-gray-500">Bilanciere</div>
                             <div className="font-bold text-white text-sm">20 Kg</div>
                        </div>
                      </div>
                  </div>

                  {plateCalcTarget > 20 && (
                     <div className="bg-dark p-3 rounded-xl border border-slate-700 w-full overflow-hidden mb-4">
                        <div className="overflow-x-auto pb-2 flex justify-center">
                            <div className="flex items-center justify-center min-w-max min-h-[100px] px-2">
                                {/* BAR SHAFT */}
                                <div className="w-8 h-3 bg-gray-400 mx-[1px] rounded-l-sm relative shrink-0 border-r border-gray-600"></div>

                                {/* RIGHT PLATES */}
                                <div className="flex items-center justify-start gap-[1px]">
                                    {calculatedPlates.map((p, i) => (
                                        <div 
                                            key={`r-${i}`} 
                                            className={`${plateColors[p]} border border-black/30 shadow-md rounded-[2px] flex items-center justify-center text-[8px] font-bold text-black/60 shrink-0`}
                                            style={{
                                                height: `${30 + (p * 2)}px`, 
                                                width: `${6 + (p/6)}px`
                                            }}
                                        >
                                        </div>
                                    ))}
                                </div>
                                <div className="w-4 h-3 bg-gray-400 mx-[1px] rounded-r-sm"></div>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                            {calculatedPlates.map((p, i) => (
                                 <div key={i} className="flex items-center gap-1 bg-surface px-2 py-1 rounded-full border border-slate-600 shadow-sm shrink-0">
                                     <div className={`w-2 h-2 rounded-full ${plateColors[p]}`}></div>
                                     <span className="font-bold text-white text-xs">{p}</span>
                                 </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 text-center">Dischi per un lato</p>
                    </div>
                  )}
                  
                  {plateCalcTarget <= 20 && (
                      <div className="text-center text-gray-500 py-8 text-sm border border-dashed border-slate-700 rounded-xl mb-4">
                          Inserisci un peso > 20kg
                      </div>
                  )}

                  <button 
                    onClick={() => setShowPlateModal(false)}
                    className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-medium text-white transition-colors"
                  >
                    Chiudi
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
