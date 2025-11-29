
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BodyMeasurement } from '../types';
import { getMeasurements, saveMeasurements, deleteMeasurement } from '../services/storageService';
import { Plus, Trash2, Calendar, Scale, Ruler, Edit2, X, AlertTriangle } from 'lucide-react';

// Configuration for all available metrics to chart
const METRICS = [
  { key: 'weight' as keyof BodyMeasurement, label: 'Peso (Kg)', color: '#6366f1' },
  { key: 'bodyFat' as keyof BodyMeasurement, label: 'Massa Grassa (%)', color: '#10b981' },
  { key: 'chest' as keyof BodyMeasurement, label: 'Petto (cm)', color: '#f59e0b' },
  { key: 'waist' as keyof BodyMeasurement, label: 'Vita (cm)', color: '#ec4899' },
  { key: 'arms' as keyof BodyMeasurement, label: 'Braccia (cm)', color: '#8b5cf6' },
  { key: 'legs' as keyof BodyMeasurement, label: 'Gambe (cm)', color: '#3b82f6' },
];

const BodyMeasurements: React.FC = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<BodyMeasurement>>({
    weight: 0,
    bodyFat: 0,
    chest: 0,
    waist: 0,
    arms: 0,
    legs: 0,
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const data = getMeasurements().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setMeasurements(data);
  }, []);

  const openNew = () => {
      setEditingId(null);
      setShowDeleteConfirm(false);
      setNewEntry({
        weight: 0,
        bodyFat: 0,
        chest: 0,
        waist: 0,
        arms: 0,
        legs: 0,
        date: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(true);
  }

  const openEdit = (m: BodyMeasurement) => {
      setEditingId(m.id);
      setShowDeleteConfirm(false);
      setNewEntry({
          ...m,
          date: new Date(m.date).toISOString().split('T')[0]
      });
      setIsModalOpen(true);
  }

  const handleSave = () => {
    if (!newEntry.weight || !newEntry.date) return;

    const entryData: BodyMeasurement = {
      id: editingId || Date.now().toString(),
      date: new Date(newEntry.date!).toISOString(),
      weight: Number(newEntry.weight),
      bodyFat: newEntry.bodyFat ? Number(newEntry.bodyFat) : undefined,
      chest: newEntry.chest ? Number(newEntry.chest) : undefined,
      waist: newEntry.waist ? Number(newEntry.waist) : undefined,
      arms: newEntry.arms ? Number(newEntry.arms) : undefined,
      legs: newEntry.legs ? Number(newEntry.legs) : undefined,
    };

    let updated: BodyMeasurement[];
    
    if (editingId) {
        // Update existing
        updated = measurements.map(m => m.id === editingId ? entryData : m);
    } else {
        // Add new
        updated = [...measurements, entryData];
    }
    
    updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    saveMeasurements(updated);
    setMeasurements(updated);
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (editingId) {
        const updatedList = deleteMeasurement(editingId);
        const sorted = [...updatedList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMeasurements(sorted);
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
    }
  };

  // Prepare Chart Data (Formatted Date)
  const chartData = measurements.map(m => ({
    ...m,
    formattedDate: new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
  }));

  // Helper to check if a metric has any data points
  const hasDataForMetric = (key: keyof BodyMeasurement) => {
    return measurements.some(m => m[key] !== undefined && m[key] !== 0);
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Misure Corporee</h2>
        <button 
          onClick={openNew}
          className="bg-primary hover:bg-indigo-600 text-white p-2 rounded-full shadow-lg transition-colors shrink-0"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Dynamic Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {METRICS.map(metric => {
          if (!hasDataForMetric(metric.key)) return null;

          return (
            <div key={metric.key} className="bg-surface p-4 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">{metric.label}</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="formattedDate" stroke="#94a3b8" tick={{fontSize: 10}} />
                    <YAxis stroke="#94a3b8" domain={['dataMin - 1', 'dataMax + 1']} tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}}
                      itemStyle={{color: '#fff'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={metric.key} 
                      stroke={metric.color} 
                      strokeWidth={3} 
                      dot={{fill: metric.color}} 
                      activeDot={{r: 6}} 
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {[...measurements].reverse().map(m => (
          <button 
            key={m.id} 
            onClick={() => openEdit(m)}
            className="w-full bg-surface p-4 rounded-xl border border-slate-700 flex justify-between items-center relative group hover:border-primary transition-colors text-left"
          >
            <div>
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Calendar size={12}/> {new Date(m.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                    <Scale size={16} className="text-primary"/>
                    <span className="text-xl font-bold text-white">{m.weight}</span>
                    <span className="text-xs text-gray-400">kg</span>
                </div>
                {m.bodyFat && (
                    <div className="flex items-center gap-1 text-emerald-400">
                        <span className="text-lg font-bold">{m.bodyFat}</span>
                        <span className="text-xs">% Fat</span>
                    </div>
                )}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                  {m.waist && <span>Vita: {m.waist}cm</span>}
                  {m.chest && <span>Petto: {m.chest}cm</span>}
                  {m.arms && <span>Braccia: {m.arms}cm</span>}
                  {m.legs && <span>Gambe: {m.legs}cm</span>}
              </div>
            </div>
            <div className="p-2 text-gray-500 group-hover:text-white">
                <Edit2 size={18} />
            </div>
          </button>
        ))}
        {measurements.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <Scale size={48} className="mx-auto mb-4 opacity-20"/>
            <p>Nessuna misurazione registrata.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-2xl w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{showDeleteConfirm ? 'Elimina Misurazione' : (editingId ? 'Modifica Misurazione' : 'Nuova Misurazione')}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400"><X size={20}/></button>
            </div>
            
            {showDeleteConfirm ? (
                 <div className="space-y-6">
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-200">
                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                        <p className="text-sm">Sei sicuro di voler eliminare questa misurazione del <strong>{new Date(newEntry.date!).toLocaleDateString()}</strong>? L'azione è irreversibile.</p>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button 
                            onClick={() => setShowDeleteConfirm(false)} 
                            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-slate-700"
                        >
                            Annulla
                        </button>
                        <button 
                            onClick={handleDelete} 
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
                        <label className="block text-xs text-gray-400 mb-1">Data</label>
                        <input 
                        type="date" 
                        value={newEntry.date} 
                        onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                        className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Peso (Kg)</label>
                            <input 
                            type="number" 
                            value={newEntry.weight || ''} 
                            onChange={e => setNewEntry({...newEntry, weight: parseFloat(e.target.value)})}
                            className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:border-primary outline-none"
                            placeholder="0.0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Massa Grassa (%)</label>
                            <input 
                            type="number" 
                            value={newEntry.bodyFat || ''} 
                            onChange={e => setNewEntry({...newEntry, bodyFat: parseFloat(e.target.value)})}
                            className="w-full bg-dark border border-slate-600 p-3 rounded-lg text-white focus:border-primary outline-none"
                            placeholder="Opzionale"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700">
                        <div className="flex items-center gap-2 text-gray-400 mb-3">
                            <Ruler size={16}/> <span className="text-sm">Circonferenze (cm)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Vita</label>
                                <input 
                                type="number" 
                                value={newEntry.waist || ''} 
                                onChange={e => setNewEntry({...newEntry, waist: parseFloat(e.target.value)})}
                                className="w-full bg-dark border border-slate-600 p-2 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Petto</label>
                                <input 
                                type="number" 
                                value={newEntry.chest || ''} 
                                onChange={e => setNewEntry({...newEntry, chest: parseFloat(e.target.value)})}
                                className="w-full bg-dark border border-slate-600 p-2 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Braccia</label>
                                <input 
                                type="number" 
                                value={newEntry.arms || ''} 
                                onChange={e => setNewEntry({...newEntry, arms: parseFloat(e.target.value)})}
                                className="w-full bg-dark border border-slate-600 p-2 rounded-lg text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Gambe</label>
                                <input 
                                type="number" 
                                value={newEntry.legs || ''} 
                                onChange={e => setNewEntry({...newEntry, legs: parseFloat(e.target.value)})}
                                className="w-full bg-dark border border-slate-600 p-2 rounded-lg text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="flex justify-between items-center mt-8">
                    {editingId ? (
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
                        <button onClick={handleSave} className="px-4 py-2 bg-primary rounded-lg text-white font-semibold shadow-lg shadow-primary/20">
                            {editingId ? 'Salva Modifiche' : 'Aggiungi'}
                        </button>
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

export default BodyMeasurements;
