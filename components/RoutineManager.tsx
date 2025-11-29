
import React, { useState, useEffect } from 'react';
import { Routine, RoutineDay, RoutineExercise, Exercise, MuscleGroup, ExerciseType, RoutineTemplate } from '../types';
import { getRoutines, saveRoutines, getExercises, saveExercises, getRoutineTemplates, saveRoutineTemplates } from '../services/storageService';
import { Plus, Trash2, ChevronDown, ChevronUp, Info, Wand2, Clock, Search, Filter, X, Save, ArrowLeft, GripVertical, ArrowUp, ArrowDown, AlertTriangle, BookTemplate, Copy, PlayCircle, Timer } from 'lucide-react';
import { suggestRoutineStructure } from '../services/geminiService';
import { MUSCLE_GROUP_COLORS } from '../constants';

const RoutineManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'routines' | 'templates'>('routines');
  
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  
  const [isEditing, setIsEditing] = useState<string | null>(null); // Routine ID being edited
  
  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'routine' | 'template'} | null>(null);
  
  // Editor State
  // We use a flexible type that covers both Routine and Template fields
  const [editorData, setEditorData] = useState<Partial<Routine> & Partial<RoutineTemplate>>({ name: '', days: [] });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Exercise Selector Modal State
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [selectorDayId, setSelectorDayId] = useState<string | null>(null);
  const [swappingRoutineExerciseId, setSwappingRoutineExerciseId] = useState<string | null>(null); // If null, we are adding new
  const [selectorSearchTerm, setSelectorSearchTerm] = useState('');
  const [selectorFilterGroup, setSelectorFilterGroup] = useState<string>('');

  // Quick Create Exercise State
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [newExerciseData, setNewExerciseData] = useState<Partial<Exercise>>({
      name: '',
      muscleGroup: MuscleGroup.Chest,
      type: ExerciseType.Weighted
  });

  // Drag and Drop State
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);

  useEffect(() => {
    setRoutines(getRoutines());
    setTemplates(getRoutineTemplates());
    setExercises(getExercises());
  }, []);

  // --- CRUD ACTIONS ---

  const saveCurrentWork = () => {
    if (!editorData.name || !editorData.days) return;

    // Check if we are creating a brand new entry
    const isNewEntry = editorData.id === 'new' || !editorData.id;
    const finalId = isNewEntry ? Date.now().toString() : editorData.id!;

    if (activeView === 'routines') {
        const newRoutine: Routine = {
            id: finalId,
            name: editorData.name,
            days: editorData.days,
            startDate: editorData.startDate || new Date().toISOString(),
            endDate: editorData.endDate
        };
        const updated = isNewEntry 
            ? [...routines, newRoutine]
            : routines.map(r => r.id === finalId ? newRoutine : r);
        saveRoutines(updated);
        setRoutines(updated);
    } else {
        const newTemplate: RoutineTemplate = {
            id: finalId,
            name: editorData.name,
            days: editorData.days
        };
        const updated = isNewEntry
            ? [...templates, newTemplate]
            : templates.map(t => t.id === finalId ? newTemplate : t);
        saveRoutineTemplates(updated);
        setTemplates(updated);
    }

    setIsEditing(null);
    setEditorData({ name: '', days: [] });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'routine') {
        const updated = routines.filter(r => r.id !== itemToDelete.id);
        saveRoutines(updated);
        setRoutines(updated);
    } else {
        const updated = templates.filter(t => t.id !== itemToDelete.id);
        saveRoutineTemplates(updated);
        setTemplates(updated);
    }
    setItemToDelete(null);
  };

  const startEditing = (item: Routine | RoutineTemplate) => {
      // Deep clone to prevent mutating
      setEditorData(JSON.parse(JSON.stringify(item)));
      setIsEditing(item.id);
  };

  const saveAsTemplate = (routine: Routine) => {
      const newTemplate: RoutineTemplate = {
          id: Date.now().toString(),
          name: `${routine.name} (Copia)`,
          days: JSON.parse(JSON.stringify(routine.days)) // Deep clone
      };
      const updated = [...templates, newTemplate];
      saveRoutineTemplates(updated);
      setTemplates(updated);
      setActiveView('templates');
      alert("Salvato nei Modelli!");
  };

  const useTemplate = (template: RoutineTemplate) => {
      // Create a new ACTIVE routine from template
      const newRoutine: Routine = {
          id: Date.now().toString(),
          name: template.name,
          days: JSON.parse(JSON.stringify(template.days)),
          startDate: new Date().toISOString()
      };
      const updated = [...routines, newRoutine];
      saveRoutines(updated);
      setRoutines(updated);
      setActiveView('routines');
      // Optional: Open editor for the new routine immediately
      startEditing(newRoutine);
  };

  // --- EDITOR LOGIC ---

  const addDay = () => {
    const newDay: RoutineDay = {
        id: Date.now().toString(),
        name: `Giorno ${editorData.days?.length ? editorData.days.length + 1 : 1}`,
        exercises: []
    };
    setEditorData({ ...editorData, days: [...(editorData.days || []), newDay] });
  };

  // Reordering Logic
  const moveDay = (index: number, direction: 'up' | 'down') => {
    if (!editorData.days) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === editorData.days.length - 1) return;

    const newDays = [...editorData.days];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newDays[index], newDays[targetIndex]] = [newDays[targetIndex], newDays[index]];
    
    setEditorData({ ...editorData, days: newDays });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedDayIndex(index);
    e.dataTransfer.effectAllowed = 'move'; 
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); 
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDayIndex === null || !editorData.days) return;

    const newDays = [...editorData.days];
    const [movedDay] = newDays.splice(draggedDayIndex, 1);
    newDays.splice(targetIndex, 0, movedDay);

    setEditorData({ ...editorData, days: newDays });
    setDraggedDayIndex(null);
  };

  const openExerciseSelector = (dayId: string, routineExerciseId: string | null = null) => {
      setSelectorDayId(dayId);
      setSwappingRoutineExerciseId(routineExerciseId);
      setSelectorSearchTerm('');
      setSelectorFilterGroup('');
      setIsCreatingExercise(false); // Reset view
      setShowExerciseSelector(true);
  };

  const handleExerciseSelect = (exerciseId: string) => {
      if (!selectorDayId) return;
      
      const selectedExDb = exercises.find(e => e.id === exerciseId);
      const defaultRest = selectedExDb?.defaultRestSeconds || 60;

      // Use mapping to safely update the day
      const updatedDays = editorData.days!.map(day => {
        if (day.id !== selectorDayId) return day;

        // Clone exercises array
        const newExercises = [...day.exercises];

        if (swappingRoutineExerciseId) {
             // Modifying existing exercise
             const exIndex = newExercises.findIndex(e => e.id === swappingRoutineExerciseId);
             if (exIndex !== -1) {
                 newExercises[exIndex] = { ...newExercises[exIndex], exerciseId: exerciseId, targetRestSeconds: defaultRest };
             }
        } else {
             // Adding new exercise
             const newExercise: RoutineExercise = {
                id: Date.now().toString(),
                exerciseId: exerciseId,
                targetSets: 0,
                targetReps: '',
                targetWeight: '',
                targetRestSeconds: defaultRest,
                isSuperset: false
            };
            newExercises.push(newExercise);
        }
        return { ...day, exercises: newExercises };
      });

      setEditorData({...editorData, days: updatedDays});
      setShowExerciseSelector(false);
  };

  const handleQuickCreateExercise = () => {
      if (!newExerciseData.name) return;

      const newEx: Exercise = {
          id: Date.now().toString(),
          name: newExerciseData.name,
          muscleGroup: newExerciseData.muscleGroup as MuscleGroup,
          type: newExerciseData.type as ExerciseType,
          notes: '',
          defaultRestSeconds: 60
      };

      const updatedList = [...exercises, newEx];
      saveExercises(updatedList);
      setExercises(updatedList);
      
      // Immediately select the new exercise
      handleExerciseSelect(newEx.id);
  };

  const startCreatingExercise = () => {
      setNewExerciseData({
          name: selectorSearchTerm, // Prefill with search term
          muscleGroup: MuscleGroup.Chest,
          type: ExerciseType.Weighted
      });
      setIsCreatingExercise(true);
  }

  const updateDayExercise = (dayId: string, exId: string, field: keyof RoutineExercise, value: any) => {
      const updatedDays = [...editorData.days!];
      const day = updatedDays.find(d => d.id === dayId);
      const exercise = day?.exercises.find(e => e.id === exId);
      if (exercise) {
          (exercise as any)[field] = value;
          setEditorData({...editorData, days: updatedDays});
      }
  };
  
  const removeDayExercise = (dayId: string, exId: string) => {
       const updatedDays = [...editorData.days!];
       const day = updatedDays.find(d => d.id === dayId);
       if (day) {
           day.exercises = day.exercises.filter(e => e.id !== exId);
           setEditorData({...editorData, days: updatedDays});
       }
  };

  const handleAIHelp = async () => {
      setAiLoading(true);
      const suggestion = await suggestRoutineStructure(aiPrompt, 3);
      setAiLoading(false);
      setShowAiModal(false);
      alert("Suggerimento AI:\n\n" + suggestion + "\n\nUsa queste idee per costruire la tua routine manualmente.");
  };

  const filteredSelectorExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(selectorSearchTerm.toLowerCase()) ||
                          e.muscleGroup.toLowerCase().includes(selectorSearchTerm.toLowerCase());
    const matchesFilter = selectorFilterGroup ? e.muscleGroup === selectorFilterGroup : true;
    return matchesSearch && matchesFilter;
  });

  // --- RENDER ---

  if (isEditing !== null || editorData.id === 'new') {
      return (
          <div className="p-4 pb-48">
              <button onClick={() => {setIsEditing(null); setEditorData({name: '', days: []})}} className="text-gray-400 mb-4 text-sm flex items-center gap-1">
                <ArrowLeft size={16}/> Torna alla lista
              </button>
              
              <h2 className="text-2xl font-bold mb-4">
                  {editorData.id === 'new' ? (activeView === 'routines' ? 'Nuova Routine' : 'Nuovo Modello') : (activeView === 'routines' ? 'Modifica Routine' : 'Modifica Modello')}
              </h2>
              
              <div className="space-y-4 mb-6">
                  <input 
                    className="w-full bg-surface p-3 rounded-xl text-white border border-slate-700" 
                    placeholder={activeView === 'routines' ? "Nome Routine (es. Massa Invernale)" : "Nome Modello (es. PPL 4 giorni)"}
                    value={editorData.name}
                    onChange={e => setEditorData({...editorData, name: e.target.value})}
                  />
                  
                  {/* Show Dates only for Active Routines */}
                  {activeView === 'routines' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400">Data Inizio</label>
                            <input type="date" 
                                className="w-full bg-surface p-3 rounded-xl text-white border border-slate-700" 
                                value={editorData.startDate ? editorData.startDate.split('T')[0] : ''}
                                onChange={e => setEditorData({...editorData, startDate: new Date(e.target.value).toISOString()})}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400">Data Fine (Opzionale)</label>
                            <input type="date" 
                                className="w-full bg-surface p-3 rounded-xl text-white border border-slate-700" 
                                value={editorData.endDate ? editorData.endDate.split('T')[0] : ''}
                                onChange={e => setEditorData({...editorData, endDate: new Date(e.target.value).toISOString()})}
                            />
                        </div>
                    </div>
                  )}
              </div>

              <div className="space-y-6">
                  {editorData.days?.map((day, dIndex) => (
                      <div 
                        key={day.id} 
                        className={`bg-surface p-4 rounded-xl border transition-all duration-200 ${draggedDayIndex === dIndex ? 'border-primary border-dashed opacity-50' : 'border-slate-700'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, dIndex)}
                        onDragOver={(e) => handleDragOver(e, dIndex)}
                        onDrop={(e) => handleDrop(e, dIndex)}
                      >
                          <div className="flex justify-between items-center mb-3 gap-2">
                              {/* Drag Handle and Reordering Controls */}
                              <div className="flex items-center gap-1 text-gray-500 shrink-0">
                                <div className="cursor-move p-1 hover:text-white" title="Trascina per spostare">
                                    <GripVertical size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <button 
                                        onClick={() => moveDay(dIndex, 'up')} 
                                        className={`hover:text-primary ${dIndex === 0 ? 'opacity-30 pointer-events-none' : ''}`}
                                    >
                                        <ArrowUp size={14} />
                                    </button>
                                    <button 
                                        onClick={() => moveDay(dIndex, 'down')} 
                                        className={`hover:text-primary ${dIndex === (editorData.days?.length || 0) - 1 ? 'opacity-30 pointer-events-none' : ''}`}
                                    >
                                        <ArrowDown size={14} />
                                    </button>
                                </div>
                              </div>

                              <input 
                                className="flex-1 min-w-0 bg-transparent font-bold text-lg border-b border-slate-600 focus:border-primary focus:outline-none mx-2"
                                value={day.name}
                                onChange={e => {
                                    const ups = [...editorData.days!];
                                    ups[dIndex].name = e.target.value;
                                    setEditorData({...editorData, days: ups});
                                }}
                              />

                              {/* Quick Add Exercise Button in Header */}
                              <button 
                                onClick={() => openExerciseSelector(day.id)}
                                className="bg-primary/20 text-primary p-2 rounded-full hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                title="Aggiungi Esercizio"
                              >
                                  <span className="text-xs font-bold md:hidden">+</span>
                                  <Plus size={18} />
                              </button>
                              
                              <button onClick={() => {
                                  const ups = editorData.days!.filter(d => d.id !== day.id);
                                  setEditorData({...editorData, days: ups});
                              }} className="text-red-400 p-2 hover:bg-slate-700 rounded-full shrink-0"><Trash2 size={16}/></button>
                          </div>

                          <div className="space-y-2 pl-2 border-l-2 border-slate-700 ml-3">
                              {day.exercises.length === 0 && (
                                  <div className="text-xs text-gray-500 italic mb-2">Nessun esercizio. Aggiungine uno!</div>
                              )}
                              {day.exercises.map((rex, exIndex) => {
                                  const dbEx = exercises.find(e => e.id === rex.exerciseId);
                                  const isDuration = dbEx?.type === ExerciseType.Duration;

                                  return (
                                  <div key={rex.id} className="p-3 rounded-lg bg-dark border border-slate-800">
                                      <div className={`flex flex-col gap-2 ${rex.isSuperset ? 'border-l-4 border-l-yellow-500 pl-2' : ''}`}>
                                          <button 
                                              onClick={() => openExerciseSelector(day.id, rex.id)}
                                              className="bg-slate-800 p-2 rounded text-sm w-full text-left flex items-center justify-between hover:bg-slate-700 transition-colors border border-slate-700"
                                          >
                                              <span className="truncate font-medium text-white">
                                                  {dbEx?.name || "Seleziona Esercizio..."}
                                              </span>
                                              <Search size={14} className="text-slate-500 ml-2 shrink-0"/>
                                          </button>

                                          <div className="flex flex-wrap gap-2 items-center">
                                              <input 
                                                placeholder="Sets" 
                                                type="number" 
                                                className="w-14 bg-slate-800 p-1 rounded text-center text-sm focus:ring-1 focus:ring-primary outline-none" 
                                                value={rex.targetSets === 0 ? '' : rex.targetSets} 
                                                onChange={(e) => updateDayExercise(day.id, rex.id, 'targetSets', parseInt(e.target.value) || 0)} 
                                              />
                                              <span className="text-xs text-gray-500">x</span>
                                              
                                              {/* CONDITIONAL INPUT: TIME OR REPS */}
                                              {isDuration ? (
                                                  <div className="flex items-center gap-1 bg-slate-800 rounded p-1 px-2 border border-slate-700">
                                                      <Timer size={12} className="text-gray-400"/>
                                                      <input 
                                                          placeholder="M" 
                                                          type="number" 
                                                          className="w-9 bg-transparent text-center text-sm outline-none border-b border-transparent focus:border-primary appearance-none m-0 p-0" 
                                                          value={rex.targetReps ? Math.floor(parseInt(rex.targetReps) / 60) : ''} 
                                                          onChange={(e) => {
                                                              const m = parseInt(e.target.value) || 0;
                                                              const currentSeconds = parseInt(rex.targetReps || '0');
                                                              const s = currentSeconds % 60;
                                                              updateDayExercise(day.id, rex.id, 'targetReps', (m * 60 + s).toString());
                                                          }} 
                                                          style={{ MozAppearance: 'textfield' }}
                                                      />
                                                      <span className="text-xs text-gray-500">:</span>
                                                      <input 
                                                          placeholder="S" 
                                                          type="number" 
                                                          className="w-9 bg-transparent text-center text-sm outline-none border-b border-transparent focus:border-primary appearance-none m-0 p-0" 
                                                          value={rex.targetReps ? parseInt(rex.targetReps) % 60 : ''} 
                                                          onChange={(e) => {
                                                              const s = Math.min(59, parseInt(e.target.value) || 0);
                                                              const currentSeconds = parseInt(rex.targetReps || '0');
                                                              const m = Math.floor(currentSeconds / 60);
                                                              updateDayExercise(day.id, rex.id, 'targetReps', (m * 60 + s).toString());
                                                          }} 
                                                          style={{ MozAppearance: 'textfield' }}
                                                      />
                                                  </div>
                                              ) : (
                                                  <input 
                                                    placeholder="Reps" 
                                                    className="w-16 bg-slate-800 p-1 rounded text-center text-sm focus:ring-1 focus:ring-primary outline-none" 
                                                    value={rex.targetReps} 
                                                    onChange={(e) => updateDayExercise(day.id, rex.id, 'targetReps', e.target.value)} 
                                                  />
                                              )}

                                              <span className="text-xs text-gray-500">@</span>
                                              <input placeholder="Kg" className="w-16 bg-slate-800 p-1 rounded text-center text-sm focus:ring-1 focus:ring-primary outline-none" value={rex.targetWeight || ''} onChange={(e) => updateDayExercise(day.id, rex.id, 'targetWeight', e.target.value)} />
                                              
                                              <div className="flex items-center gap-1 bg-slate-800 rounded p-1 px-2">
                                                <Clock size={12} className="text-gray-400"/>
                                                {/* Split Min/Sec Input for better UX */}
                                                <input 
                                                    placeholder="M" 
                                                    type="number" 
                                                    className="w-9 bg-transparent text-center text-sm outline-none border-b border-transparent focus:border-primary appearance-none m-0 p-0" 
                                                    value={rex.targetRestSeconds ? Math.floor(rex.targetRestSeconds / 60) : ''} 
                                                    onChange={(e) => {
                                                        const m = parseInt(e.target.value) || 0;
                                                        const s = (rex.targetRestSeconds || 0) % 60;
                                                        updateDayExercise(day.id, rex.id, 'targetRestSeconds', m * 60 + s);
                                                    }} 
                                                    style={{ MozAppearance: 'textfield' }}
                                                />
                                                <span className="text-xs">:</span>
                                                <input 
                                                    placeholder="S" 
                                                    type="number" 
                                                    className="w-9 bg-transparent text-center text-sm outline-none border-b border-transparent focus:border-primary appearance-none m-0 p-0" 
                                                    value={rex.targetRestSeconds ? (rex.targetRestSeconds % 60).toString().padStart(2, '0') : ''} 
                                                    onChange={(e) => {
                                                        const s = Math.min(59, parseInt(e.target.value) || 0);
                                                        const m = Math.floor((rex.targetRestSeconds || 0) / 60);
                                                        updateDayExercise(day.id, rex.id, 'targetRestSeconds', m * 60 + s);
                                                    }} 
                                                    style={{ MozAppearance: 'textfield' }}
                                                />
                                              </div>

                                              <label className="flex items-center gap-1 ml-auto text-xs text-gray-400 cursor-pointer select-none">
                                                  <input type="checkbox" checked={rex.isSuperset} onChange={(e) => updateDayExercise(day.id, rex.id, 'isSuperset', e.target.checked)} />
                                                  Superset
                                              </label>
                                              <button onClick={() => removeDayExercise(day.id, rex.id)} className="text-red-500 ml-2"><Trash2 size={14}/></button>
                                          </div>
                                      </div>
                                  </div>
                              )})}
                              
                              <button 
                                onClick={() => openExerciseSelector(day.id)} 
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 font-medium"
                              >
                                <Plus size={16} /> Aggiungi Esercizio
                              </button>
                          </div>
                      </div>
                  ))}
                  <button onClick={addDay} className="w-full bg-slate-700 py-3 rounded-xl text-white font-semibold hover:bg-slate-600">Aggiungi Giorno</button>
              </div>

              <div className="fixed bottom-[60px] left-0 right-0 p-4 pb-6 bg-dark/95 border-t border-slate-800 flex gap-4 md:max-w-md md:mx-auto z-30 backdrop-blur-sm">
                  <button onClick={saveCurrentWork} className="flex-1 bg-primary py-3 rounded-xl font-bold shadow-lg shadow-primary/20 text-white flex items-center justify-center gap-2">
                    <Save size={20}/> Salva {activeView === 'routines' ? 'Routine' : 'Modello'}
                  </button>
              </div>

                {/* Exercise Selector Modal */}
                {showExerciseSelector && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-surface p-4 rounded-2xl w-full max-w-md border border-slate-700 flex flex-col max-h-[80vh]">
                            
                            {!isCreatingExercise ? (
                                // SELECT VIEW
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-white">Seleziona Esercizio</h3>
                                        <button onClick={() => setShowExerciseSelector(false)} className="text-gray-400"><X size={20}/></button>
                                    </div>

                                    {/* Search and Filter */}
                                    <div className="flex gap-2 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Cerca..." 
                                                value={selectorSearchTerm}
                                                onChange={(e) => setSelectorSearchTerm(e.target.value)}
                                                className="w-full bg-dark text-white pl-9 p-2 rounded-lg text-sm focus:outline-none border border-slate-600"
                                            />
                                        </div>
                                        <div className="relative w-1/3">
                                            <Filter className="absolute left-2 top-3 text-gray-400" size={14} />
                                            <select
                                                value={selectorFilterGroup}
                                                onChange={(e) => setSelectorFilterGroup(e.target.value)}
                                                className="w-full bg-dark text-white pl-7 p-2 rounded-lg text-xs focus:outline-none border border-slate-600 appearance-none h-full"
                                            >
                                                <option value="">Tutti</option>
                                                {Object.values(MuscleGroup).map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="overflow-y-auto flex-1 space-y-2 pr-1 mb-2">
                                        {filteredSelectorExercises.map(ex => (
                                            <button 
                                                key={ex.id}
                                                onClick={() => handleExerciseSelect(ex.id)}
                                                className="w-full bg-dark p-3 rounded-lg flex justify-between items-center border border-slate-800 hover:border-primary hover:bg-slate-800 transition-all"
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className={`w-2 h-8 rounded-full ${MUSCLE_GROUP_COLORS[ex.muscleGroup]}`}></div>
                                                    <div>
                                                        <div className="font-semibold text-sm text-white">{ex.name}</div>
                                                        <div className="text-xs text-gray-500">{ex.muscleGroup} • {ex.type}</div>
                                                    </div>
                                                </div>
                                                {swappingRoutineExerciseId && editorData.days?.find(d => d.id === selectorDayId)?.exercises.find(e => e.id === swappingRoutineExerciseId)?.exerciseId === ex.id && (
                                                    <div className="text-primary text-xs font-bold">Attuale</div>
                                                )}
                                            </button>
                                        ))}
                                        {filteredSelectorExercises.length === 0 && (
                                            <div className="text-center text-gray-500 text-sm py-4">Nessun esercizio trovato.</div>
                                        )}
                                    </div>
                                    
                                    {/* Create New Button */}
                                    <button 
                                        onClick={startCreatingExercise}
                                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Plus size={18} /> Crea Nuovo Esercizio
                                    </button>
                                </>
                            ) : (
                                // QUICK CREATE VIEW
                                <>
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                                        <button onClick={() => setIsCreatingExercise(false)} className="text-gray-400 hover:text-white">
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h3 className="text-lg font-bold text-white">Crea Esercizio</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Nome</label>
                                            <input 
                                                type="text" 
                                                value={newExerciseData.name} 
                                                onChange={e => setNewExerciseData({...newExerciseData, name: e.target.value})}
                                                className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                                                placeholder="Es. Panca Inclinata"
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
                                    </div>

                                    <div className="mt-auto pt-6">
                                        <button 
                                            onClick={handleQuickCreateExercise} 
                                            className="w-full bg-primary py-3 rounded-xl text-white font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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
      )
  }

  // --- LIST VIEW ---

  return (
    <div className="p-4 pb-24">
      {/* HEADER & TABS */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Gestione Routine</h2>
        <div className="flex gap-2">
            <button onClick={() => setShowAiModal(true)} className="bg-surface p-2 rounded-full text-purple-400 border border-purple-500/30"><Wand2 size={20}/></button>
            <button 
                onClick={() => { setEditorData({ id: 'new', days: [] }); setIsEditing('new'); }}
                className="bg-primary text-white p-2 rounded-full shadow-lg"
            >
                <Plus size={24} />
            </button>
        </div>
      </div>

      <div className="flex p-1 bg-surface rounded-xl border border-slate-700 mb-6">
          <button 
            onClick={() => setActiveView('routines')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'routines' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
              Attive
          </button>
          <button 
            onClick={() => setActiveView('templates')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'templates' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
              Modelli
          </button>
      </div>

      <div className="space-y-4">
        {activeView === 'routines' ? (
            // --- ROUTINES LIST ---
            routines.length > 0 ? routines.map(routine => (
            <div key={routine.id} className="bg-surface p-5 rounded-xl border border-slate-700 shadow-md">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white">{routine.name}</h3>
                        <p className="text-xs text-gray-400">
                            {new Date(routine.startDate).toLocaleDateString()} 
                            {routine.endDate ? ` - ${new Date(routine.endDate).toLocaleDateString()}` : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => saveAsTemplate(routine)} 
                            className="text-emerald-400 hover:bg-emerald-500/10 p-2 rounded-full transition-colors" 
                            title="Salva come Modello"
                        >
                            <Copy size={18}/>
                        </button>
                        <button onClick={() => startEditing(routine)} className="text-blue-400 hover:bg-blue-500/10 p-2 rounded-full transition-colors"><Edit2Icon size={18}/></button>
                        <button onClick={() => setItemToDelete({id: routine.id, type: 'routine'})} className="text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-colors"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {routine.days.map(d => (
                        <span key={d.id} className="bg-slate-700 text-xs px-2 py-1 rounded text-gray-300">{d.name}</span>
                    ))}
                </div>
            </div>
            )) : <div className="text-center text-gray-500 mt-10">Nessuna routine attiva. Creane una o usa un modello!</div>
        ) : (
            // --- TEMPLATES LIST ---
            templates.length > 0 ? templates.map(template => (
            <div key={template.id} className="bg-surface p-5 rounded-xl border border-slate-700 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                    <div className="flex items-center gap-2">
                        <BookTemplate size={20} className="text-purple-400"/>
                        <h3 className="text-xl font-bold text-white">{template.name}</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => startEditing(template)} className="text-blue-400 hover:bg-blue-500/10 p-2 rounded-full transition-colors"><Edit2Icon size={18}/></button>
                        <button onClick={() => setItemToDelete({id: template.id, type: 'template'})} className="text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-colors"><Trash2 size={18}/></button>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 pl-2 mb-4">
                    {template.days.map(d => (
                        <span key={d.id} className="bg-slate-700 text-xs px-2 py-1 rounded text-gray-300">{d.name}</span>
                    ))}
                </div>
                <button 
                    onClick={() => useTemplate(template)} 
                    className="w-full bg-slate-700 hover:bg-primary text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <PlayCircle size={18} /> Usa Modello
                </button>
            </div>
            )) : <div className="text-center text-gray-500 mt-10">Nessun modello salvato. Salva una routine come modello per trovarla qui.</div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-surface p-6 rounded-2xl w-full max-w-sm border border-slate-700">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-200 mb-6">
                    <AlertTriangle className="text-red-500 shrink-0" size={24} />
                    <div>
                        <p className="font-bold text-red-400">Elimina {itemToDelete.type === 'routine' ? 'Routine' : 'Modello'}</p>
                        <p className="text-sm">L'azione è irreversibile.</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setItemToDelete(null)} 
                        className="px-4 py-2 rounded-lg text-gray-300 hover:bg-slate-700"
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

      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-slate-700">
              <h3 className="text-lg font-bold mb-2 text-purple-400">AI Routine Builder</h3>
              <p className="text-sm text-gray-400 mb-4">Descrivi il tuo obiettivo (es. "Voglio aumentare la forza nelle gambe") e l'AI ti suggerirà una struttura.</p>
              <textarea 
                className="w-full bg-dark border border-slate-600 rounded p-2 text-white h-24"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Il tuo obiettivo..."
              />
              <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setShowAiModal(false)} className="text-gray-400">Chiudi</button>
                  <button onClick={handleAIHelp} disabled={aiLoading} className="bg-purple-600 px-4 py-2 rounded text-white disabled:opacity-50">
                      {aiLoading ? 'Generando...' : 'Genera Idee'}
                  </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Icon component helper
const Edit2Icon = ({size}: {size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

export default RoutineManager;
