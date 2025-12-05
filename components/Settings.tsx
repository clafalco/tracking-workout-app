

import React, { useRef, useState, useEffect } from 'react';
import { getAllData, restoreData, FullBackupData, saveTheme, getTheme, saveWakeLockEnabled, getWakeLockEnabled, getVolume, saveVolume, getLanguage, saveLanguage, loadDefaultExercises } from '../services/storageService';
import { t, getGuideContent } from '../services/translationService';
import { ThemeType, Language } from '../types';
import { Download, RefreshCw, Database, Key, Eye, EyeOff, Save, Check, Palette, Smartphone, Zap, Sun, Volume2, Globe, HelpCircle, X, ShieldCheck, BookOpen, Library } from 'lucide-react';

// GLOBAL AUDIO CONTEXT FOR IOS SUPPORT
// iOS richiede un unico contesto riutilizzato, non uno nuovo per ogni suono.
let globalAudioCtx: AudioContext | any = null;

const getAudioContext = () => {
    if (!globalAudioCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
            globalAudioCtx = new Ctx();
        }
    }
    return globalAudioCtx;
};

// Helper audio robusto per iOS
const playTestSound = async (volume: number) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // CRITICO PER IOS: Se il contesto è sospeso, ripristinalo (deve avvenire in un evento click)
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = 880;
        gain.gain.value = volume * 0.1; 
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) { console.error("Audio Test Error", e); }
};

interface SettingsProps {
    onLanguageChange?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onLanguageChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Theme & Settings State
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('iron');
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [language, setLanguage] = useState<Language>('it');

  // Import Feedback State
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // Guide Modal
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Carica dati salvati
    const savedKey = localStorage.getItem('iron_track_api_key');
    if (savedKey) setApiKey(savedKey);
    
