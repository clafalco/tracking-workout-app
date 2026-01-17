
import React, { useState, useEffect, useRef } from 'react';
import { NavigationTab, Routine } from './types';
import Dashboard from './components/Dashboard';
import ExerciseManager from './components/ExerciseManager';
import RoutineManager from './components/RoutineManager';
import ActiveWorkout from './components/ActiveWorkout';
import History from './components/History';
import Statistics from './components/Statistics';
import BodyMeasurements from './components/BodyMeasurements';
import MaxCalculator from './components/MaxCalculator';
import Settings from './components/Settings';
import { getTheme, applyTheme, getActiveSession, getRoutines, getWakeLockEnabled } from './services/storageService';
import { unlockAudioContext } from './services/audioService';
import { t } from './services/translationService';
import { LayoutDashboard, Dumbbell, ClipboardList, History as HistoryIcon, BarChart2 } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    return (localStorage.getItem('iron_track_active_tab') as NavigationTab) || 'dashboard';
  });
  const [workoutSession, setWorkoutSession] = useState<{ routine: Routine | null, dayId: string | null } | null>(null);
  
  const [langKey, setLangKey] = useState(0);
  const globalWakeLockRef = useRef<any>(null);

  const requestGlobalWakeLock = async () => {
    if (getWakeLockEnabled() && 'wakeLock' in navigator) {
        try {
            // @ts-ignore
            globalWakeLockRef.current = await navigator.wakeLock.request('screen');
            console.log("Global Wake Lock attivo.");
        } catch (err) {
            console.warn("Global Wake Lock fallito.");
        }
    }
  };

  useEffect(() => {
    applyTheme(getTheme());

    const handleGlobalInteraction = () => {
        unlockAudioContext();
    };

    document.addEventListener('touchstart', handleGlobalInteraction, { capture: true, passive: true });
    document.addEventListener('click', handleGlobalInteraction, { capture: true, passive: true });
    document.addEventListener('keydown', handleGlobalInteraction, { capture: true, passive: true });

    // Gestione Wake Lock Globale e Visibilità
    const handleVisibility = async () => {
        if (document.visibilityState === 'visible') {
            await requestGlobalWakeLock();
        }
    };

    requestGlobalWakeLock();
    document.addEventListener('visibilitychange', handleVisibility);

    const savedSession = getActiveSession();
    if (savedSession) {
        let routineToPass: Routine | null = null;
        if (savedSession.routineId) {
            const routines = getRoutines();
            routineToPass = routines.find(r => r.id === savedSession.routineId) || null;
        }
        setWorkoutSession({ 
            routine: routineToPass, 
            dayId: savedSession.dayId || null 
        });
    }

    return () => {
        document.removeEventListener('touchstart', handleGlobalInteraction);
        document.removeEventListener('click', handleGlobalInteraction);
        document.removeEventListener('keydown', handleGlobalInteraction);
        document.removeEventListener('visibilitychange', handleVisibility);
        if (globalWakeLockRef.current) {
            globalWakeLockRef.current.release().catch(() => {});
        }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('iron_track_active_tab', activeTab);
  }, [activeTab]);

  const handleLanguageUpdate = () => {
    setLangKey(prev => prev + 1);
  };

  const startWorkout = (routine: Routine, dayId: string) => {
    unlockAudioContext();
    setWorkoutSession({ routine, dayId });
  };

  const finishWorkout = () => {
    setWorkoutSession(null);
    setActiveTab('history');
  };

  if (workoutSession) {
    return (
      <ActiveWorkout 
        routine={workoutSession.routine} 
        dayId={workoutSession.dayId} 
        onFinish={finishWorkout} 
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onStartWorkout={startWorkout} changeTab={setActiveTab} />;
      case 'exercises': return <ExerciseManager />;
      case 'routines': return <RoutineManager />;
      case 'history': return <History />;
      case 'stats': return <Statistics />;
      case 'measurements': return <BodyMeasurements />;
      case 'calculator': return <MaxCalculator />;
      case 'settings': return <Settings onLanguageChange={handleLanguageUpdate} />;
      default: return <Dashboard onStartWorkout={startWorkout} changeTab={setActiveTab} />;
    }
  };

  return (
    <div key={langKey} className="bg-dark min-h-screen text-slate-100 font-sans selection:bg-primary selection:text-white">
      <div className="w-full mx-auto min-h-screen relative bg-dark">
        {renderContent()}

        <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-slate-700/50 flex justify-around items-center py-3 px-2 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
          <NavBtn 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard size={20} />} 
            label={t('nav_home')} 
          />
          <NavBtn 
            isActive={activeTab === 'routines'} 
            onClick={() => setActiveTab('routines')} 
            icon={<ClipboardList size={20} />} 
            label={t('nav_routines')} 
          />
          <NavBtn 
            isActive={activeTab === 'exercises'} 
            onClick={() => setActiveTab('exercises')} 
            icon={<Dumbbell size={20} />} 
            label={t('nav_exercises')} 
          />
          <NavBtn 
            isActive={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
            icon={<BarChart2 size={20} />} 
            label={t('nav_stats')} 
          />
          <NavBtn 
            isActive={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<HistoryIcon size={20} />} 
            label={t('nav_history')} 
          />
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ isActive, onClick, icon, label }: { isActive: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-gray-500 hover:text-gray-300'}`}
  >
    {icon}
    <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;
