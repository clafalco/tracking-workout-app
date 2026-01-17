
// Gestore Audio per Timer e Suoni di Sistema
// Ottimizzato per iOS/WebKit e Bluefy

let audioCtx: AudioContext | null = null;
let isUnlockAttempted = false;

// Inizializza il contesto audio in modo pigro (lazy) o lo recupera se esiste
export const getAudioContext = (): AudioContext | null => {
    if (!audioCtx) {
        try {
            // Supporto per browser standard e WebKit (iOS)
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (Ctx) {
                audioCtx = new Ctx();
            }
        } catch (e) {
            console.error("AudioContext non supportato o errore creazione:", e);
        }
    }
    return audioCtx;
};

// Restituisce lo stato attuale per il debug
export const getAudioState = (): string => {
    return audioCtx ? audioCtx.state : 'non-inizializzato';
};

// Funzione CRITICA per iOS: Va chiamata durante un evento utente (click/touch/touchstart)
export const unlockAudioContext = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Se è già running, proviamo comunque a tenerlo sveglio se chiamato esplicitamente,
    // ma evitiamo logica pesante se non necessaria.
    if (ctx.state === 'running' && isUnlockAttempted) return;

    // 1. Forza il resume
    // Su iOS questo DEVE accadere dentro lo stack dell'evento tattile
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
        ctx.resume().then(() => {
            console.log("AudioContext riattivato (resume).");
        }).catch(e => console.error("Errore resume audio:", e));
    }

    // 2. Riproduci buffer silenzioso (iOS Hack: warm-up engine)
    // Creiamo una sorgente effimera. Questo dice a iOS "ehi, stiamo suonando qualcosa!"
    try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        // Start immediato
        source.start(0);
        
        isUnlockAttempted = true;
    } catch (e) {
        console.error("Errore unlock buffer:", e);
    }
};

export const playTimerSound = (type: 'start' | 'tick' | 'finish' | 'rest_finish' | 'test', volume: number = 1.0) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Tentativo di ripristino last-minute se iOS ha sospeso l'audio
        if (ctx.state === 'suspended') {
             ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        // CONFIGURAZIONE SUONI
        if (type === 'tick') {
            // Beep corto acuto (Countdown)
            // Frequenza alta ma breve per essere udibile in palestra
            osc.frequency.setValueAtTime(880, now); 
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.1);
            
        } else if (type === 'start' || type === 'test') {
            // Suono di avvio (Salita)
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            
            gain.gain.setValueAtTime(volume * 0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
            
        } else if (type === 'finish') {
            // Fine Set (Fanfara Semplice)
            osc.type = 'triangle'; // Suono più "pieno"
            
            // Nota 1
            osc.frequency.setValueAtTime(523.25, now); // Do
            // Nota 2
            osc.frequency.setValueAtTime(659.25, now + 0.15); // Mi
            // Nota 3
            osc.frequency.setValueAtTime(783.99, now + 0.3); // Sol
            
            gain.gain.setValueAtTime(volume * 0.5, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.8);
            
            osc.start(now);
            osc.stop(now + 0.8);
            
        } else if (type === 'rest_finish') {
             // Fine Riposo (Doppio Beep aggressivo per attirare attenzione)
             osc.type = 'square'; // Suono aspro per svegliare
             
             // Beep 1
             osc.frequency.setValueAtTime(600, now);
             gain.gain.setValueAtTime(volume * 0.3, now);
             gain.gain.setValueAtTime(0, now + 0.15);
             
             // Beep 2
             gain.gain.setValueAtTime(volume * 0.3, now + 0.25);
             gain.gain.linearRampToValueAtTime(0, now + 0.4);
             
             osc.start(now);
             osc.stop(now + 0.5);
        }
    } catch (e) {
        console.error("Error playing sound", e);
    }
};
