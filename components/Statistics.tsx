
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { getWorkoutLogs, getExercises } from '../services/storageService';
import { WorkoutLog, Exercise, MuscleGroup, ExerciseType } from '../types';
import { MUSCLE_GROUP_COLORS } from '../constants';
import { Trophy, Target, Search, TrendingUp, X, Dumbbell } from 'lucide-react';

// Mapping tailwind classes to hex codes for Recharts
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
  
  // State for Single Exercise Analysis
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    setLogs(getWorkoutLogs());
    setExercises(getExercises());
  }, []);

  // --- SINGLE EXERCISE PROGRESSION LOGIC ---
  const exerciseProgressData = useMemo(() => {
      if (!selectedExerciseId) return [];

      const relevantLogs = logs
        .filter(l => l.exercises.some(e => e.exerciseId === selectedExerciseId))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return relevantLogs.map(log => {
          const exLog = log.exercises.find(e => e.exerciseId === selectedExerciseId);
          if (!exLog) return null;

          // Find the "best" set of the day based on Estimated 1RM
          // Formula: Weight * (1 + Reps/30)
          let bestSet = { weight: 0, reps: 0, oneRepMax: 0 };
          
          exLog.sets.forEach(set => {
              if (!set.completed || !set.weight) return;
              const estimated1RM = set.weight * (1 + (set.reps || 1) / 30);
              if (estimated1RM > bestSet.oneRepMax) {
                  bestSet = { 
                      weight: set.weight, 
                      reps: set.reps || 0, 
                      oneRepMax: Math.round(estimated1RM) 
                  };
              }
          });

          if (bestSet.oneRepMax === 0) return null;

          return {
              date: new Date(log.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
              fullDate: new Date(log.date).toLocaleDateString('it-IT'),
              oneRepMax: bestSet.oneRepMax,
              weight: bestSet.weight,
              reps: bestSet.reps
          };
      }).filter(Boolean) as { date: string, fullDate: string, oneRepMax: number, weight: number, reps: number }[];
  }, [selectedExerciseId, logs]);

  const exerciseStats = useMemo(() => {
      if (exerciseProgressData.length < 2) return null;
      const start = exerciseProgressData[0].oneRepMax;
      const current = exerciseProgressData[exerciseProgressData.length - 1].oneRepMax;
      const increase = current - start;
      const percent = ((increase / start) * 100).toFixed(1);
      
      const maxEver = Math.max(...exerciseProgressData.map(d => d.oneRepMax));

      return { start, current, increase, percent, maxEver };
  }, [exerciseProgressData]);


  // --- GENERAL STATS LOGIC ---

  // 1. Workouts per week day
  const workoutsPerDay = logs.reduce((acc, log) => {
    const date = new Date(log.date).toLocaleDateString('it-IT', { weekday: 'short' });
    const key = date.charAt(0).toUpperCase() + date.slice(1);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(workoutsPerDay).map(key => ({
    name: key,
    allenamenti: workoutsPerDay[key]
  }));

  // 2. Volume over time
  const volumeData = logs
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(log => {
      const volume = log.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((st, s) => st + (s.weight * s.reps), 0);
      }, 0);
      return {
          date: new Date(log.date).toLocaleDateString('it-IT', {day: '2-digit', month: '2-digit'}),
          volume: volume
      }
    }).slice(-10);

  // 3. Muscle Group Distribution
  const muscleDistribution = logs.reduce((acc, log) => {
      log.exercises.forEach(logEx => {
          const exercise = exercises.find(e => e.id === logEx.exerciseId);
          if (exercise) {
              acc[exercise.muscleGroup] = (acc[exercise.muscleGroup] || 0) + logEx.sets.filter(s => s.completed).length;
          }
      });
      return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(muscleDistribution).map(key => ({
      name: key,
      value: muscleDistribution[key],
      color: COLOR_MAP[MUSCLE_GROUP_COLORS[key as MuscleGroup]] || '#8884d8'
  })).filter(d => d.value > 0);

  // 4. Personal Records (Max Weight per Exercise)
  const personalRecords = logs.reduce((acc, log) => {
      log.exercises.forEach(logEx => {
          const exercise = exercises.find(e => e.id === logEx.exerciseId);
          if (exercise && exercise.type === ExerciseType.Weighted) {
              const maxSet = Math.max(...logEx.sets.map(s => s.weight || 0));
              if (maxSet > 0) {
                  if (!acc[exercise.name] || maxSet > acc[exercise.name].weight) {
                      acc[exercise.name] = { weight: maxSet, date: log.date };
                  }
              }
          }
      });
      return acc;
  }, {} as Record<string, { weight: number, date: string }>);

  const prList = Object.entries(personalRecords)
    .map(([name, data]) => {
      const record = data as { weight: number; date: string };
      return { name, weight: record.weight, date: record.date };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5); // Top 5 heaviest lifts
  
  // Filtering for selector
  const filteredExercises = exercises.filter(e => 
      e.type === ExerciseType.Weighted &&
      e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-white mb-6">Analisi Allenamenti</h2>

      <div className="space-y-6">
        
        {/* --- SECTION 1: SINGLE EXERCISE PROGRESSION --- */}
        <div className="bg-surface p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary"/> Analisi Progresso
            </h3>
            
            {!selectedExerciseId ? (
                <div className="relative">
                     <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                     <input 
                        type="text" 
                        placeholder="Cerca un esercizio per vedere i grafici..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowSelector(true)}
                        className="w-full bg-dark text-white pl-10 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-slate-600"
                    />
                    {showSelector && searchTerm && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-slate-700 rounded-xl max-h-48 overflow-y-auto z-20 shadow-xl">
                            {filteredExercises.map(ex => (
                                <button 
                                    key={ex.id} 
                                    onClick={() => {
                                        setSelectedExerciseId(ex.id);
                                        setSearchTerm('');
                                        setShowSelector(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-slate-700 text-sm text-gray-200 border-b border-slate-800 last:border-0"
                                >
                                    {ex.name} <span className="text-xs text-gray-500">({ex.muscleGroup})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                             <h4 className="text-xl font-bold text-white">
                                {exercises.find(e => e.id === selectedExerciseId)?.name}
                             </h4>
                             <p className="text-xs text-gray-400">Andamento Massimale Stimato (1RM)</p>
                        </div>
                        <button 
                            onClick={() => setSelectedExerciseId(null)}
                            className="text-gray-400 hover:text-white bg-slate-700/50 p-2 rounded-full"
                        >
                            <X size={16} />
                        </button>
                     </div>

                     {exerciseProgressData.length > 0 ? (
                        <>
                            <div className="h-56 w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={exerciseProgressData}>
                                        <defs>
                                            <linearGradient id="color1RM" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} />
                                        <YAxis stroke="#94a3b8" domain={['dataMin - 5', 'auto']} tick={{fontSize: 10}} />
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                            itemStyle={{color: '#fff'}}
                                            labelStyle={{color: '#94a3b8', marginBottom: '0.5rem'}}
                                            formatter={(value: any, name: any, props: any) => {
                                                if (name === 'oneRepMax') return [`${value} kg`, '1RM Stimato'];
                                                return [value, name];
                                            }}
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload.length > 0) {
                                                    const data = payload[0].payload;
                                                    return `${data.fullDate} (${data.weight}kg x ${data.reps})`;
                                                }
                                                return label;
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="oneRepMax" 
                                            stroke="#6366f1" 
                                            strokeWidth={3} 
                                            fillOpacity={1} 
                                            fill="url(#color1RM)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {exerciseStats && (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-dark p-3 rounded-lg text-center border border-slate-800">
                                        <div className="text-xs text-gray-500 uppercase">Start</div>
                                        <div className="font-bold text-white">{exerciseStats.start} <span className="text-[10px] font-normal">kg</span></div>
                                    </div>
                                    <div className="bg-dark p-3 rounded-lg text-center border border-slate-800">
                                        <div className="text-xs text-gray-500 uppercase">Max</div>
                                        <div className="font-bold text-primary">{exerciseStats.maxEver} <span className="text-[10px] font-normal">kg</span></div>
                                    </div>
                                    <div className={`bg-dark p-3 rounded-lg text-center border border-slate-800 ${Number(exerciseStats.increase) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <div className="text-xs text-gray-500 uppercase">Gain</div>
                                        <div className="font-bold">{exerciseStats.increase > 0 ? '+' : ''}{exerciseStats.percent}%</div>
                                    </div>
                                </div>
                            )}
                        </>
                     ) : (
                         <div className="text-center py-8 text-gray-500 text-sm">
                             Non ci sono abbastanza dati per questo esercizio.
                         </div>
                     )}
                </div>
            )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface p-4 rounded-xl border border-slate-700 text-center shadow-lg">
                <div className="text-3xl font-bold text-primary">{logs.length}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Totale Workout</div>
            </div>
            <div className="bg-surface p-4 rounded-xl border border-slate-700 text-center shadow-lg">
                <div className="text-3xl font-bold text-emerald-400">
                    {Math.round(logs.reduce((acc, l) => acc + l.durationMinutes, 0) / 60)}<span className="text-lg text-gray-500">h</span>
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Tempo Totale</div>
            </div>
        </div>

        {/* Muscle Distribution Pie Chart */}
        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
                <Target size={18} className="text-purple-400"/> Focus Muscolare (Set Totali)
            </h3>
            <div className="h-64 w-full flex items-center justify-center">
                {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}}
                                itemStyle={{color: '#fff'}}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-gray-500 text-sm">Dati insufficienti</p>
                )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
                {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1 text-xs text-gray-400">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                        {d.name}
                    </div>
                ))}
            </div>
        </div>

        {/* Personal Records List */}
        <div className="bg-surface p-5 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-200 flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400"/> Record Personali (Top 5)
            </h3>
            <div className="space-y-3">
                {prList.length > 0 ? prList.map((pr, index) => (
                    <div key={index} className="flex justify-between items-center border-b border-slate-700 pb-2 last:border-0 last:pb-0">
                        <div>
                            <div className="font-bold text-white">{pr.name}</div>
                            <div className="text-xs text-gray-500">{new Date(pr.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-xl font-bold text-emerald-400">{pr.weight} <span className="text-xs text-gray-500 font-normal">kg</span></div>
                    </div>
                )) : (
                    <p className="text-gray-500 text-sm text-center py-4">Completa degli allenamenti per vedere i tuoi record.</p>
                )}
            </div>
        </div>

        {/* Weekly Frequency */}
        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Giorni di Allenamento</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
                        <YAxis stroke="#94a3b8" allowDecimals={false} hide />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}}
                            cursor={{fill: '#334155', opacity: 0.4}}
                        />
                        <Bar dataKey="allenamenti" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Volume History */}
        <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Volume (Ultimi 10)</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} />
                        <YAxis stroke="#94a3b8" hide />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}}
                            itemStyle={{color: '#10b981'}}
                        />
                        <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} dot={{fill: '#10b981', r: 4}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Statistics;