    setCurrentTheme(getTheme());
    setWakeLockEnabled(getWakeLockEnabled());
    setVolume(getVolume());
    setLanguage(getLanguage());
  }, []);

  const handleSaveKey = () => {
      localStorage.setItem('iron_track_api_key', apiKey.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
  };

  const handleThemeChange = (theme: ThemeType) => {
      saveTheme(theme);
      setCurrentTheme(theme);
  };

  const handleWakeLockChange = (enabled: boolean) => {
      saveWakeLockEnabled(enabled);
      setWakeLockEnabled(enabled);
  };

  const handleVolumeChange = (newVolume: number) => {
      setVolume(newVolume);
      saveVolume(newVolume);
  };
  
  const handleLanguageChange = (lang: Language) => {
      saveLanguage(lang);
      setLanguage(lang);
      
      // Invece di ricaricare la pagina (che causa errori 404),
      // chiamiamo la funzione passata da App.tsx per ridisegnare l'interfaccia
      if (onLanguageChange) {
          onLanguageChange();
      }
  };

  const handleTestSound = () => {
      playTestSound(volume);
  }
  
  const handleLoadDefaults = () => {
      // Rimosso window.confirm per evitare blocchi su mobile PWA
      const count = loadDefaultExercises();
      setImportMsg(`Fatto! Aggiunti ${count} nuovi esercizi.`);
      setTimeout(() => setImportMsg(null), 4000);
  };

  const handleDownloadBackup = () => {
    const data = getAllData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `irontrack_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = (mode: 'merge' | 'overwrite') => {
      setRestoreMode(mode);
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json) as FullBackupData;
        
        // Simple validation
        if (!data.timestamp || (!data.exercises && !data.logs)) {
            throw new Error("Formato file non valido");
        }

        const message = restoreMode === 'merge' 
            ? "I dati del backup verranno uniti a quelli attuali. Elementi esistenti verranno aggiornati, nuovi elementi verranno aggiunti. Continuare?"
            : "ATTENZIONE: Questa operazione CANCELLERÀ tutti i dati attuali su questo dispositivo e li sostituirà con quelli del backup. Sei sicuro?";

        // Per operazioni distruttive come il restore totale, proviamo a mantenere il confirm, 
        // ma per il merge potremmo evitarlo. Qui lo lascio perché è critico, ma se l'utente ha problemi anche qui,
        // dovremo fare un modale custom.
        if (confirm(message)) {
            restoreData(data, restoreMode);
            alert(restoreMode === 'merge' ? "Sincronizzazione completata!" : "Ripristino completato!");
            if (onLanguageChange) onLanguageChange();
        }
      } catch (err) {
        alert("Errore durante la lettura del file. Assicurati che sia un backup valido di IronTrack.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 pb-24">
      <h2 className="text-2xl font-bold text-white mb-6">{t('settings_title')}</h2>

      <div className="space-y-6">

        {/* Language Section */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <Globe size={24} />
                <h3 className="text-lg font-bold text-white">{t('settings_lang')}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
                {(['it', 'en', 'fr', 'de'] as Language[]).map((lang) => (
                    <button
                        key={lang}
                        onClick={() => handleLanguageChange(lang)}
                        className={`p-3 rounded-xl border border-slate-600 font-bold transition-all uppercase ${language === lang ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-dark text-gray-400 hover:bg-slate-700'}`}
                    >
                        {lang === 'it' ? 'Italiano' : lang === 'en' ? 'English' : lang === 'fr' ? 'Français' : 'Deutsch'}
                    </button>
                ))}
            </div>

            <button 
                onClick={() => setShowGuide(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors border border-slate-600"
            >
                <HelpCircle size={20} /> {t('settings_guide_btn')}
            </button>
        </div>

        {/* Theme Section */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-primary">
                <Palette size={24} />
                <h3 className="text-lg font-bold text-white">{t('settings_theme')}</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                    onClick={() => handleThemeChange('iron')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'iron' ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-700 hover:border-slate-600'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500"></div>
                    <span className="text-xs font-bold text-gray-300">Iron (Default)</span>
                </button>
                <button 
                    onClick={() => handleThemeChange('ocean')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'ocean' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-700 hover:border-slate-600'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400"></div>
                    <span className="text-xs font-bold text-gray-300">Ocean</span>
                </button>
                <button 
                    onClick={() => handleThemeChange('fire')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'fire' ? 'border-red-500 bg-red-500/20' : 'border-slate-700 hover:border-slate-600'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500"></div>
                    <span className="text-xs font-bold text-gray-300">Fire</span>
                </button>
                 <button 
                    onClick={() => handleThemeChange('light')}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${currentTheme === 'light' ? 'border-indigo-600 bg-slate-100' : 'border-slate-700 hover:border-slate-600'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center">
                        <Sun size={16} className="text-orange-500" />
                    </div>
                    <span className="text-xs font-bold text-gray-300">Light</span>
                </button>
            </div>
        </div>

        {/* Display & Audio Options */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-primary">
                <Smartphone size={24} />
                <h3 className="text-lg font-bold text-white">{t('settings_device')}</h3>
            </div>
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-white font-medium flex items-center gap-2">
                            <Zap size={16} className={wakeLockEnabled ? "text-yellow-400" : "text-gray-600"}/> 
                            Screen Always On
                        </div>
                    </div>
                    <button 
                        onClick={() => handleWakeLockChange(!wakeLockEnabled)}
                        className={`w-12 h-7 rounded-full transition-colors relative ${wakeLockEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${wakeLockEnabled ? 'left-6' : 'left-1'}`}></div>
                    </button>
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <div className="text-white font-medium flex items-center gap-2 mb-3">
                        <Volume2 size={16} className="text-primary"/> 
                        Volume
                    </div>
                    <div className="flex items-center gap-4">
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.1" 
                            value={volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-full accent-primary h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <button 
                            onClick={handleTestSound}
                            className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1 rounded text-white"
                        >
                            Test
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* API Key Section */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-purple-400">
                <Key size={24} />
                <h3 className="text-lg font-bold text-white">{t('settings_api')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
                Inserisci la tua Chiave API di Google Gemini per abilitare i consigli intelligenti e la creazione automatica delle routine.
                <br/><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Ottieni una chiave qui</a>.
            </p>
            
            <div className="relative flex items-center gap-2">
                <input 
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="API Key..."
                    className="w-full bg-dark border border-slate-600 p-3 rounded-xl text-white focus:outline-none focus:border-primary pr-10"
                />
                <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-14 text-gray-400 hover:text-white"
                >
                    {showKey ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
                <button 
                    onClick={handleSaveKey}
                    className={`p-3 rounded-xl flex items-center justify-center transition-colors ${keySaved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-indigo-600'}`}
                >
                    {keySaved ? <Check size={20}/> : <Save size={20}/>}
                </button>
            </div>
        </div>
        
        {/* Backup Section */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4 text-primary">
                <ShieldCheck size={24} />
                <h3 className="text-lg font-bold text-white">{t('settings_sync')}</h3>
            </div>
            
            <div className="space-y-4">
                {/* NEW: Load Defaults Button */}
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleLoadDefaults}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-gray-200 py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm border border-slate-600"
                    >
                        <Library size={18} />
                        Carica Database Esercizi (Default)
                    </button>
                    {importMsg && (
                        <div className="text-center text-emerald-400 text-sm font-bold bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20 animate-in fade-in slide-in-from-top-1">
                            {importMsg}
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleDownloadBackup}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-medium border border-slate-600"
                >
                    <Download size={20} className="text-emerald-400"/>
                    Backup (Export)
                </button>

                <div className="relative">
                    <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="hidden"
                    />
                    
                    <div className="grid grid-cols-1 gap-3 mt-6 pt-6 border-t border-slate-700">
                        <button 
                            onClick={() => handleUploadClick('merge')}
                            className="w-full bg-primary hover:bg-indigo-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors font-medium shadow-lg shadow-primary/20"
                        >
                            <RefreshCw size={20} />
                            Sync (Merge)
                        </button>
                        
                        <button 
                            onClick={() => handleUploadClick('overwrite')}
                            className="w-full bg-surface border border-red-500/30 text-red-400 hover:bg-red-500/10 py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm"
                        >
                            <Database size={16} />
                            Restore (Overwrite)
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Info Section */}
        <div className="bg-surface p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-2">IronTrack Pro</h3>
            <p className="text-sm text-gray-400">Versione 1.4.0</p>
            <div className="mt-4 text-xs text-gray-500">
                PWA Offline-First.
                <br/>Build Date: {new Date().toLocaleDateString()}
            </div>
        </div>
      </div>

      {/* USER GUIDE MODAL */}
      {showGuide && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-surface p-6 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl relative max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 sticky top-0 bg-surface z-10 py-2 border-b border-slate-700">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <BookOpen size={24} className="text-primary"/> {t('settings_guide_title')}
                      </h3>
                      <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-white p-2">
                          <X size={24}/>
                      </button>
                  </div>
                  
                  <div className="space-y-6">
                      {getGuideContent().map((section, index) => (
                          <div key={index} className="space-y-2">
                              <h4 className="text-lg font-bold text-emerald-400">{section.title}</h4>
                              <p className="text-gray-300 text-sm leading-relaxed">{section.text}</p>
                          </div>
                      ))}
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-700">
                    <button 
                        onClick={() => setShowGuide(false)}
                        className="w-full bg-primary py-3 rounded-xl text-white font-bold"
                    >
                        Chiudi / Close
                    </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;