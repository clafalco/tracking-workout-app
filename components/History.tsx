

import React, { useState, useEffect } from 'react';
import { getWorkoutLogs, deleteWorkoutLog, getExercises } from '../services/storageService';
import { WorkoutLog, Exercise, SetType } from '../types';
import { Calendar, Trash2, Clock, Dumbbell, AlertTriangle, Info } from 'lucide-react';

const History: React.FC = () => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLogs(getWorkoutLogs().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setExercises(getExercises());
  }, []);

  const confirmDelete = () => {
    if (logToDelete) {
        deleteWorkoutLog(logToDelete);
        setLogs(prev => prev.filter(l => l.id !== logToDelete));
        setLogToDelete(null);
    }
  }

  const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || 'Esercizio';

  const getTypeBadge = (type?: SetType) => {
      switch(type) {
          case 'warmup': return <span className="text-[10px] font-bold text-yellow-500 border border-yellow-500/30 px-1 rounded">W</span>;
          case 'failure': return <span className="text-[10px] font-bold text-red-500 border border-red-500/30 px-1 rounded">F</span>;
          case 'drop': return <span className="text-[10px] font-bold text-purple-400 border border-purple-500/30 px-1 rounded">D</span>;
          default: return null;
      }
  }

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-white mb-6">Storico Allenamenti</h2>
      
      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="bg-surface p-5 rounded-xl border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-3 pl-2">
              <div>
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Calendar size={14}/> {new Date(log.date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">
                        <Clock size={12}/> {log.durationMinutes} min
                    </span>
                    <span className="text-xs text-gray-500">
                        {log.exercises.length} Esercizi
                    </span>
                </div>
              </div>
              <button onClick={() => setLogToDelete(log.id)} className="text-slate-600 hover:text-red-400 transition-colors p-2">
                <Trash2 size={20} />
              </button>
            </div>
            
            <div className="pl-2 mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                 {log.exercises.map((ex, i) => (
                    <div key={i} className="text-sm">
                        <div className="text-gray-300 font-medium mb-1">{getExerciseName(ex.exerciseId)}</div>
                        <div className="flex flex-wrap gap-2">
                            {ex.sets.filter(s => s.completed).map((s, idx) => (
                                <div key={idx} className="bg-slate-800 px-2 py-1 rounded text-xs text-gray-400 flex items-center gap-1 border border-slate-700">
                                    {getTypeBadge(s.type)}
                                    <span>{s.weight}kg x {s.reps}</span>
                                    {s.rpe && s.rpe > 0 && <span className="text-[9px] text-gray-500">RPE{s.rpe}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                 ))}
            </div>
          </div>
        ))}
        
        {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-500 gap-4">
                <Dumbbell size={48} className="opacity-20"/>
                <p>Nessun allenamento registrato.</p>
            </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-surface p-6 rounded-2xl w-full max-w-sm border border-slate-700">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-200 mb-6">
                    <AlertTriangle className="text-red-500 shrink-0" size={24} />
                    <div>
                        <p className="font-bold text-red-400">Elimina Allenamento</p>
                        <p className="text-xs opacity-80 mt-1">Sei sicuro? Questa azione non può essere annullata.</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setLogToDelete(null)} 
                        className="px-4 py-2 rounded-lg text-gray-300 hover:bg-slate-700 border border-slate-600"
                    >
                        Annulla
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-500/20"
                    >
                        Elimina
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default History;