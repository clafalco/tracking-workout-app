
import React, { useState, useEffect } from 'react';
import { Routine, WorkoutLog } from '../types';
import { getRoutines, getWorkoutLogs } from '../services/storageService';
import { Play, CalendarDays, Ruler, ChevronLeft, ChevronRight, Calculator, Settings, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  onStartWorkout: (routine: Routine, dayId: string) => void;
  changeTab: (tab: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartWorkout, changeTab }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastLogEntry, setLastLogEntry] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    const allRoutines = getRoutines();
    setRoutines(allRoutines);
    
    // Active routine logic
    const now = new Date();
    const current = allRoutines.find(r => {
        const start = new Date(r.startDate);
        const end = r.endDate ? new Date(r.endDate) : new Date(9999, 11, 31);
        return now >= start && now <= end;
    });
    const active = current || allRoutines[0] || null;
    setActiveRoutine(active);

    // Workout Logs for Calendar & Last Workout Logic
    const logs = getWorkoutLogs();
    setWorkoutLogs(logs);
    
    const dates = new Set(logs.map(log => {
        return new Date(log.date).toLocaleDateString('it-IT'); 
    }));
    setWorkoutDates(dates);

    // Find last log for the ACTIVE routine
    if (active) {
        const routineLogs = logs.filter(l => l.routineId === active.id);
        if (routineLogs.length > 0) {
            // Sort descending by date
            const sorted = routineLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setLastLogEntry(sorted[0]);
        } else {
            setLastLogEntry(null);
        }
    }

  }, []); // Dependencies empty to load on mount, logic inside handles derived state mostly. 

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
      // 0 = Sunday, 1 = Monday... we want Monday start (0)
      const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      return day === 0 ? 6 : day - 1;
  };

  const changeMonth = (delta: number) => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const getTimeAgo = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Oggi";
      if (diffDays === 1) return "Ieri";
      return `${diffDays} giorni fa`;
  };

  const renderCalendar = () => {
      const daysInMonth = getDaysInMonth(currentDate);
      const firstDay = getFirstDayOfMonth(currentDate);
      const days = [];
      const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

      // Empty slots
      for (let i = 0; i < firstDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-8"></div>);
      }

      // Helper to strip time for comparisons
      const normalizeDate = (d: Date) => {
          const newD = new Date(d);
          newD.setHours(0,0,0,0);
          return newD.getTime();
      };

      let routineStart = 0;
      let routineEnd = 0;

      if (activeRoutine) {
          routineStart = normalizeDate(new Date(activeRoutine.startDate));
          // If endDate exists use it, otherwise don't highlight end
          if (activeRoutine.endDate) {
              routineEnd = normalizeDate(new Date(activeRoutine.endDate));
          }
      }

      // Days
      for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
          const dateStr = dateObj.toLocaleDateString('it-IT');
          const dateTs = normalizeDate(dateObj);

          const hasWorkout = workoutDates.has(dateStr);
          const isToday = new Date().toLocaleDateString('it-IT') === dateStr;
          
          // Routine Range Logic
          let isRoutineDay = false;
          let isRoutineStart = false;
          let isRoutineEnd = false;

          if (activeRoutine && routineStart > 0) {
              if (routineEnd > 0) {
                  // Range Defined
                  if (dateTs >= routineStart && dateTs <= routineEnd) {
                      isRoutineDay = true;
                  }
                  if (dateTs === routineStart) isRoutineStart = true;
                  if (dateTs === routineEnd) isRoutineEnd = true;
              } else {
                  // Only Start Date (Open ended) - Highlight only start
                  if (dateTs === routineStart) {
                      isRoutineDay = true;
                      isRoutineStart = true;
                      isRoutineEnd = true; // Make it a single rounded block
                  }
              }
          }

          // Build classes for the background highlighter
          let roundClass = '';
          
          if (isRoutineDay) {
              if (isRoutineStart) roundClass += ' rounded-l-lg';
              if (isRoutineEnd) roundClass += ' rounded-r-lg';
              // If single day is start and end
              if (isRoutineStart && isRoutineEnd) roundClass = ' rounded-lg';
              // If it's a middle day at start of week (Monday), round left for visual continuity break
              if (!isRoutineStart && new Date(dateObj).getDay() === 1) roundClass += ' rounded-l-lg';
              // If it's a middle day at end of week (Sunday), round right
              if (!isRoutineEnd && new Date(dateObj).getDay() === 0) roundClass += ' rounded-r-lg';
          }

          days.push(
              <div key={i} className="flex flex-col items-center justify-center h-8 relative w-full">
                  {/* Background Highlighter Layer */}
                  {isRoutineDay && (
                      <div className={`absolute inset-0 bg-primary opacity-20 ${roundClass} z-0`}></div>
                  )}
                  
                  {/* Content Layer */}
                  <span className={`text-sm z-10 ${isToday ? 'font-bold text-white' : 'text-gray-400'}`}>{i}</span>
                  
                  {isToday && <div className="absolute w-7 h-7 border border-primary rounded-full z-20 pointer-events-none"></div>}
                  
                  {hasWorkout && (
                      <div className="absolute bottom-0.5 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)] z-20"></div>
                  )}
              </div>
          );
      }

      return (
          <div className="bg-surface border border-slate-700 rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                  <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <h3 className="font-bold text-white capitalize">{monthName}</h3>
                  <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-white"><ChevronRight size={20}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => (
                      <div key={d} className="text-xs text-gray-500 font-bold">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                  {days}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-700/50">
                 <div className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Fatto
                 </div>
                 <div className="flex items-center gap-1 text-xs text-gray-400">
                    <div className="w-2 h-2 border border-primary rounded-full"></div> Oggi
                 </div>
                 {activeRoutine?.startDate && (
                     <div className="flex items-center gap-1 text-xs text-gray-400">
                        <div className="w-3 h-3 bg-primary/20 rounded"></div> Piano
                     </div>
                 )}
              </div>
          </div>
      );
  };

  return (
    <div className="p-4 pb-24">
      <header className="mb-6 mt-2 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">Ciao, Atleta <span className="text-primary">.</span></h1>
            <p className="text-sm text-gray-400">Continua così!</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => changeTab('measurements')} className="bg-surface p-2 rounded-full border border-slate-700 text-primary hover:bg-slate-700 transition-colors">
                <Ruler size={20}/>
            </button>
            <button onClick={() => changeTab('settings')} className="bg-surface p-2 rounded-full border border-slate-700 text-gray-400 hover:text-white hover:bg-slate-700 transition-colors">
                <Settings size={20}/>
            </button>
        </div>
      </header>

      {renderCalendar()}

      {activeRoutine ? (
        <div className="mb-8">
            <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-bold text-white">Routine Attiva</h2>
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded uppercase font-bold tracking-wider truncate max-w-[150px]">{activeRoutine.name}</span>
            </div>
            
            <div className="grid gap-3">
                {activeRoutine.days.map(day => {
                    const isLastCompleted = lastLogEntry?.routineDayId === day.id;
                    
                    return (
                        <button 
                            key={day.id}
                            onClick={() => onStartWorkout(activeRoutine, day.id)}
                            className={`group relative bg-surface hover:bg-slate-700 border p-4 rounded-xl text-left transition-all shadow-md hover:shadow-primary/10 flex justify-between items-center 
                                ${isLastCompleted 
                                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' 
                                    : 'border-slate-700'
                                }`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-md text-white group-hover:text-primary transition-colors">{day.name}</h3>
                                    {isLastCompleted && (
                                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 size={10} />
                                            Ultimo: {getTimeAgo(lastLogEntry.date)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{day.exercises.length} Esercizi</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                <Play size={16} fill="currentColor" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
      ) : (
        <div className="bg-surface border border-dashed border-slate-600 rounded-2xl p-8 text-center mb-8">
            <p className="text-gray-400 mb-4">Non hai ancora una routine attiva.</p>
            <button onClick={() => changeTab('routines')} className="bg-primary px-6 py-3 rounded-xl text-white font-bold shadow-lg">Crea Routine</button>
        </div>
      )}

      <h2 className="text-xl font-bold text-white mb-4">Strumenti & Dati</h2>
      <div className="grid grid-cols-3 gap-3">
          <button onClick={() => changeTab('stats')} className="bg-surface border border-slate-700 p-3 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition-colors h-24">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
              </div>
              <span className="text-xs font-bold text-gray-300">Stats</span>
          </button>
           <button onClick={() => changeTab('history')} className="bg-surface border border-slate-700 p-3 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition-colors h-24">
              <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <CalendarDays size={20}/>
              </div>
              <span className="text-xs font-bold text-gray-300">Storico</span>
          </button>
          <button onClick={() => changeTab('calculator')} className="bg-surface border border-slate-700 p-3 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-700 transition-colors h-24">
              <div className="w-10 h-10 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center shrink-0">
                  <Calculator size={20}/>
              </div>
              <span className="text-xs font-bold text-gray-300">Calcolatori</span>
          </button>
      </div>
    </div>
  );
};

export default Dashboard;
