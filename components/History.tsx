
import React, { useState, useEffect } from 'react';
import { getWorkoutLogs, deleteWorkoutLog, getExercises } from '../services/storageService';
import { WorkoutLog, Exercise, SetType } from '../types';
import { Calendar, Trash2, Clock, Dumbbell, AlertTriangle, Flame, Share2, Check } from 'lucide-react';

const History: React.FC = () => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleShare = async (log: WorkoutLog) => {
    const dateStr = new Date(log.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    const totalVolume = log.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => s.completed ? sAcc + (s.weight * s.reps) : sAcc, 0), 0);
    
    let message = `🏋️‍♂️ *Workout IronTrack* - ${dateStr}\n⏱ Durata: ${log.durationMinutes} min\n🔥 Calorie: ${log.calories || 0} kcal\n`;
    if (totalVolume > 0) message += `📈 Volume: ${totalVolume.toLocaleString('it-IT')} kg\n`;
    message += `\n*Esercizi:* \n`;
    
    log.exercises.forEach(ex => {
        const name = getExerciseName(ex.exerciseId);
        const completedSets = ex.sets.filter(s => s.completed);
        
        if (completedSets.length > 0) {
            const bestSet = completedSets.reduce((prev, curr) => (curr.weight > (prev?.weight || 0) ? curr : prev), completedSets[0]);
            message += `• ${name}: ${completedSets.length} serie (Best: ${bestSet.weight.toLocaleString('it-IT')}kg x ${bestSet.reps})\n`;
        }
    });
    
    message += `\nRegistrato con IronTrack Pro 🚀`;

    if (navigator.share) {
        try { 
            await navigator.share({ title: 'Il mio Workout', text: message }); 
        } catch (err) { console.log("Sharing failed", err); }
    } else {
        try { 
            await navigator.clipboard.writeText(message); 
            setCopiedId(log.id); 
            setTimeout(() => setCopiedId(null), 2000); 
        } catch (err) { console.log("Clipboard failed", err); }
    }
  };

  return (
    <div className="p-4 pb-32">
      <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Il tuo Storico</h2>
      
      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="bg-surface p-6 rounded-[2rem] relative overflow-hidden shadow-xl border border-slate-700/30">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/40"></div>
            
            <div className="flex justify-between items-start mb-4 pl-2">
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-[10px] mb-1 font-black uppercase tracking-widest">
                    <Calendar size={12} className="text-primary"/> {new Date(log.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1">
                        <Clock size={10} /> {log.durationMinutes} min
                    </span>
                    {log.calories && log.calories > 0 && (
                        <span className="text-[10px] font-black uppercase text-orange-400 bg-orange-900/20 px-3 py-1 rounded-full border border-orange-500/20 flex items-center gap-1">
                            <Flame size={10} /> {log.calories} kcal
                        </span>
                    )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => handleShare(log)} className={`p-2.5 rounded-xl transition-all border ${copiedId === log.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800/50 text-gray-400 border-slate-700 hover:text-primary active:scale-90'}`}>
                    {copiedId === log.id ? <Check size={18} /> : <Share2 size={18} />}
                </button>
                <button onClick={() => setLogToDelete(log.id)} className="text-gray-500 hover:text-red-400 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 active:scale-90">
                    <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="pl-2 mt-4 pt-4 border-t border-slate-700/30 space-y-5">
                 {log.exercises.map((ex, i) => {
                    const completed = ex.sets.filter(s => s.completed);
                    if (completed.length === 0) return null;
                    
                    return (
                        <div key={i}>
                            <div className="text-white font-black text-sm uppercase mb-2 flex items-center gap-2">
                                <div className="w-1 h-3 bg-primary rounded-full"></div>
                                {getExerciseName(ex.exerciseId)}
                                <span className="text-[10px] text-slate-500 font-bold ml-auto">{completed.length} SETS</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {completed.map((s, idx) => (
                                    <div key={idx} className="bg-dark/60 px-3 py-2 rounded-xl text-[11px] text-gray-300 font-bold border border-slate-800 shadow-inner">
                                        {getTypeBadge(s.type)}
                                        <span className="font-mono">{s.weight.toLocaleString('it-IT')} <span className="text-[8px] opacity-40">KG</span> <span className="opacity-40">×</span> {s.reps}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                 })}
            </div>
          </div>
        ))}
        
        {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 text-gray-600 gap-4 opacity-50">
                <Dumbbell size={64} className="animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nessun log disponibile</p>
            </div>
        )}
      </div>

      {logToDelete && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[2000] p-6 backdrop-blur-md animate-in fade-in">
            <div className="bg-surface p-10 rounded-[3rem] w-full max-w-sm text-center border border-slate-700 shadow-2xl">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="text-red-500" size={40} />
                </div>
                <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight">Eliminare Log?</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Questa azione è irreversibile.</p>
                <div className="flex gap-4">
                    <button onClick={() => setLogToDelete(null)} className="flex-1 py-4 text-gray-400 font-black uppercase text-xs tracking-widest">Annulla</button>
                    <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-transform">Elimina</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default History;
