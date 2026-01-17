
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { getWorkoutLogs, getExercises } from '../services/storageService';
import { analyzeWorkoutPerformance } from '../services/geminiService';
import { WorkoutLog, Exercise, MuscleGroup, ExerciseType } from '../types';
import { MUSCLE_GROUP_COLORS } from '../constants';
import MuscleMap from './MuscleMap';
import { Trophy, Target, Search, TrendingUp, X, Dumbbell, Flame, Sparkles, Wand2, RefreshCcw, Activity, Zap, Layers } from 'lucide-react';

const COLOR_MAP: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-orange-500': '#f97316',
  'bg-teal-500': '#14b8a6',
  'bg-gray-500': '#6b7280',
};

const Statistics: React.FC = () => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    setLogs(getWorkoutLogs());
    setExercises(getExercises());
  }, []);

  const handleAiAnalysis = async () => {
    if (logs.length === 0) return;
    setIsAiLoading(true);
    try {
        const feedback = await analyzeWorkoutPerformance(logs, exercises);
        setAiFeedback(feedback);
    } catch (err) {
        setAiFeedback("Errore nell'analisi AI. Riprova.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const volumeStats = useMemo(() => {
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const progression = sortedLogs.map(log => {
      const dailyVolume = log.exercises.reduce((total, ex) => {
        return total + ex.sets.reduce((st, s) => s.completed ? st + (s.weight * s.reps) : st, 0);
      }, 0);
      return {
        date: new Date(log.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        volume: dailyVolume
      };
    }).slice(-15);
    const totalVolume = logs.reduce((acc, log) => acc + log.exercises.reduce((total, ex) => total + ex.sets.reduce((st, s) => s.completed ? st + (s.weight * s.reps) : st, 0), 0), 0);
    const avgVolume = logs.length > 0 ? Math.round(totalVolume / logs.length) : 0;
    return { progression, totalVolume, avgVolume };
  }, [logs]);

  const exerciseProgressData = useMemo(() => {
      if (!selectedExerciseId) return [];
      const relevantLogs = logs.filter(l => l.exercises.some(e => e.exerciseId === selectedExerciseId)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return relevantLogs.map(log => {
          const exLog = log.exercises.find(e => e.exerciseId === selectedExerciseId);
          if (!exLog) return null;
          let bestSet = { weight: 0, reps: 0, oneRepMax: 0 };
          exLog.sets.forEach(set => {
              if (!set.completed || !set.weight) return;
              const estimated1RM = set.weight * (1 + (set.reps || 1) / 30);
              if (estimated1RM > bestSet.oneRepMax) bestSet = { weight: set.weight, reps: set.reps || 0, oneRepMax: Math.round(estimated1RM) };
          });
          if (bestSet.oneRepMax === 0) return null;
          return { date: new Date(log.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), oneRepMax: bestSet.oneRepMax };
      }).filter(Boolean);
  }, [selectedExerciseId, logs]);

  const rawMuscleDistribution = useMemo(() => {
    return logs.reduce((acc, log) => {
        log.exercises.forEach(logEx => {
            const exercise = exercises.find(e => e.id === logEx.exerciseId);
            if (exercise) {
                acc[exercise.muscleGroup] = (acc[exercise.muscleGroup] || 0) + logEx.sets.filter(s => s.completed).length;
            }
        });
        return acc;
    }, {} as Record<string, number>);
  }, [logs, exercises]);

  const radarData = useMemo(() => {
      return Object.values(MuscleGroup).map(group => ({
          subject: group,
          A: rawMuscleDistribution[group] || 0,
          // Fix: Aggiunto cast esplicito a number[] per risolvere l'errore TypeScript su Object.values
          fullMark: Math.max(...(Object.values(rawMuscleDistribution) as number[]), 1)
      }));
  }, [rawMuscleDistribution]);

  const pieData = useMemo(() => {
    return Object.keys(rawMuscleDistribution).map(key => ({
        name: key,
        value: rawMuscleDistribution[key],
        color: COLOR_MAP[MUSCLE_GROUP_COLORS[key as MuscleGroup]] || '#8884d8'
    })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  }, [rawMuscleDistribution]);

  const prList = useMemo(() => {
    const personalRecords = logs.reduce<Record<string, { weight: number, date: string }>>((acc, log) => {
        log.exercises.forEach(logEx => {
            const exercise = exercises.find(e => e.id === logEx.exerciseId);
            if (exercise && exercise.type === ExerciseType.Weighted) {
                const maxSet = Math.max(...logEx.sets.filter(s => s.completed).map(s => s.weight || 0), 0);
                if (maxSet > 0) {
                    if (!acc[exercise.name] || maxSet > acc[exercise.name].weight) {
                        acc[exercise.name] = { weight: maxSet, date: log.date };
                    }
                }
            }
        });
        return acc;
    }, {});
    return Object.entries(personalRecords)
      .map(([name, data]: [string, { weight: number, date: string }]) => ({ name, weight: data.weight, date: data.date }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);
  }, [logs, exercises]);

  return (
    <div className="p-4 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Analytics</h2>
        <button 
            onClick={handleAiAnalysis}
            disabled={logs.length === 0 || isAiLoading}
            className="bg-primary hover:opacity-80 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
            {isAiLoading ? <RefreshCcw size={16} className="animate-spin" /> : <Sparkles size={16}/>} 
            AI Analysis
        </button>
      </div>

      {aiFeedback && (
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-5 rounded-[2rem] shadow-xl mb-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                    <Wand2 size={14} /> Coach Advice
                </div>
                <button onClick={() => setAiFeedback(null)} className="text-gray-500 hover:text-white"><X size={16}/></button>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed italic">"{aiFeedback}"</p>
          </div>
      )}

      <div className="space-y-6">
        {/* Heatmap Muscolare 3D */}
        <div className="bg-surface rounded-[2.5rem] p-6 border border-slate-700/30 shadow-lg relative overflow-hidden">
            <h3 className="text-lg font-black mb-6 text-white uppercase tracking-tight flex items-center gap-2">
                <Activity size={20} className="text-primary"/> Heatmap Muscolare
            </h3>
            <div className="scale-95 -mx-4">
                <MuscleMap statsData={rawMuscleDistribution} />
            </div>
            <div className="mt-6 space-y-2">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-center">Simmetria Corporea</p>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 8, fontWeight: 'bold'}} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Intensità" dataKey="A" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.6} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Card Volume Totale */}
        <div className="bg-surface p-6 rounded-[2.5rem] border border-slate-700/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Zap size={100} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-black mb-6 text-white uppercase tracking-tight flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400"/> Volume Allenamento
            </h3>
            
            <div className="h-48 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeStats.progression}>
                        <defs>
                            <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 'bold'}} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 'bold'}} hide />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px rgba(0,0,0,0.4)'}}
                            itemStyle={{color: '#10b981', fontWeight: 'bold'}}
                        />
                        <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark/50 p-4 rounded-2xl border border-slate-800">
                    <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Totale Caricato</div>
                    <div className="font-black text-white text-xl">{volumeStats.totalVolume.toLocaleString('it-IT')} <span className="text-xs text-gray-500 font-normal">kg</span></div>
                </div>
                <div className="bg-dark/50 p-4 rounded-2xl border border-slate-800">
                    <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Media Sessione</div>
                    <div className="font-black text-white text-xl">{volumeStats.avgVolume.toLocaleString('it-IT')} <span className="text-xs text-gray-500 font-normal">kg</span></div>
                </div>
            </div>
        </div>

        {/* Focus Distribuzione (Pie Chart migliorato) */}
        <div className="bg-surface p-6 rounded-[2.5rem] border border-slate-700/30 shadow-lg">
            <h3 className="text-lg font-black mb-6 text-white uppercase tracking-tight flex items-center gap-2">
                <Layers size={20} className="text-purple-400"/> Distribuzione Set
            </h3>
            <div className="flex items-center justify-between">
                <div className="h-56 w-1/2">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '16px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-500 text-[10px] font-black uppercase">Nessun dato</p>
                    )}
                </div>
                <div className="w-1/2 pl-4 space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                    {pieData.slice(0, 6).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: item.color}}></div>
                            <span className="text-[9px] font-black text-gray-300 uppercase truncate">{item.name}</span>
                            <span className="text-[9px] font-bold text-gray-500 ml-auto">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Evoluzione Forza Singolo Esercizio */}
        <div className="bg-surface p-6 rounded-[2.5rem] border border-slate-700/30 shadow-lg">
            <h3 className="text-lg font-black mb-4 text-white uppercase tracking-tight flex items-center gap-2">
                <Activity size={20} className="text-primary"/> Evoluzione Forza
            </h3>
            
            {!selectedExerciseId ? (
                <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input 
                        type="text" 
                        placeholder="Cerca esercizio..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowSelector(true)}
                        className="w-full bg-dark text-white pl-11 p-4 rounded-2xl focus:outline-none border border-slate-700/50 font-bold"
                    />
                    {showSelector && searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-slate-700 rounded-2xl max-h-48 overflow-y-auto z-20 no-scrollbar shadow-2xl">
                            {exercises.filter(e => e.type === ExerciseType.Weighted && e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(ex => (
                                <button key={ex.id} onClick={() => { setSelectedExerciseId(ex.id); setSearchTerm(''); setShowSelector(false); }} className="w-full text-left p-4 hover:bg-slate-700 text-sm text-gray-200 border-b border-slate-800 last:border-0 font-bold uppercase tracking-tight">
                                    {ex.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                     <div className="flex justify-between items-start mb-6">
                        <div className="min-w-0 flex-1">
                             <h4 className="text-lg font-black text-white uppercase tracking-tight truncate">
                                {exercises.find(e => e.id === selectedExerciseId)?.name}
                             </h4>
                             <p className="text-[10px] text-gray-500 font-black uppercase mt-1">Stima Massimale 1RM</p>
                        </div>
                        <button onClick={() => setSelectedExerciseId(null)} className="text-gray-400 bg-slate-800 p-2 rounded-full shrink-0"><X size={18} /></button>
                     </div>

                     {exerciseProgressData.length > 1 ? (
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={exerciseProgressData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 'bold'}} />
                                    <YAxis stroke="#94a3b8" hide />
                                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '16px'}} />
                                    <Line type="monotone" dataKey="oneRepMax" stroke="#6366f1" strokeWidth={4} dot={{r: 4, fill: '#6366f1', strokeWidth: 0}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                     ) : (
                         <div className="text-center py-10 text-gray-500 text-xs uppercase font-black tracking-widest">Dati insufficienti</div>
                     )}
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface p-6 rounded-[2.5rem] border border-slate-700/30 text-center shadow-lg">
                <div className="text-4xl font-black text-primary tracking-tight">{logs.length}</div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">Workout</div>
            </div>
            <div className="bg-surface p-6 rounded-[2.5rem] border border-slate-700/30 text-center shadow-lg">
                <div className="text-4xl font-black text-orange-400 tracking-tight">
                    {Math.round(logs.reduce((acc, l) => acc + (l.calories || 0), 0) / 1000)}<span className="text-lg">k</span>
                </div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">kcal Bruciate</div>
            </div>
        </div>

        <div className="bg-surface p-8 rounded-[2.5rem] border border-slate-700/30 shadow-lg">
            <h3 className="text-lg font-black mb-6 text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy size={20} className="text-yellow-400"/> Personal Best
            </h3>
            <div className="space-y-4">
                {prList.length > 0 ? prList.map((pr, index) => (
                    <div key={index} className="flex justify-between items-center border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                        <div>
                            <div className="font-black text-white uppercase tracking-tight text-sm">{pr.name}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-1">{new Date(pr.date).toLocaleDateString('it-IT')}</div>
                        </div>
                        <div className="text-2xl font-black text-emerald-400">{pr.weight.toLocaleString('it-IT')} <span className="text-xs text-gray-500 font-normal">kg</span></div>
                    </div>
                )) : (
                    <p className="text-gray-500 text-xs text-center py-4 uppercase font-black tracking-widest">Inizia ad allenarti!</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
