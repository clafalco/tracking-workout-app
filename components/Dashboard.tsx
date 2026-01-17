
import React, { useState, useEffect, useMemo } from 'react';
import { Routine, WorkoutLog, BodyMeasurement } from '../types';
import { getRoutines, getWorkoutLogs, getMeasurements } from '../services/storageService';
// Added BarChart2 to the imports from lucide-react
import { Play, CalendarDays, Ruler, ChevronLeft, ChevronRight, Calculator, Settings, TrendingUp, Scale, Percent, Activity, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface DashboardProps {
  onStartWorkout: (routine: Routine, dayId: string) => void;
  changeTab: (tab: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartWorkout, changeTab }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastLogEntry, setLastLogEntry] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    const allRoutines = getRoutines();
    setRoutines(allRoutines);
    const now = new Date();
    
    const current = allRoutines.find(r => {
        const start = new Date(r.startDate);
        start.setHours(0,0,0,0);
        const end = r.endDate ? new Date(r.endDate) : new Date(9999, 11, 31);
        end.setHours(23,59,59,999);
        return now >= start && now <= end;
    });
    const active = current || allRoutines[0] || null;
    setActiveRoutine(active);
    
    const logs = getWorkoutLogs();
    setWorkoutLogs(logs);
    setWorkoutDates(new Set(logs.map(log => new Date(log.date).toLocaleDateString('it-IT'))));
    
    const mData = getMeasurements().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setMeasurements(mData);

    if (active) {
        const routineLogs = logs.filter(l => l.routineId === active.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLastLogEntry(routineLogs[0] || null);
    }
  }, []);

  const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  
  const trendData = useMemo(() => {
    return measurements.slice(-10).map(m => ({
        date: new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        weight: m.weight,
        bodyFat: m.bodyFat || null
    }));
  }, [measurements]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => {
      const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
      return day === 0 ? 6 : day - 1;
  };

  const getTimeAgo = (dateString: string) => {
      const diffDays = Math.floor(Math.abs(new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Oggi";
      if (diffDays === 1) return "Ieri";
      return `${diffDays}d fa`;
  };

  const renderCalendar = () => {
      const daysInMonth = getDaysInMonth(currentDate);
      const firstDay = getFirstDayOfMonth(currentDate);
      const days = [];
      const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

      let rStart: Date | null = null;
      let rEnd: Date | null = null;
      if (activeRoutine) {
          rStart = new Date(activeRoutine.startDate);
          rStart.setHours(0,0,0,0);
          if (activeRoutine.endDate) {
              rEnd = new Date(activeRoutine.endDate);
              rEnd.setHours(0,0,0,0);
          }
      }

      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-10"></div>);
      
      for (let i = 1; i <= daysInMonth; i++) {
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
          const dateStr = dateObj.toLocaleDateString('it-IT');
          const hasWorkout = workoutDates.has(dateStr);
          const isToday = new Date().toLocaleDateString('it-IT') === dateStr;
          
          const currentTime = dateObj.getTime();
          const isInRange = rStart && currentTime >= rStart.getTime() && (!rEnd || currentTime <= rEnd.getTime());
          const isRangeStart = rStart && currentTime === rStart.getTime();
          const isRangeEnd = rEnd && currentTime === rEnd.getTime();

          days.push(
              <div key={i} className={`flex flex-col items-center justify-center h-10 relative w-full ${isInRange ? 'bg-primary/15' : ''} ${isRangeStart ? 'rounded-l-xl' : ''} ${isRangeEnd ? 'rounded-r-xl' : ''}`}>
                  <span className={`text-sm z-10 transition-all ${isToday ? 'font-black text-primary scale-110' : isInRange ? 'text-white font-black' : 'text-gray-500 font-bold'}`}>
                    {i}
                  </span>
                  {hasWorkout && <div className="absolute bottom-1 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>}
                  {isToday && <div className="absolute inset-1 w-8 h-8 border-2 border-primary/30 rounded-full -z-10"></div>}
                  {isRangeStart && <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full"></div>}
                  {isRangeEnd && <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full"></div>}
              </div>
          );
      }
      
      return (
          <div className="bg-surface rounded-[2.5rem] p-6 mb-6 shadow-xl border border-slate-700/30">
              <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-gray-500 hover:text-white p-1"><ChevronLeft size={20}/></button>
                  <h3 className="font-black text-white uppercase tracking-tighter text-sm">{monthName}</h3>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-gray-500 hover:text-white p-1"><ChevronRight size={20}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                  {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => <div key={d} className="text-[10px] text-gray-600 font-black">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">{days}</div>
          </div>
      );
  };

  return (
    <div className="p-4 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Iron<span className="text-primary">Track</span></h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sempre un passo avanti.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => changeTab('measurements')} className="bg-surface p-3 rounded-2xl text-primary shadow-lg border border-slate-700/50 active:scale-95 transition-transform"><Ruler size={20}/></button>
            <button onClick={() => changeTab('settings')} className="bg-surface p-3 rounded-2xl text-gray-500 shadow-lg border border-slate-700/50 active:scale-95 transition-transform"><Settings size={20}/></button>
        </div>
      </header>

      {renderCalendar()}

      {/* Sezione Trend Fisico */}
      <div className="bg-surface rounded-[2rem] p-6 mb-8 border border-slate-700/30 shadow-lg">
          <div className="flex justify-between items-start mb-6">
              <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                      Trend Fisico <TrendingUp size={18} className="text-emerald-500"/>
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Peso e Composizione</p>
              </div>
              <button onClick={() => changeTab('measurements')} className="text-[10px] font-black uppercase text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">Dettagli</button>
          </div>

          {latestMeasurement ? (
              <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-dark/50 p-4 rounded-2xl border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-1">
                              <Scale size={12} className="text-primary" />
                              <p className="text-[8px] font-black text-gray-500 uppercase">Peso</p>
                          </div>
                          <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-white">{latestMeasurement.weight.toLocaleString('it-IT')}</span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase">kg</span>
                          </div>
                          <div className="h-12 mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <Area type="monotone" dataKey="weight" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.1} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                          </div>
                      </div>
                      <div className="bg-dark/50 p-4 rounded-2xl border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-1">
                              <Percent size={12} className="text-emerald-400" />
                              <p className="text-[8px] font-black text-gray-500 uppercase">BF%</p>
                          </div>
                          <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-emerald-400">{latestMeasurement.bodyFat ? latestMeasurement.bodyFat.toLocaleString('it-IT') : '--'}</span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase">%</span>
                          </div>
                          <div className="h-12 mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <Area type="monotone" dataKey="bodyFat" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                <p className="text-gray-500 font-bold uppercase text-[10px]">Monitora il peso per vedere i grafici</p>
                <button onClick={() => changeTab('measurements')} className="bg-primary text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Inizia Ora</button>
            </div>
          )}
      </div>

      {activeRoutine ? (
        <div className="mb-10">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Sessioni</h2>
                <span className="text-[10px] text-primary bg-primary/10 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary/20">{activeRoutine.name}</span>
            </div>
            <div className="grid gap-4">
                {activeRoutine.days.map(day => {
                    const isLastCompleted = lastLogEntry?.routineDayId === day.id;
                    return (
                        <button key={day.id} onClick={() => onStartWorkout(activeRoutine, day.id)} className={`bg-surface p-5 rounded-[2rem] text-left transition-all shadow-lg flex justify-between items-center border border-slate-700/30 active:scale-[0.98] ${isLastCompleted ? 'ring-2 ring-emerald-500/20 bg-emerald-500/5' : ''}`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-lg text-white uppercase tracking-tight truncate">{day.name}</h3>
                                    {isLastCompleted && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest">{getTimeAgo(lastLogEntry.date)}</span>}
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{day.exercises.length} Esercizi</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-transform active:scale-90"><Play size={20} fill="currentColor" /></div>
                        </button>
                    );
                })}
            </div>
        </div>
      ) : (
        <div className="bg-surface rounded-[2.5rem] p-10 text-center mb-10 shadow-xl border border-slate-700/30">
            <p className="text-gray-500 font-bold uppercase text-xs mb-6">Nessuna routine attiva</p>
            <button onClick={() => changeTab('routines')} className="bg-primary px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform">Crea Piano</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
          <button onClick={() => changeTab('stats')} className="bg-surface p-5 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform h-28 border border-slate-700/30">
              <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center"><BarChart2 size={20}/></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Stats</span>
          </button>
          <button onClick={() => changeTab('history')} className="bg-surface p-5 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform h-28 border border-slate-700/30">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center"><CalendarDays size={20}/></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Logs</span>
          </button>
          <button onClick={() => changeTab('calculator')} className="bg-surface p-5 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform h-28 border border-slate-700/30">
              <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center"><Calculator size={20}/></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tool</span>
          </button>
      </div>
    </div>
  );
};

export default Dashboard;
