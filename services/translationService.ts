
import { Language } from '../types';
import { getLanguage } from './storageService';

// Dictionary Types
type TranslationKeys = 
  | 'nav_home' | 'nav_routines' | 'nav_exercises' | 'nav_measurements' | 'nav_stats' | 'nav_history'
  | 'settings_title' | 'settings_lang' | 'settings_guide_btn' | 'settings_guide_title'
  | 'settings_theme' | 'settings_device' | 'settings_api' | 'settings_sync'
  | 'guide_intro_title' | 'guide_intro_text'
  | 'guide_routines_title' | 'guide_routines_text'
  | 'guide_workout_title' | 'guide_workout_text'
  | 'guide_sync_title' | 'guide_sync_text';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  it: {
    nav_home: "Home",
    nav_routines: "Routine",
    nav_exercises: "Esercizi",
    nav_measurements: "Misure",
    nav_stats: "Stats",
    nav_history: "Storico",
    settings_title: "Impostazioni",
    settings_lang: "Lingua / Language",
    settings_guide_btn: "Guida all'Uso",
    settings_guide_title: "Manuale Utente",
    settings_theme: "Aspetto",
    settings_device: "Dispositivo",
    settings_api: "Google AI Key",
    settings_sync: "Sincronizzazione Dati",
    
    // Guide Content
    guide_intro_title: "Benvenuto in IronTrack Pro",
    guide_intro_text: "IronTrack è il tuo diario di allenamento digitale offline-first. I dati rimangono sul tuo dispositivo.",
    guide_routines_title: "Creazione Routine",
    guide_routines_text: "Vai nella sezione 'Routine' per creare la tua scheda. Puoi organizzare la settimana in 'Giorni' (es. Push, Pull, Legs) e aggiungere esercizi. Usa i 'Modelli' per salvare schede riutilizzabili.",
    guide_workout_title: "Allenamento Attivo",
    guide_workout_text: "Dalla Home, clicca su un giorno della routine attiva. Durante l'allenamento, usa il timer integrato e spunta i set completati. L'app ricorderà i carichi della volta precedente (Ghost Sets).",
    guide_sync_title: "Backup e Sync",
    guide_sync_text: "Per passare i dati dal telefono al PC: vai in Impostazioni -> Scarica Backup. Invia il file all'altro dispositivo e usa 'Unisci Dati' per sincronizzare."
  },
  en: {
    nav_home: "Home",
    nav_routines: "Routines",
    nav_exercises: "Exercises",
    nav_measurements: "Body",
    nav_stats: "Stats",
    nav_history: "History",
    settings_title: "Settings",
    settings_lang: "Language",
    settings_guide_btn: "User Guide",
    settings_guide_title: "User Manual",
    settings_theme: "Appearance",
    settings_device: "Device",
    settings_api: "Google AI Key",
    settings_sync: "Data Sync",

    guide_intro_title: "Welcome to IronTrack Pro",
    guide_intro_text: "IronTrack is your offline-first digital workout log. Your data stays on your device.",
    guide_routines_title: "Creating Routines",
    guide_routines_text: "Go to 'Routines' to build your program. Organize your week into 'Days' (e.g., Push, Pull, Legs) and add exercises. Use 'Templates' to save reusable plans.",
    guide_workout_title: "Active Workout",
    guide_workout_text: "From Home, click a day in your active routine. During workout, use the built-in timer and check off completed sets. The app remembers your previous weights (Ghost Sets).",
    guide_sync_title: "Backup & Sync",
    guide_sync_text: "To move data from phone to PC: go to Settings -> Download Backup. Send the file to the other device and use 'Merge Data' to sync."
  },
  fr: {
    nav_home: "Accueil",
    nav_routines: "Programmes",
    nav_exercises: "Exercices",
    nav_measurements: "Mesures",
    nav_stats: "Stats",
    nav_history: "Historique",
    settings_title: "Paramètres",
    settings_lang: "Langue / Language",
    settings_guide_btn: "Guide d'Utilisation",
    settings_guide_title: "Manuel Utilisateur",
    settings_theme: "Apparence",
    settings_device: "Appareil",
    settings_api: "Clé Google AI",
    settings_sync: "Synchro Données",

    guide_intro_title: "Bienvenue sur IronTrack Pro",
    guide_intro_text: "IronTrack est votre journal d'entraînement hors ligne. Les données restent sur votre appareil.",
    guide_routines_title: "Création de Programmes",
    guide_routines_text: "Allez dans 'Programmes' pour créer votre fiche. Organisez la semaine en 'Jours' et ajoutez des exercices. Utilisez les 'Modèles' pour sauvegarder des plans réutilisables.",
    guide_workout_title: "Entraînement Actif",
    guide_workout_text: "Depuis l'Accueil, cliquez sur un jour. Pendant l'entraînement, utilisez le minuteur intégré et validez les séries. L'application se souvient des poids précédents.",
    guide_sync_title: "Sauvegarde & Synchro",
    guide_sync_text: "Pour transférer du mobile au PC : Paramètres -> Télécharger Backup. Envoyez le fichier et utilisez 'Fusionner Données' pour synchroniser."
  },
  de: {
    nav_home: "Home",
    nav_routines: "Pläne",
    nav_exercises: "Übungen",
    nav_measurements: "Maße",
    nav_stats: "Statistik",
    nav_history: "Verlauf",
    settings_title: "Einstellungen",
    settings_lang: "Sprache / Language",
    settings_guide_btn: "Benutzerhandbuch",
    settings_guide_title: "Anleitung",
    settings_theme: "Aussehen",
    settings_device: "Gerät",
    settings_api: "Google AI Key",
    settings_sync: "Daten Synchronisierung",

    guide_intro_title: "Willkommen bei IronTrack Pro",
    guide_intro_text: "IronTrack ist dein offline Trainingstagebuch. Deine Daten bleiben auf deinem Gerät.",
    guide_routines_title: "Pläne erstellen",
    guide_routines_text: "Gehe zu 'Pläne', um dein Programm zu erstellen. Organisiere die Woche in 'Tage' (z.B. Push, Pull) und füge Übungen hinzu. Nutze 'Vorlagen' für wiederverwendbare Pläne.",
    guide_workout_title: "Aktives Training",
    guide_workout_text: "Klicke im Home auf einen Tag. Nutze im Training den Timer und hake Sätze ab. Die App merkt sich deine letzten Gewichte (Ghost Sets).",
    guide_sync_title: "Backup & Sync",
    guide_sync_text: "Datenübertragung Handy zu PC: Einstellungen -> Backup laden. Sende die Datei an das andere Gerät und nutze 'Daten zusammenführen'."
  }
};

export const t = (key: string): string => {
  const lang = getLanguage();
  return TRANSLATIONS[lang][key] || key;
};

export const getGuideContent = () => {
    const lang = getLanguage();
    // Helper to get raw strings easily for the custom guide component
    const _t = (k: string) => TRANSLATIONS[lang][k] || k;
    
    return [
        { title: _t('guide_intro_title'), text: _t('guide_intro_text') },
        { title: _t('guide_routines_title'), text: _t('guide_routines_text') },
        { title: _t('guide_workout_title'), text: _t('guide_workout_text') },
        { title: _t('guide_sync_title'), text: _t('guide_sync_text') },
    ];
};
