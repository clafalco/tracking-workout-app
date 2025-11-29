

import React, { useState, useEffect } from 'react';
import { Exercise, MuscleGroup, ExerciseType } from '../types';
import { getExercises, saveExercises, deleteExercise } from '../services/storageService';
import { MUSCLE_GROUP_COLORS } from '../constants';
import { Trash2, Plus, Edit2, Search, Filter, X, AlertTriangle, ExternalLink, StickyNote, Link as LinkIcon, Clock } from 'lucide-react';

const ExerciseManager: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>(''); 
  const [currentExercise, setCurrentExercise] = useState<Partial<Exercise>>({
    name: '',
    muscleGroup: MuscleGroup.Chest,
    type: ExerciseType.Weighted,
    notes: '',
    link: '',
    defaultRestSeconds: 60
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setExercises(getExercises());
  }, []);

  const handleSave = () => {
    if (!currentExercise.name) return;

    let updatedList: Exercise[];
    if (currentExercise.id) {
      updatedList = exercises.map(e => e.id === currentExercise.id ? currentExercise as Exercise : e);
    } else {
      const newExercise: Exercise = {
        ...currentExercise as Exercise,
        id: Date.now().toString()
      };
      updatedList = [...exercises, newExercise];
    }
    
    saveExercises(updatedList);
    setExercises(updatedList);
    setIsModalOpen(false);
    setCurrentExercise({ name: '', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted, notes: '', link: '', defaultRestSeconds: 60 });
  };

  const confirmDelete = () => {
    if (currentExercise.id) {
        const updatedList = deleteExercise(currentExercise.id);
        setExercises(updatedList);
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
    }
  };

  const openEdit = (ex: Exercise) => {
    setCurrentExercise(ex);
    setShowDeleteConfirm(false);
    setIsModalOpen(true);
  };

  const openNew = () => {
      setCurrentExercise({ name: '', muscleGroup: MuscleGroup.Chest, type: ExerciseType.Weighted, notes: '', link: '', defaultRestSeconds: 60 });
      setShowDeleteConfirm(false);
      setIsModalOpen(true);
  }

  const filteredExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterGroup ? e.muscleGroup === filterGroup : true;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Database Esercizi</h2>
        <button 
          onClick={openNew}
          className="bg-primary hover:bg-indigo-600 text-white p-2 rounded-full shadow-lg transition-colors"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
            type="text" 
            placeholder="Cerca per nome..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface text-white pl-10 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-slate-700"
            />
        </div>
        
        <div className="relative min-w-[150px]">
            <Filter className="absolute left-3 top-3 text-gray-400" size={20} />
            <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full bg-surface text-white pl-10 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-slate-700 appearance-none"
            >
                <option value="">Tutti</option>
                {Object.values(MuscleGroup).map(g => (
                    <option key={g} value={g}>{g}</option>
                ))}
            </select>
             <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredExercises.map(ex => (
          <button 
            key={ex.id} 
            onClick={() => openEdit(ex)}
            className="w-full bg-surface p-4 rounded-xl flex justify-between items-center shadow-sm border border-slate-700 hover:border-primary transition-colors text-left group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-3 h-12 rounded-full shrink-0 ${MUSCLE_GROUP_COLORS[ex.muscleGroup]}`}></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-white group-hover:text-primary transition-colors truncate">{ex.name}</h3>
                    {ex.notes && <StickyNote size={12} className="text-gray-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 truncate">
                     <span>{ex.muscleGroup} • {ex.type}</span>
                     {ex.defaultRestSeconds && <span className="flex items-center gap-0.5 bg-slate-800 px-1 rounded text-[10px]"><Clock size={10}/> {Math.floor(ex.defaultRestSeconds / 60)}:{(ex.defaultRestSeconds % 60).toString().padStart(2, '0')} Rest</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
                {ex.link && (
                    <a 
                        href={ex.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                    >
                        <ExternalLink size={18} />
                    </a>
                )}
                <div className="p-2 text-gray-500 group-hover:text-white">
                  <Edit2 size={18} />
                </div>
            </div>
          </button>
        ))}
        {filteredExercises.length === 0 && (
          <p className="text-center text-gray-500 mt-8">Nessun esercizio trovato.</p>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{showDeleteConfirm ? 'Elimina Esercizio' : (currentExercise.id ? 'Modifica Esercizio' : 'Nuovo Esercizio')}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400"><X size={20}/></button>
            </div>
            
            {showDeleteConfirm ? (
                 <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-200">
                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                        <p className="text-sm">Sei sicuro di voler eliminare <strong>{currentExercise.name}</strong>? L'azione è irreversibile.</p>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setShowDeleteConfirm(false)} 
                            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-slate-700"
                        >
                            Annulla
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-500/20"
                        >
                            Conferma Eliminazione
                        </button>
                    </div>
                 </div>
            ) : (
                <>
                    <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nome</label>
                        <input 
                        type="text" 
                        value={currentExercise.name} 
                        onChange={e => setCurrentExercise({...currentExercise, name: e.target.value})}
                        className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="Es. Panca Piana"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Gruppo</label>
                            <select 
                            value={currentExercise.muscleGroup}
                            onChange={e => setCurrentExercise({...currentExercise, muscleGroup: e.target.value as MuscleGroup})}
                            className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                            >
                            {Object.values(MuscleGroup).map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                            <select 
                            value={currentExercise.type}
                            onChange={e => setCurrentExercise({...currentExercise, type: e.target.value as ExerciseType})}
                            className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                            >
                            {Object.values(ExerciseType).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                            </select>
                        </div>
                    </div>

                    <div>
                         <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                            <Clock size={14}/> Recupero Default
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <span className="text-xs text-gray-500">Minuti</span>
                                <input 
                                    type="number" 
                                    value={currentExercise.defaultRestSeconds ? Math.floor(currentExercise.defaultRestSeconds / 60) : ''} 
                                    onChange={e => {
                                        const m = parseInt(e.target.value) || 0;
                                        const s = (currentExercise.defaultRestSeconds || 0) % 60;
                                        setCurrentExercise({...currentExercise, defaultRestSeconds: m * 60 + s});
                                    }}
                                    className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex-1">
                                <span className="text-xs text-gray-500">Secondi</span>
                                <input 
                                    type="number" 
                                    value={currentExercise.defaultRestSeconds ? (currentExercise.defaultRestSeconds % 60) : ''} 
                                    onChange={e => {
                                        const s = Math.min(59, parseInt(e.target.value) || 0);
                                        const m = Math.floor((currentExercise.defaultRestSeconds || 0) / 60);
                                        setCurrentExercise({...currentExercise, defaultRestSeconds: m * 60 + s});
                                    }}
                                    className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                            <LinkIcon size={14}/> Link Video/Tutorial (Opzionale)
                        </label>
                        <input 
                        type="url" 
                        value={currentExercise.link || ''} 
                        onChange={e => setCurrentExercise({...currentExercise, link: e.target.value})}
                        className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="https://youtube.com/..."
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                            <StickyNote size={14}/> Note (Opzionale)
                        </label>
                        <textarea 
                            value={currentExercise.notes || ''} 
                            onChange={e => setCurrentExercise({...currentExercise, notes: e.target.value})}
                            className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:outline-none focus:border-primary text-sm h-24 resize-none"
                            placeholder="Es. Impugnatura larga, altezza sellino 4..."
                        />
                    </div>

                    </div>

                    <div className="flex justify-between items-center mt-8">
                    {currentExercise.id ? (
                        <button 
                            onClick={() => setShowDeleteConfirm(true)} 
                            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/50 rounded-lg font-medium hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16}/> Elimina
                        </button>
                    ) : (
                        <div></div> // Spacer
                    )}
                    
                    <div className="flex gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-slate-700">Annulla</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary rounded-lg text-white font-semibold shadow-lg shadow-primary/20">Salva</button>
                    </div>
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseManager;