import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Info } from 'lucide-react';

const MaxCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'1rm' | 'plates'>('1rm');

  // 1RM State
  const [weight, setWeight] = useState<number | ''>('');
  const [reps, setReps] = useState<number | ''>('');
  const [oneRepMax, setOneRepMax] = useState<number>(0);

  // Plate Calculator State
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [calculatedPlates, setCalculatedPlates] = useState<number[]>([]);
  const barWeight = 20; // Standard Olympic Bar

  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const plateColors: Record<number, string> = {
      25: 'bg-red-600',
      20: 'bg-blue-600',
      15: 'bg-yellow-500',
      10: 'bg-green-600',
      5: 'bg-slate-100',
      2.5: 'bg-slate-800',
      1.25: 'bg-slate-400'
  };

  useEffect(() => {
    if (weight && reps) {
      // Epley Formula: 1RM = w * (1 + r/30)
      const w = Number(weight);
      const r = Number(reps);
      
      if (r === 1) {
          setOneRepMax(w);
      } else {
          const estimate = w * (1 + r / 30);
          setOneRepMax(Math.round(estimate));
      }
    } else {
      setOneRepMax(0);
    }
  }, [weight, reps]);

  useEffect(() => {
      if (!targetWeight || Number(targetWeight) <= barWeight) {
          setCalculatedPlates([]);
          return;
      }
      
      let remaining = (Number(targetWeight) - barWeight) / 2;
      const plates: number[] = [];

      for (const p of availablePlates) {
          while (remaining >= p) {
              plates.push(p);
              remaining -= p;
          }
      }
      setCalculatedPlates(plates);

  }, [targetWeight]);

  const percentages = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

  return (
    <div className="p-4 pb-24 w-full overflow-hidden">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Calculator className="text-primary shrink-0" /> Toolkit Palestra
      </h2>

      {/* Tabs */}
      <div className="flex p-1 bg-surface rounded-xl border border-slate-700 mb-6">
          <button 
            onClick={() => setActiveTab('1rm')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === '1rm' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
              1RM Massimale
          </button>
          <button 
            onClick={() => setActiveTab('plates')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'plates' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
              Calcola Dischi
          </button>
      </div>

      {activeTab === '1rm' ? (
          // 1RM VIEW
          <>
            <div className="bg-surface p-4 sm:p-6 rounded-xl border border-slate-700 shadow-lg mb-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Peso (Kg)</label>
                        <input 
                            type="number" 
                            value={weight}
                            onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Es. 80"
                            className="w-full bg-dark text-white text-lg p-3 rounded-xl border border-slate-600 focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Reps</label>
                        <input 
                            type="number" 
                            value={reps}
                            onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Es. 8"
                            className="w-full bg-dark text-white text-lg p-3 rounded-xl border border-slate-600 focus:border-primary outline-none"
                        />
                    </div>
                </div>

                <div className="bg-dark rounded-xl p-6 text-center border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500"></div>
                    <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Massimale Stimato</p>
                    <div className="text-5xl font-bold text-white tracking-tight">
                        {oneRepMax > 0 ? oneRepMax : '-'} <span className="text-2xl text-gray-500 font-normal">kg</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                        <Info size={12} /> Formula di Epley
                    </p>
                </div>
            </div>

            {oneRepMax > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <TrendingUp size={18} className="text-emerald-400"/> Percentuali
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {percentages.map(pct => (
                            <div key={pct} className="bg-surface p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                                <span className="text-gray-400 font-mono font-bold">{pct}%</span>
                                <span className="text-white font-bold text-lg">{Math.round(oneRepMax * (pct / 100))} <span className="text-xs font-normal text-gray-500">kg</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </>
      ) : (
          // PLATE CALCULATOR VIEW
          <div className="space-y-6">
              <div className="bg-surface p-4 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
                  <label className="block text-xs text-gray-400 mb-1 uppercase font-bold">Peso Target Totale (Kg)</label>
                  <div className="flex items-center gap-3">
                    <input 
                        type="number" 
                        value={targetWeight}
                        onChange={(e) => setTargetWeight(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="100"
                        className="flex-1 bg-dark text-white text-xl p-3 rounded-xl border border-slate-600 focus:border-primary outline-none font-bold min-w-0"
                        autoFocus
                    />
                    <div className="text-gray-500 text-xs text-right shrink-0">
                        <p>Bilanciere</p>
                        <p className="font-bold text-white text-sm">20 Kg</p>
                    </div>
                  </div>
              </div>

              {Number(targetWeight) > 20 && (
                <div className="bg-dark p-2 rounded-xl border border-slate-700 w-full overflow-hidden">
                    <div className="overflow-x-auto pb-2">
                        {/* Bar visualization Container */}
                        <div className="flex items-center justify-center min-w-max min-h-[140px] px-4 mx-auto">
                            
                            {/* LEFT PLATES (Reversed) */}
                            <div className="flex items-center justify-end gap-[1px] sm:gap-[2px]">
                                {[...calculatedPlates].reverse().map((p, i) => (
                                    <div 
                                        key={`l-${i}`} 
                                        className={`${plateColors[p]} border border-black/30 shadow-md rounded-[2px] flex items-center justify-center text-[9px] font-bold text-black/60`}
                                        style={{
                                            height: `${40 + (p * 2.5)}px`, 
                                            width: `${8 + (p/5)}px`
                                        }}
                                    >
                                    </div>
                                ))}
                            </div>

                            {/* BAR SHAFT */}
                            <div className="w-12 sm:w-32 h-3 sm:h-4 bg-gray-400 mx-[1px] rounded-sm relative shrink-0">
                                {/* Sleeves Stops */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-2 h-5 sm:h-6 bg-gray-500 rounded-sm"></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 w-2 h-5 sm:h-6 bg-gray-500 rounded-sm"></div>
                            </div>

                            {/* RIGHT PLATES */}
                            <div className="flex items-center justify-start gap-[1px] sm:gap-[2px]">
                                {calculatedPlates.map((p, i) => (
                                    <div 
                                        key={`r-${i}`} 
                                        className={`${plateColors[p]} border border-black/30 shadow-md rounded-[2px] flex items-center justify-center text-[9px] font-bold text-black/60`}
                                        style={{
                                            height: `${40 + (p * 2.5)}px`, 
                                            width: `${8 + (p/5)}px`
                                        }}
                                    >
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap justify-center gap-2 pb-2">
                        {calculatedPlates.map((p, i) => (
                             <div key={i} className="flex items-center gap-1 bg-surface px-2 py-1 rounded-full border border-slate-600 shadow-sm shrink-0">
                                 <div className={`w-2 h-2 rounded-full ${plateColors[p]}`}></div>
                                 <span className="font-bold text-white text-xs">{p}</span>
                             </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 text-center">Dischi per lato</p>
                </div>
              )}
              
              {targetWeight !== '' && Number(targetWeight) <= 20 && (
                  <div className="text-center text-gray-500 py-4 text-sm">
                      Inserisci un peso superiore a 20kg.
                  </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="text-xs text-gray-500 col-span-full mb-1">Legenda (Dischi Olimpici):</div>
                  {[25, 20, 15, 10, 5, 2.5, 1.25].map(p => (
                      <div key={p} className="flex items-center gap-2 bg-surface p-2 rounded border border-slate-800">
                           <div className={`w-3 h-3 rounded-full ${plateColors[p]} border border-white/10 shrink-0`}></div>
                           <span className="text-xs text-gray-300">{p} kg</span>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default MaxCalculator;