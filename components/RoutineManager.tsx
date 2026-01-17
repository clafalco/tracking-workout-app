
import React, { useState, useEffect } from 'react';
import { Routine, RoutineDay, RoutineExercise, Exercise, MuscleGroup, ExerciseType, RoutineTemplate } from '../types';
import { getRoutines, saveRoutines, getExercises, saveExercises, getRoutineTemplates, saveRoutineTemplates } from '../services/storageService';
import { Plus, Trash2, Edit2, Search, X, Save, ArrowLeft, ArrowUp, ArrowDown, PlayCircle, Activity, User, Calendar, Clock, Weight, Minus, ChevronUp, ChevronDown, Trash, AlertTriangle, PlusCircle, Copy, Check, Link as LinkIcon, Layers, Zap } from 'lucide-react';

interface VerticalStepperProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  step: number;
  className?: string;
}

const VerticalStepper: React.FC<VerticalStepperProps> = ({ value, onChange, label, step, className = "" }) => {
  const handleStep = (s: number) => {
    // Fix: Uso String(value) per evitare l'inferenza 'never' nel ramo else di un tipo number
    const currentValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    const newValue = Math.max(0, parseFloat((currentValue + s).toFixed(2)));
    onChange(newValue);
  };

  return (
    <div className={`flex flex-col flex-1 min-w-[50px] ${className}`}>
      <span className="text-[7px] font-black text-slate-500 uppercase text-center mb-0.5">{label}</span>
      <div className="flex flex-col bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <button type="button" onClick={() => handleStep(step)} className="h-7 flex items-center justify-center text-primary active:bg-primary/20"><Plus size={12} strokeWidth={3} /></button>
        <input 
            type="text" 
            inputMode="decimal" 
            className="w-full bg-slate-900 text-center font-black text-sm focus:outline-none py-1 border-y border-slate-700/50 text-white" 
            value={value} 
            onChange={e => {
                const val = e.target.value.replace(',', '.');
                if (val === '') onChange(0);
                else if (!isNaN(Number(val))) onChange(parseFloat(val));
            }} 
        />
        <button type="button" onClick={() => handleStep(-step)} className="h-7 flex items-center justify-center text-slate-400 active:bg-red-500/20"><Minus size={12} strokeWidth={3} /></button>
      </div>
    </div>
  );
};

const RoutineManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'routines' | 'templates'>('routines');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'routine' | 'template'} | null>(null);
  const [editorData, setEditorData] = useState<Partial<Routine> & Partial<RoutineTemplate>>({ name: '', days: [] });
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [selectorDayId, setSelectorDayId] = useState<string | null>(null);
  const [swappingRoutineExerciseId, setSwappingRoutineExerciseId] = useState<string | null>(null); 
  const [selectorSearchTerm, setSelectorSearchTerm] = useState('');
  const [isCreatingQuickExercise, setIsCreatingQuickExercise] = useState(false);
  const [quickExerciseData, setQuickExerciseData] = useState<Partial<Exercise>>({ name: '', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted });
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => { 
    setRoutines(getRoutines()); 
    setTemplates(getRoutineTemplates()); 
    setExercises(getExercises()); 
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const convertRoutineToTemplate = (routine: Routine) => {
    const newTemplate: RoutineTemplate = {
      id: 'temp_' + Date.now(),
      name: routine.name + " (Copia)",
      days: JSON.parse(JSON.stringify(routine.days))
    };
    const updated = [...templates, newTemplate];
    saveRoutineTemplates(updated);
    setTemplates(updated);
    showFeedback("Modello creato!");
  };

  const convertTemplateToRoutine = (template: RoutineTemplate) => {
    const newRoutine: Routine = {
      id: 'rout_' + Date.now(),
      name: template.name,
      days: JSON.parse(JSON.stringify(template.days)),
      startDate: new Date().toISOString()
    };
    const updated = [...routines, newRoutine];
    saveRoutines(updated);
    setRoutines(updated);
    showFeedback("Routine attivata!");
  };

  const saveCurrentWork = () => {
    if (!editorData.name || !editorData.days) return;
    const finalId = editorData.id === 'new' || !editorData.id ? Date.now().toString() : editorData.id!;
    if (activeView === 'routines') {
        const nr: Routine = { id: finalId, name: editorData.name, days: editorData.days as RoutineDay[], startDate: editorData.startDate || new Date().toISOString(), endDate: editorData.endDate };
        const updated = editorData.id === 'new' ? [...routines, nr] : routines.map(r => r.id === finalId ? nr : r);
        saveRoutines(updated); setRoutines(updated);
    } else {
        const nt: RoutineTemplate = { id: finalId, name: editorData.name, days: editorData.days as RoutineDay[] };
        const updated = editorData.id === 'new' ? [...templates, nt] : templates.map(t => t.id === finalId ? nt : t);
        saveRoutineTemplates(updated); setTemplates(updated);
    }
    setIsEditing(null); setEditorData({ name: '', days: [] });
  };

  const handleExerciseSelect = (exerciseId: string) => {
      if (!selectorDayId || !editorData.days) return;
      const dbEx = exercises.find(e => e.id === exerciseId);
      const isTimed = dbEx?.type === ExerciseType.Duration;
      const updatedDays = editorData.days.map(day => {
        if (day.id !== selectorDayId) return day;
        let nex = [...day.exercises];
        if (swappingRoutineExerciseId) nex = nex.map(ex => ex.id === swappingRoutineExerciseId ? { ...ex, exerciseId, targetRestSeconds: dbEx?.defaultRestSeconds || 60, targetReps: isTimed ? '60' : '10' } : ex);
        else nex.push({ id: Date.now().toString(), exerciseId, targetSets: 3, targetReps: isTimed ? '60' : '10', targetWeight: '0', targetRestSeconds: dbEx?.defaultRestSeconds || 60, isSuperset: false });
        return { ...day, exercises: nex };
      });
      setEditorData({...editorData, days: updatedDays}); setShowExerciseSelector(false);
  };

  const updateDayExercise = (dayId: string, exId: string, field: keyof RoutineExercise, value: any) => {
      if (!editorData.days) return;
      const updatedDays = editorData.days.map(day => day.id !== dayId ? day : { ...day, exercises: day.exercises.map(ex => ex.id !== exId ? ex : { ...ex, [field]: field === 'targetSets' ? Number(value) : value }) });
      setEditorData({ ...editorData, days: updatedDays });
  };

  // LOGICA CORRETTA PER SUPERSET MULTIPLI
  const toggleSuperset = (dayId: string, eIdx: number) => {
      if (!editorData.days) return;
      const updatedDays = editorData.days.map(day => {
          if (day.id !== dayId) return day;
          const nex = [...day.exercises];
          const current = nex[eIdx];

          if (current.isSuperset) {
              // Rimuovi dal superset
              nex[eIdx] = { ...current, isSuperset: false, supersetGroupId: undefined };
          } else {
              // Prova a unirti al gruppo precedente o creane uno nuovo
              let gid = eIdx > 0 ? nex[eIdx - 1].supersetGroupId : undefined;
              if (!gid) {
                  gid = 'ss_' + Date.now();
                  // Collega il corrente e il successivo per creare la base del gruppo
                  if (eIdx < nex.length - 1) {
                      nex[eIdx + 1] = { ...nex[eIdx + 1], isSuperset: true, supersetGroupId: gid };
                  }
              }
              nex[eIdx] = { ...current, isSuperset: true, supersetGroupId: gid };
          }
          return { ...day, exercises: nex };
      });
      setEditorData({ ...editorData, days: updatedDays });
  };

  const renderExerciseSelector = () => (
      <div className="fixed inset-0 z-[1100] bg-black/95 flex items-center justify-center sm:p-4 backdrop-blur-md">
          <div className="bg-surface w-full h-full sm:h-auto sm:max-w-sm sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-black text-white uppercase text-xs">{isCreatingQuickExercise ? "Nuovo Esercizio" : "Scegli Esercizio"}</h3>
                    <button onClick={() => { setShowExerciseSelector(false); setIsCreatingQuickExercise(false); }} className="text-gray-400 p-2"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar p-4">
                    {isCreatingQuickExercise ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase mb-1">Nome</label>
                                <input autoFocus placeholder="Es. Crunch..." className="w-full bg-dark border border-slate-600 p-4 rounded-xl text-white font-bold" value={quickExerciseData.name} onChange={e => setQuickExerciseData({...quickExerciseData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase mb-1">Gruppo</label>
                                <select className="w-full bg-dark border border-slate-600 p-4 rounded-xl text-white font-bold" value={quickExerciseData.muscleGroup} onChange={e => setQuickExerciseData({...quickExerciseData, muscleGroup: e.target.value as MuscleGroup})}>
                                    {Object.values(MuscleGroup).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-500 font-black uppercase mb-1">Tipo</label>
                                <select className="w-full bg-dark border border-slate-600 p-4 rounded-xl text-white font-bold" value={quickExerciseData.type} onChange={e => setQuickExerciseData({...quickExerciseData, type: e.target.value as ExerciseType})}>
                                    {Object.values(ExerciseType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <button onClick={() => {
                                if (!quickExerciseData.name) return;
                                const n = { id: 'q_'+Date.now(), name: quickExerciseData.name, muscleGroup: quickExerciseData.muscleGroup as MuscleGroup, type: quickExerciseData.type as ExerciseType, defaultRestSeconds: 60 };
                                saveExercises([...exercises, n]); setExercises([...exercises, n]); handleExerciseSelect(n.id);
                            }} className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase">Salva e Usa</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <input placeholder="Cerca..." className="w-full bg-dark border border-slate-600 p-3 rounded-xl text-white mb-2" value={selectorSearchTerm} onChange={e => setSelectorSearchTerm(e.target.value)} />
                            <button onClick={() => { setIsCreatingQuickExercise(true); setQuickExerciseData({...quickExerciseData, name: selectorSearchTerm, type: ExerciseType.Weighted}); }} className="w-full py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase border border-emerald-500/20">Manca? Crea Nuovo</button>
                            {exercises.filter(e => e.name.toLowerCase().includes(selectorSearchTerm.toLowerCase())).map(ex => (
                                <button key={ex.id} onClick={() => handleExerciseSelect(ex.id)} className="w-full bg-dark p-3 rounded-xl flex justify-between items-center border border-slate-800">
                                    <div className="text-left font-bold text-white text-sm">{ex.name}</div>
                                    <PlusCircle size={18} className="text-slate-600" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={() => setShowExerciseSelector(false)} className="w-full mt-auto bg-slate-700 py-5 font-black text-white uppercase text-xs">Chiudi</button>
          </div>
      </div>
  );

  const renderEditor = () => (
    <div className="p-3 pb-40 animate-in fade-in">
        <button onClick={() => setIsEditing(null)} className="text-slate-500 mb-4 flex items-center gap-1 text-xs uppercase font-black"><ArrowLeft size={14}/> Indietro</button>
        <div className="space-y-4 mb-6">
            <input className="w-full bg-surface p-4 rounded-2xl text-white border border-slate-700 font-bold text-lg" placeholder="Nome Routine..." value={editorData.name} onChange={e => setEditorData({...editorData, name: e.target.value})} />
            {activeView === 'routines' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[8px] text-slate-500 font-black uppercase px-1">Inizio</label>
                        <input type="date" className="w-full bg-dark p-3 rounded-xl text-white border border-slate-700 text-xs font-bold" value={editorData.startDate?.split('T')[0] || ''} onChange={e => setEditorData({...editorData, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined})} />
                    </div>
                    <div>
                        <label className="text-[8px] text-slate-500 font-black uppercase px-1">Fine</label>
                        <input type="date" className="w-full bg-dark p-3 rounded-xl text-white border border-slate-700 text-xs font-bold" value={editorData.endDate?.split('T')[0] || ''} onChange={e => setEditorData({...editorData, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined})} />
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-6">
            {editorData.days?.map((day, dIdx) => (
                <div key={day.id} className="bg-surface p-3 rounded-3xl border border-slate-700 shadow-lg">
                    <div className="flex gap-2 items-center mb-4">
                        <input className="flex-1 bg-dark p-2 rounded-xl text-xs font-black text-white uppercase" value={day.name} onChange={e => setEditorData({...editorData, days: editorData.days!.map(d => d.id === day.id ? { ...d, name: e.target.value } : d)})} />
                        <button onClick={() => {
                            if (window.confirm("Eliminare il giorno?")) {
                                setEditorData({...editorData, days: editorData.days!.filter(d => d.id !== day.id)});
                            }
                        }} className="p-2 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={16}/></button>
                    </div>
                    <div className="space-y-3">
                        {day.exercises.map((rex, eIdx) => {
                            const dbEx = exercises.find(e => e.id === rex.exerciseId);
                            const isTimed = dbEx?.type === ExerciseType.Duration;
                            const totalS = parseInt(rex.targetReps || '60');

                            return (
                                <div key={rex.id} className={`p-3 rounded-2xl bg-dark border ${rex.isSuperset ? 'border-indigo-500/40 shadow-md shadow-indigo-500/5' : 'border-slate-800'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <button onClick={() => { setSelectorDayId(day.id); setSwappingRoutineExerciseId(rex.id); setShowExerciseSelector(true); }} className="text-xs font-black text-white uppercase truncate flex-1 pr-2">{dbEx?.name || "Scegli..."}</button>
                                        <button 
                                            onClick={() => toggleSuperset(day.id, eIdx)} 
                                            className={`p-1.5 rounded-lg transition-colors ${rex.isSuperset ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-indigo-400 bg-indigo-500/10'}`}
                                        >
                                            <Layers size={14}/>
                                        </button>
                                    </div>
                                    <div className="flex gap-1.5 items-end">
                                        <VerticalStepper label="Sets" value={rex.targetSets} step={1} onChange={v => updateDayExercise(day.id, rex.id, 'targetSets', v)} />
                                        {isTimed ? (
                                            <>
                                                <VerticalStepper label="Min" value={Math.floor(totalS / 60)} step={1} onChange={m => updateDayExercise(day.id, rex.id, 'targetReps', (m * 60) + (totalS % 60))} />
                                                <VerticalStepper label="Sec" value={totalS % 60} step={5} onChange={s => updateDayExercise(day.id, rex.id, 'targetReps', (Math.floor(totalS / 60) * 60) + s)} />
                                            </>
                                        ) : (
                                            <>
                                                <VerticalStepper label="Reps" value={parseInt(rex.targetReps || '10')} step={1} onChange={v => updateDayExercise(day.id, rex.id, 'targetReps', v)} />
                                                <VerticalStepper label="Kg" value={parseFloat(rex.targetWeight || '0')} step={1} onChange={v => updateDayExercise(day.id, rex.id, 'targetWeight', v)} />
                                            </>
                                        )}
                                        <button onClick={() => setEditorData({...editorData, days: editorData.days!.map(d => d.id === day.id ? { ...d, exercises: d.exercises.filter(e => e.id !== rex.id) } : d)})} className="h-[74px] w-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center border border-red-500/20"><Trash size={14}/></button>
                                    </div>
                                </div>
                            );
                        })}
                        <button onClick={() => { setSelectorDayId(day.id); setSwappingRoutineExerciseId(null); setShowExerciseSelector(true); }} className="w-full py-3 bg-slate-800/30 text-slate-500 text-[9px] font-black uppercase rounded-xl border border-dashed border-slate-700">+ Aggiungi Esercizio</button>
                    </div>
                </div>
            ))}
            <button onClick={() => setEditorData({...editorData, days: [...(editorData.days || []), { id: Date.now().toString(), name: 'Giorno '+(editorData.days!.length+1), exercises: [] }]})} className="w-full bg-slate-800 py-4 rounded-2xl text-white font-black uppercase text-xs">Nuovo Giorno</button>
        </div>
        <div className="fixed bottom-[75px] left-3 right-3"><button onClick={saveCurrentWork} className="w-full bg-primary py-5 rounded-2xl font-black text-white uppercase shadow-2xl">Salva Tutto</button></div>
    </div>
  );

  return (
    <div className="p-3 pb-32">
      {isEditing ? renderEditor() : (
          <>
            <div className="flex justify-between items-center mb-6 pt-4 px-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Piani</h2>
                <button onClick={() => { setEditorData({ id: 'new', days: [] }); setIsEditing('new'); }} className="bg-primary text-white p-2 rounded-full shadow-lg"><Plus size={24} /></button>
            </div>
            
            <div className="flex p-1 bg-surface rounded-2xl border border-slate-700 mb-6">
                <button onClick={() => setActiveView('routines')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-colors ${activeView === 'routines' ? 'bg-primary text-white shadow' : 'text-slate-500'}`}>Attivi</button>
                <button onClick={() => setActiveView('templates')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-colors ${activeView === 'templates' ? 'bg-primary text-white shadow' : 'text-slate-500'}`}>Modelli</button>
            </div>

            {feedbackMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-emerald-400 text-[10px] font-black uppercase text-center mb-4 animate-in fade-in slide-in-from-top-2">
                {feedbackMsg}
              </div>
            )}

            <div className="space-y-4">
                {(activeView === 'routines' ? routines : templates).map(item => (
                    <div key={item.id} className="bg-surface p-5 rounded-3xl border border-slate-700 relative overflow-hidden shadow-lg group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/30"></div>
                        <div className="flex justify-between items-start mb-4 pl-2">
                            <div>
                              <h3 className="text-lg font-black text-white uppercase tracking-tight">{item.name}</h3>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">{item.days.length} Sessioni</p>
                            </div>
                            <div className="flex gap-2">
                                {activeView === 'routines' ? (
                                  <button 
                                    onClick={() => convertRoutineToTemplate(item as Routine)} 
                                    title="Copia come Modello"
                                    className="p-2 bg-slate-800 rounded-xl text-emerald-400 border border-slate-700 hover:bg-emerald-400/10 transition-colors"
                                  >
                                    <Copy size={18}/>
                                  </button>
                                ) : (
                                  <button 
                                    /* Fix: corretto il callback onClick per passare direttamente l'oggetto item */
                                    onClick={() => convertTemplateToRoutine(item as RoutineTemplate)} 
                                    title="Attiva come Routine"
                                    className="p-2 bg-slate-800 rounded-xl text-primary border border-slate-700 hover:bg-primary/10 transition-colors"
                                  >
                                    <Zap size={18}/>
                                  </button>
                                )}
                                
                                <button onClick={() => { setEditorData(JSON.parse(JSON.stringify(item))); setIsEditing(item.id); }} className="p-2 bg-slate-800 rounded-xl text-blue-400 border border-slate-700"><Edit2 size={18}/></button>
                                <button onClick={() => setItemToDelete({id: item.id, type: activeView === 'routines' ? 'routine' : 'template'})} className="p-2 bg-slate-800 rounded-xl text-red-500 border border-slate-700"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </>
      )}
      {showExerciseSelector && renderExerciseSelector()}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/90 z-[1300] flex items-center justify-center p-6 backdrop-blur-sm"><div className="bg-surface p-8 rounded-3xl w-full max-w-xs text-center border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6 uppercase">Eliminare?</h3>
            <div className="flex gap-3"><button onClick={() => setItemToDelete(null)} className="flex-1 py-4 text-slate-500 font-bold uppercase">No</button><button onClick={() => {
                if (itemToDelete.type === 'routine') { const u = routines.filter(r => r.id !== itemToDelete.id); saveRoutines(u); setRoutines(u); }
                else { const u = templates.filter(t => t.id !== itemToDelete.id); saveRoutineTemplates(u); setTemplates(u); }
                setItemToDelete(null);
            }} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black uppercase">Sì</button></div>
        </div></div>
      )}
    </div>
  );
};

export default RoutineManager;
