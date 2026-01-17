
import React, { useState, useEffect } from 'react';
import { BodyMeasurement, UserProfile, CustomMetricConfig } from '../types';
import { getMeasurements, saveMeasurements, deleteMeasurement, getProfile, getCustomMetricConfigs, saveCustomMetricConfigs } from '../services/storageService';
import { Plus, Trash2, Edit2, X, Settings2, Ruler, LayoutGrid, ChevronDown, ChevronUp, PlusCircle, Scale, Percent } from 'lucide-react';

const BodyMeasurements: React.FC = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [customConfigs, setCustomConfigs] = useState<CustomMetricConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newEntry, setNewEntry] = useState<Partial<BodyMeasurement>>({
    weight: 0, 
    bodyFat: 0, 
    waist: 0, 
    neck: 0, 
    hips: 0,
    customValues: {}, 
    date: new Date().toISOString().split('T')[0]
  });

  const [newConfig, setNewConfig] = useState<Partial<CustomMetricConfig>>({ label: '', unit: 'cm' });

  useEffect(() => {
    const data = getMeasurements().sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
    setMeasurements(data);
    setCustomConfigs(getCustomMetricConfigs());
  }, []);

  const handleSaveEntry = () => {
    if (!newEntry.weight || !newEntry.date) return;
    const entryData: BodyMeasurement = {
      id: editingId || Date.now().toString(),
      date: new Date(newEntry.date!).toISOString(),
      weight: Number(newEntry.weight),
      bodyFat: newEntry.bodyFat ? Number(newEntry.bodyFat) : undefined,
      waist: newEntry.waist ? Number(newEntry.waist) : undefined,
      neck: newEntry.neck ? Number(newEntry.neck) : undefined,
      hips: newEntry.hips ? Number(newEntry.hips) : undefined,
      customValues: newEntry.customValues || {}
    };
    let updated = editingId ? measurements.map(m => m.id === editingId ? entryData : m) : [...measurements, entryData];
    updated.sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());
    saveMeasurements(updated);
    setMeasurements(updated);
    setIsModalOpen(false);
  };

  const handleAddConfig = () => {
      if (!newConfig.label) return;
      const config: CustomMetricConfig = {
          id: 'metric_' + Date.now(),
          label: newConfig.label,
          unit: newConfig.unit || 'cm'
      };
      const updated = [...customConfigs, config];
      setCustomConfigs(updated);
      saveCustomMetricConfigs(updated);
      setNewConfig({ label: '', unit: 'cm' });
  };

  const handleDeleteConfig = (id: string) => {
      if (window.confirm("Rimuovere questo parametro? I dati registrati non verranno eliminati ma non saranno più modificabili singolarmente.")) {
          const updated = customConfigs.filter(c => c.id !== id);
          setCustomConfigs(updated);
          saveCustomMetricConfigs(updated);
      }
  };

  const handleCustomValueChange = (configId: string, value: string) => {
      const val = value.replace(',', '.');
      const numericVal = val === '' ? 0 : parseFloat(val) || 0;
      setNewEntry({
          ...newEntry,
          customValues: {
              ...(newEntry.customValues || {}),
              [configId]: numericVal
          }
      });
  };

  const renderDecimalInput = (label: string, field: keyof BodyMeasurement | string, unit: string, isCustom = false) => (
    <div>
        <label className="block text-[10px] text-gray-500 uppercase font-black mb-1">{label} ({unit})</label>
        <input 
            type="text" 
            inputMode="decimal"
            value={
                isCustom 
                ? (newEntry.customValues?.[field as string] === 0 || newEntry.customValues?.[field as string] === undefined ? '' : newEntry.customValues[field as string].toString().replace('.', ','))
                : (newEntry[field as keyof BodyMeasurement] === 0 || newEntry[field as keyof BodyMeasurement] === undefined ? '' : (newEntry[field as keyof BodyMeasurement] as number).toString().replace('.', ','))
            } 
            onChange={e => {
                if (isCustom) {
                    handleCustomValueChange(field as string, e.target.value);
                } else {
                    const val = e.target.value.replace(',', '.');
                    const num = val === '' ? 0 : parseFloat(val) || 0;
                    setNewEntry({...newEntry, [field]: num});
                }
            }} 
            className="w-full bg-dark border border-slate-700 p-4 rounded-2xl text-white font-bold focus:border-primary outline-none transition-colors" 
        />
    </div>
  );

  return (
    <div className="p-4 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Misure Corporee</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="bg-slate-800 text-slate-400 p-3 rounded-2xl border border-slate-700 active:scale-95 transition-transform"
                title="Configura Parametri"
            >
                <Settings2 size={20}/>
            </button>
            <button 
                onClick={() => { 
                    setEditingId(null); 
                    setNewEntry({
                        weight: measurements.length > 0 ? measurements[measurements.length-1].weight : 0,
                        bodyFat: measurements.length > 0 ? measurements[measurements.length-1].bodyFat : 0,
                        waist: measurements.length > 0 ? measurements[measurements.length-1].waist : 0,
                        neck: measurements.length > 0 ? measurements[measurements.length-1].neck : 0,
                        hips: measurements.length > 0 ? measurements[measurements.length-1].hips : 0,
                        customValues: measurements.length > 0 ? { ...measurements[measurements.length-1].customValues } : {},
                        date: new Date().toISOString().split('T')[0]
                    });
                    setIsModalOpen(true); 
                }} 
                className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
                <Plus size={24}/>
            </button>
        </div>
      </div>

      <div className="space-y-4">
        {measurements.slice().reverse().map(m => (
            <div key={m.id} className="bg-surface p-6 rounded-[2.5rem] border border-slate-700/30 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20"></div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        <div className="flex gap-4 items-baseline">
                            <span className="text-3xl font-black text-white tabular-nums">{m.weight.toLocaleString('it-IT')} <span className="text-xs text-slate-500 font-normal">kg</span></span>
                            {m.bodyFat && (
                                <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{m.bodyFat}% BF</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingId(m.id); setNewEntry(m); setIsModalOpen(true); }} className="p-2.5 bg-slate-800 rounded-xl text-blue-400 border border-slate-700 active:scale-95 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></button>
                        <button onClick={() => { if(window.confirm("Eliminare la misura?")) { const u = deleteMeasurement(m.id); setMeasurements(u); } }} className="p-2.5 bg-slate-800 rounded-xl text-red-500 border border-slate-700 active:scale-95 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                    </div>
                </div>

                {/* Griglia parametri extra */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/30">
                    {m.waist && (
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Vita</span>
                            <span className="text-xs font-bold text-slate-300">{m.waist} cm</span>
                        </div>
                    )}
                    {m.neck && (
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Collo</span>
                            <span className="text-xs font-bold text-slate-300">{m.neck} cm</span>
                        </div>
                    )}
                    {m.hips && (
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Fianchi</span>
                            <span className="text-xs font-bold text-slate-300">{m.hips} cm</span>
                        </div>
                    )}
                    {Object.entries(m.customValues || {}).map(([cid, val]) => {
                        const config = customConfigs.find(c => c.id === cid);
                        if (!config || !val) return null;
                        return (
                            <div key={cid} className="flex flex-col">
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">{config.label}</span>
                                <span className="text-xs font-bold text-slate-300">{val} {config.unit}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
        
        {measurements.length === 0 && (
            <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-700">
                    <Ruler size={32} />
                </div>
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.2em]">Nessuna misura registrata</p>
            </div>
        )}
      </div>

      {/* MODALE INSERIMENTO MISURA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1100] p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 border border-slate-700 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase text-white tracking-tight">{editingId ? 'Modifica Log' : 'Nuovo Log Fisico'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 p-2"><X size={20}/></button>
            </div>
            
            <div className="space-y-5">
                <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-black mb-1 px-1">Data Registrazione</label>
                    <input type="date" value={newEntry.date?.split('T')[0]} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full bg-dark border border-slate-700 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {renderDecimalInput('Peso', 'weight', 'kg')}
                    {renderDecimalInput('Massa Grassa', 'bodyFat', '%')}
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Circonferenze Standard</p>
                    <div className="grid grid-cols-2 gap-4">
                        {renderDecimalInput('Vita', 'waist', 'cm')}
                        {renderDecimalInput('Collo', 'neck', 'cm')}
                        {renderDecimalInput('Fianchi', 'hips', 'cm')}
                    </div>
                </div>

                {customConfigs.length > 0 && (
                    <div className="pt-4 border-t border-slate-700/50">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Parametri Personalizzati</p>
                        <div className="grid grid-cols-2 gap-4">
                            {customConfigs.map(config => (
                                <React.Fragment key={config.id}>
                                    {renderDecimalInput(config.label, config.id, config.unit, true)}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 space-y-3">
                <button onClick={handleSaveEntry} className="w-full bg-primary py-5 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-transform">Salva Misure</button>
                <button onClick={() => setIsModalOpen(false)} className="w-full py-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFIGURAZIONE PARAMETRI */}
      {isConfigModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1200] p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-surface w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 border border-slate-700 shadow-2xl max-h-[85vh] flex flex-col">
                  <div className="flex justify-between items-center">
                      <h3 className="text-xl font-black uppercase text-white tracking-tight">Parametri Extra</h3>
                      <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-500 p-2"><X size={20}/></button>
                  </div>

                  <div className="space-y-4">
                      <div className="p-4 bg-dark rounded-2xl border border-slate-700">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Aggiungi Nuova Metrica</p>
                          <div className="space-y-3">
                              <input 
                                placeholder="Es. Bicipite SX" 
                                value={newConfig.label} 
                                onChange={e => setNewConfig({...newConfig, label: e.target.value})}
                                className="w-full bg-surface border border-slate-600 p-3 rounded-xl text-white font-bold outline-none focus:border-primary text-sm"
                              />
                              <div className="flex gap-2">
                                  <input 
                                    placeholder="Unità (cm, %, mm)" 
                                    value={newConfig.unit} 
                                    onChange={e => setNewConfig({...newConfig, unit: e.target.value})}
                                    className="flex-1 bg-surface border border-slate-600 p-3 rounded-xl text-white font-bold outline-none focus:border-primary text-sm"
                                  />
                                  <button onClick={handleAddConfig} className="bg-primary text-white p-3 rounded-xl shadow-lg active:scale-95"><Plus size={20}/></button>
                              </div>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Parametri Attivi</p>
                          {customConfigs.map(config => (
                              <div key={config.id} className="bg-dark p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                  <div>
                                      <p className="text-xs font-black text-white uppercase">{config.label}</p>
                                      <p className="text-[9px] text-slate-500 font-bold">Unità: {config.unit}</p>
                                  </div>
                                  <button onClick={() => handleDeleteConfig(config.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                              </div>
                          ))}
                          {customConfigs.length === 0 && (
                              <p className="text-center py-4 text-slate-600 text-[10px] font-bold uppercase italic">Nessun parametro extra configurato</p>
                          )}
                      </div>
                  </div>

                  <button onClick={() => setIsConfigModalOpen(false)} className="w-full bg-slate-800 py-4 rounded-2xl font-black text-white uppercase text-[10px] tracking-widest mt-auto">Chiudi</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default BodyMeasurements;
