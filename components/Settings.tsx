
import React, { useRef, useState, useEffect } from 'react';
import { getAllData, restoreData, FullBackupData, saveTheme, getTheme, saveWakeLockEnabled, getWakeLockEnabled, getVolume, saveVolume, getLanguage, saveLanguage, loadDefaultExercises, getCustomColors, saveCustomColors, CustomColors, getProfile, saveProfile } from '../services/storageService';
import { t } from '../services/translationService';
import { playTimerSound, unlockAudioContext } from '../services/audioService';
import { ThemeType, Language, UserProfile, Gender } from '../types';
import { RefreshCw, Database, Smartphone, Zap, Volume2, Globe, X, ShieldCheck, Library, Share2, Sparkles, ExternalLink, CheckCircle, Palette, Pipette, User, Calendar } from 'lucide-react';

interface SettingsProps {
    onLanguageChange?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onLanguageChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('iron');
  const [customColors, setCustomColorsState] = useState<CustomColors>({ primary: '#6366f1', secondary: '#10b981' });
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [language, setLanguage] = useState<Language>('it');

  // Profile State
  const [profile, setProfile] = useState<UserProfile>({ gender: 'M' });

  // AI State
  const [isAiKeySelected, setIsAiKeySelected] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTheme(getTheme());
    const colors = getCustomColors();
    if (colors) setCustomColorsState(colors);
    setWakeLockEnabled(getWakeLockEnabled());
    setVolume(getVolume());
    setLanguage(getLanguage());
    setProfile(getProfile());
    
