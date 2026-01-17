
import React from 'react';
import { Activity } from 'lucide-react';
import { MuscleGroup, RoutineDay } from '../types';
import { getExercises } from '../services/storageService';

interface MuscleMapProps {
  day?: RoutineDay;
  statsData?: Record<string, number>; // Se passato, usa questo per la heatmap
}

const MuscleMap: React.FC<MuscleMapProps> = ({ day, statsData }) => {
  const exercisesDB = getExercises();
  const muscleIntensity: Record<string, 'primary' | 'secondary' | 'none'> = {};

  if (day) {
      day.exercises.forEach(rex => {
        const ex = exercisesDB.find(e => e.id === rex.exerciseId);
        if (ex) {
          muscleIntensity[ex.muscleGroup] = 'primary';
          ex.secondaryMuscles?.forEach(sm => {
            if (muscleIntensity[sm] !== 'primary') muscleIntensity[sm] = 'secondary';
          });
        }
      });
  } else if (statsData) {
      // Logica Heatmap: se il valore è sopra la media è primary, altrimenti secondary
      // Fix: Aggiunto cast esplicito a number[] per risolvere l'errore TypeScript su Object.values
      const values = Object.values(statsData) as number[];
      const max = Math.max(...values, 1);
      const avg = values.reduce((a: number, b: number) => a + b, 0) / (values.length || 1);
      
      // Fix: Aggiunto cast esplicito a [string, number][] per risolvere l'errore TypeScript su Object.entries
      (Object.entries(statsData) as [string, number][]).forEach(([group, count]) => {
          if (count > avg) muscleIntensity[group] = 'primary';
          else if (count > 0) muscleIntensity[group] = 'secondary';
          else muscleIntensity[group] = 'none';
      });
  }

  const getIntensity = (group: MuscleGroup) => muscleIntensity[group] || 'none';

  const MusclePart = ({ group, d, id }: { group: MuscleGroup, d: string, id: string }) => {
    const intensity = getIntensity(group);
    const isPrimary = intensity === 'primary';
    
    const baseColor = "#1e293b";
    const baseOpacity = 0.4;

    if (intensity === 'none') {
        return <path d={d} fill={baseColor} fillOpacity={baseOpacity} stroke="rgba(255,255,255,0.03)" strokeWidth="0.1" />;
    }

    return (
      <g className="transition-all duration-1000">
        {isPrimary && (
            <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeOpacity="0.2" filter="url(#superGlow)" />
        )}
        <path
          d={d}
          fill={isPrimary ? 'url(#activeGrad)' : 'url(#secondaryGrad)'}
          filter="url(#inner3d)"
        />
        <path
          d={d}
          fill="url(#muscleFibers)"
          fillOpacity={isPrimary ? "0.5" : "0.2"}
          pointerEvents="none"
        />
        <path
          d={d}
          fill="none"
          stroke="white"
          strokeWidth="0.15"
          strokeOpacity={isPrimary ? "0.4" : "0.1"}
        />
      </g>
    );
  };

  const HumanShellFront = () => (
    <path 
      d="M25,2 C22,2 20,4 20,7 L20,10 C15,11 12,13 10,18 L8,35 L12,50 L14,95 L24,95 L25,70 L26,95 L36,95 L38,50 L42,35 L40,18 C38,13 35,11 30,10 L30,7 C30,4 28,2 25,2 Z" 
      fill="none" 
      stroke="rgba(255,255,255,0.15)" 
      strokeWidth="0.5"
    />
  );

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-slate-950/50 rounded-[3rem] border border-slate-800 relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#6366f1 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}>
      </div>
      
      <div className="absolute top-6 left-6 flex flex-col gap-1">
        <div className="w-8 h-[2px] bg-primary/40"></div>
        <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest">{statsData ? 'Heatmap.Global' : 'Biometric.Scan'}</span>
      </div>

      <div className="flex justify-between w-full gap-4 relative z-10 pt-4">
        <svg viewBox="0 0 120 100" className="w-full h-auto drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <defs>
            <filter id="inner3d" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur" />
              <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1.2" specularExponent="25" lightingColor="#ffffff" result="specOut">
                <fePointLight x="-20" y="-20" z="50" />
              </feSpecularLighting>
              <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
              <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
            <filter id="superGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="muscleFibers" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="1" stroke="white" strokeWidth="0.1" strokeOpacity="0.3" />
            </pattern>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="secondaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          <g transform="translate(5, 5) scale(0.9)">
            <HumanShellFront />
            <MusclePart group={MuscleGroup.Chest} id="pec-l" d="M24.5,18 C20,18.5 18,22 17.5,27 C22,28.5 24.5,28 24.5,18 Z" />
            <MusclePart group={MuscleGroup.Chest} id="pec-r" d="M25.5,18 C30,18.5 32,22 32.5,27 C28,28.5 25.5,28 25.5,18 Z" />
            <MusclePart group={MuscleGroup.Abs} id="abs" d="M21.5,32 L28.5,32 L28.5,50 L21.5,50 Z" />
            <MusclePart group={MuscleGroup.Shoulders} id="delt-l" d="M17,14 C13,15 11,20 14,26 C16,21 17,17 17,14 Z" />
            <MusclePart group={MuscleGroup.Shoulders} id="delt-r" d="M33,14 C37,15 39,20 36,26 C34,21 33,17 33,14 Z" />
            <MusclePart group={MuscleGroup.Arms} id="bic-l" d="M13,27 L10,42 L13,43 L15,28 Z" />
            <MusclePart group={MuscleGroup.Arms} id="bic-r" d="M37,27 L40,42 L37,43 L35,28 Z" />
            <MusclePart group={MuscleGroup.Legs} id="quad-l" d="M16.5,55 C12,65 13,85 23,85 L23,55 Z" />
            <MusclePart group={MuscleGroup.Legs} id="quad-r" d="M33.5,55 C38,65 37,85 27,85 L27,55 Z" />
          </g>

          <g transform="translate(65, 5) scale(0.9)">
            <HumanShellFront />
            <MusclePart group={MuscleGroup.Back} id="traps" d="M25,5 L32,14 L25,24 L18,14 Z" />
            <MusclePart group={MuscleGroup.Back} id="lats-l" d="M18,15 L14,40 L24,48 L24,25 Z" />
            <MusclePart group={MuscleGroup.Back} id="lats-r" d="M32,15 L36,40 L26,48 L26,25 Z" />
            <MusclePart group={MuscleGroup.Arms} id="tri-l" d="M14,24 L11,40 L14,42 L16,26 Z" />
            <MusclePart group={MuscleGroup.Arms} id="tri-r" d="M36,24 L39,40 L36,42 L34,26 Z" />
            <MusclePart group={MuscleGroup.Legs} id="glute-l" d="M16,56 C14,65 18,74 24.5,74 L24.5,56 Z" />
            <MusclePart group={MuscleGroup.Legs} id="glute-r" d="M34,56 C36,65 32,74 25.5,74 L25.5,56 Z" />
            <MusclePart group={MuscleGroup.Legs} id="ham-l" d="M17,76 L23,76 L23,94 L19,94 Z" />
            <MusclePart group={MuscleGroup.Legs} id="ham-r" d="M33,76 L27,76 L27,94 L31,94 Z" />
          </g>
        </svg>
      </div>

      <div className="w-full flex flex-wrap justify-center gap-2 pt-6 border-t border-slate-800/50">
        {Object.entries(muscleIntensity).filter(([_, i]) => i !== 'none').slice(0, 4).map(([m, i]) => (
            <div key={m} className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all ${i === 'primary' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${i === 'primary' ? 'bg-primary animate-pulse' : 'bg-slate-700'}`}></div>
                <span className="text-[8px] font-black uppercase tracking-widest">{m}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

export default MuscleMap;
