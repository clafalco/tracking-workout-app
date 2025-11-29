
import React, { useState, useEffect } from 'react';
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
import { getTheme, applyTheme } from './services/storageService';
import { t } from './services/translationService';
import { LayoutDashboard, Dumbbell, ClipboardList, History as HistoryIcon, BarChart2, Scale } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [workoutSession, setWorkoutSession] = useState<{ routine: Routine | null, dayId: string | null } | null>(null);
  
  // Stato per forzare il re-render quando cambia la lingua
  const [langKey, setLangKey] = useState(0);

  useEffect(() => {
    // Apply saved theme on boot
    applyTheme(getTheme());
  }, []);

  const handleLanguageUpdate = () => {
    // Incrementando questo numero, React distrugge e ricrea l'interfaccia
    // applicando le nuove traduzioni istantaneamente senza ricaricare la pagina
    setLangKey(prev => prev + 1);
  };

  const startWorkout = (routine: Routine, dayId: string) => {
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
      // Passiamo la funzione di aggiornamento al componente Settings
      case 'settings': return <Settings onLanguageChange={handleLanguageUpdate} />;
      default: return <Dashboard onStartWorkout={startWorkout} changeTab={setActiveTab} />;
    }
  };

  return (
    // La key={langKey} è il trucco: quando cambia, tutto il contenuto viene ridisegnato con la nuova lingua
    <div key={langKey} className="bg-dark min-h-screen text-slate-100 font-sans selection:bg-primary selection:text-white">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-dark">
        {renderContent()}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-sm border-t border-slate-700 flex justify-around items-center py-3 px-2 z-50 md:max-w-md md:mx-auto">
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
            isActive={activeTab === 'measurements'} 
            onClick={() => setActiveTab('measurements')} 
            icon={<Scale size={20} />} 
            label={t('nav_measurements')} 
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
    className={`flex flex-col items-center gap-1 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