    const checkKeyStatus = async () => {
        setIsCheckingKey(true);
        try {
            // @ts-ignore
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                // @ts-ignore
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsAiKeySelected(hasKey);
            } else if (process.env.API_KEY) {
                setIsAiKeySelected(true);
            }
        } catch (e) {
            console.warn("Key check failed", e);
        } finally {
            setIsCheckingKey(false);
        }
    };
    checkKeyStatus();
  }, []);

  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
      const newProfile = { ...profile, ...updates };
      setProfile(newProfile);
      saveProfile(newProfile);
  };

  const calculateAge = (birthDate?: string) => {
      if (!birthDate) return null;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
  };

  const handleOpenSelectKey = async () => {
    try {
        // @ts-ignore
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            setIsAiKeySelected(true);
            setImportMsg("AI Pronta!");
        } else {
            setIsAiKeySelected(true);
            setImportMsg("AI Attivata");
        }
    } catch (e) {
        setImportMsg("Errore attivazione.");
    } finally {
        setTimeout(() => setImportMsg(null), 3000);
    }
  };

  const handleThemeChange = (theme: ThemeType) => {
    saveTheme(theme);
    setCurrentTheme(theme);
  };

  const handleCustomColorChange = (key: keyof CustomColors, value: string) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColorsState(newColors);
    saveCustomColors(newColors);
  };

  const handleLanguageChange = (lang: Language) => {
      saveLanguage(lang);
      setLanguage(lang);
      if (onLanguageChange) onLanguageChange();
  };

  const handleTestSound = () => {
      unlockAudioContext();
      playTimerSound('test', volume);
  };
  
  const handleLoadDefaults = () => {
      const count = loadDefaultExercises();
      setImportMsg(`Aggiunti ${count} esercizi.`);
      setTimeout(() => setImportMsg(null), 4000);
  };

  const handleDownloadBackup = async () => {
    const data = getAllData();
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `irontrack_backup_${new Date().toISOString().split('T')[0]}.json`;
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-tight">{t('settings_title')}</h2>

      <div className="space-y-6">
        
        {/* Profile Section */}
        <div className="bg-surface p-6 rounded-[2rem] border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6 text-primary">
                <User size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Profilo Personale</h3>
            </div>
            
            <div className="space-y-5">
                <div>
                    <label className="block text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest px-1">Data di Nascita</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                            type="date" 
                            value={profile.birthDate || ''} 
                            onChange={(e) => handleProfileUpdate({ birthDate: e.target.value })}
                            className="w-full bg-dark border border-slate-700 pl-12 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
                        />
                    </div>
                    {profile.birthDate && (
                        <p className="text-[10px] text-emerald-400 font-black uppercase mt-2 px-1">Età: {calculateAge(profile.birthDate)} anni</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest px-1">Genere</label>
                        <select 
                            value={profile.gender || 'M'} 
                            onChange={(e) => handleProfileUpdate({ gender: e.target.value as Gender })}
                            className="w-full bg-dark border border-slate-700 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary appearance-none"
                        >
                            <option value="M">Maschio</option>
                            <option value="F">Femmina</option>
                            <option value="O">Altro</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest px-1">Altezza (cm)</label>
                        <input 
                            type="number" 
                            placeholder="Es. 175"
                            value={profile.height || ''} 
                            onChange={(e) => handleProfileUpdate({ height: parseInt(e.target.value) || undefined })}
                            className="w-full bg-dark border border-slate-700 p-4 rounded-2xl text-white font-bold outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-surface p-6 rounded-[2rem] border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6 text-primary">
                <Palette size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('settings_theme')}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
                {(['iron', 'ocean', 'fire', 'light'] as ThemeType[]).map((tType) => (
                    <button 
                        key={tType} 
                        onClick={() => handleThemeChange(tType)}
                        className={`p-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${currentTheme === tType ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-dark border-slate-800 text-gray-500'}`}
                    >
                        {tType}
                    </button>
                ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Colori Personalizzati</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase mb-2">
                            <Pipette size={12} className="text-primary" /> Primario
                        </label>
                        <div className="flex items-center gap-3 bg-dark p-2 rounded-xl border border-slate-800">
                            <input 
                                type="color" 
                                value={customColors.primary} 
                                onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-gray-300 uppercase">{customColors.primary}</span>
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase mb-2">
                            <Pipette size={12} className="text-secondary" /> Secondario
                        </label>
                        <div className="flex items-center gap-3 bg-dark p-2 rounded-xl border border-slate-800">
                            <input 
                                type="color" 
                                value={customColors.secondary} 
                                onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-gray-300 uppercase">{customColors.secondary}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* AI Features Section */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-surface p-6 rounded-[2rem] border border-indigo-500/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Sparkles size={120} />
            </div>
            
            <div className="flex items-center gap-3 mb-2 text-indigo-400">
                <Sparkles size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">IronTrack Pro AI</h3>
            </div>
            
            <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-wider leading-relaxed">
                Analisi avanzata delle performance tramite Gemini 3 Pro. È necessario selezionare una chiave API da un progetto Google Cloud con fatturazione attiva.
            </p>
            
            <div className="space-y-3 relative z-10">
                <button 
                    onClick={handleOpenSelectKey}
                    className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${isAiKeySelected ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}
                >
                    {isCheckingKey ? <RefreshCw size={18} className="animate-spin" /> : isAiKeySelected ? <> <CheckCircle size={18} /> AI Attiva </> : <> <ShieldCheck size={18} /> Attiva Funzioni AI </>}
                </button>
                <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-slate-800/50 text-slate-400 py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest border border-slate-700/50 hover:text-white transition-colors"
                >
                    <ExternalLink size={12} /> Guida Fatturazione API
                </a>
            </div>
            {importMsg && <div className="mt-3 text-center text-emerald-400 text-[10px] font-black uppercase">{importMsg}</div>}
        </div>

        {/* Display & Audio Options */}
        <div className="bg-surface p-6 rounded-[2rem] border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6 text-primary">
                <Smartphone size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('settings_device')}</h3>
            </div>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        <Zap size={16} className={wakeLockEnabled ? "text-yellow-400" : "text-gray-600"}/> Schermo Acceso
                    </div>
                    <button onClick={() => { saveWakeLockEnabled(!wakeLockEnabled); setWakeLockEnabled(!wakeLockEnabled); }} className={`w-12 h-7 rounded-full transition-all relative ${wakeLockEnabled ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${wakeLockEnabled ? 'left-6' : 'left-1'}`}></div>
                    </button>
                </div>
                <div className="border-t border-slate-700/50 pt-6">
                    <div className="flex justify-between items-center mb-4">
                         <div className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2">
                            <Volume2 size={16} className="text-primary"/> Volume Suoni
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); saveVolume(v); }} className="w-full accent-primary h-1.5 bg-dark rounded-full appearance-none cursor-pointer" />
                        <button onClick={handleTestSound} className="bg-dark px-4 py-2 rounded-xl text-[10px] font-black text-white uppercase border border-slate-700">Test</button>
                    </div>
                </div>
            </div>
        </div>

        {/* Language Selection */}
        <div className="bg-surface p-6 rounded-[2rem] border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6 text-emerald-400">
                <Globe size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{t('settings_lang')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {(['it', 'en'] as Language[]).map((lang) => (
                    <button key={lang} onClick={() => handleLanguageChange(lang)} className={`p-4 rounded-2xl border font-black uppercase text-xs tracking-widest transition-all ${language === lang ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-dark border-slate-700 text-gray-500'}`}>
                        {lang === 'it' ? 'Italiano' : 'English'}
                    </button>
                ))}
            </div>
        </div>
        
        {/* Backup Section */}
        <div className="bg-surface p-6 rounded-[2rem] border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-6 text-primary">
                <Database size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Dati</h3>
            </div>
            <div className="space-y-4">
                <button onClick={handleLoadDefaults} className="w-full bg-slate-800 text-gray-300 py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest border border-slate-700"><Library size={18} /> Carica Default</button>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleDownloadBackup} className="bg-dark text-white py-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-700">
                        <Share2 size={18} className="text-primary"/>
                        <span className="text-[9px] font-black uppercase tracking-widest">Esporta</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-dark text-white py-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-700">
                        <RefreshCw size={18} className="text-emerald-500"/>
                        <span className="text-[9px] font-black uppercase tracking-widest">Importa</span>
                    </button>
                </div>
                <input type="file" accept=".json" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (rev) => {
                      try {
                        const data = JSON.parse(rev.target?.result as string);
                        restoreData(data, 'merge');
                        setImportMsg("Dati Uniti!");
                        setTimeout(() => setImportMsg(null), 3000);
                      } catch (err) { setImportMsg("Errore File"); }
                    };
                    reader.readAsText(file);
                }} ref={fileInputRef} className="hidden" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
