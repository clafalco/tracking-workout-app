
// Gestore Audio per Timer e Suoni di Sistema
// Utilizza OscillatorNode per generare suoni senza dipendenze esterne (mp3/wav)
// Mantiene un singolo AudioContext per compatibilità iOS

let audioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext | null => {
    if (!audioCtx) {
        // Supporto per browser standard e WebKit (iOS)
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) {
            audioCtx = new Ctx();
        }
    }
    return audioCtx;
};

// Funzione da chiamare su interazione utente (click/tap) per sbloccare l'audio su iOS
export const unlockAudioContext = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error("Audio resume failed:", e));
    }
};

export const playTimerSound = (type: 'start' | 'tick' | 'finish' | 'rest_finish' | 'test', volume: number = 1.0) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        // Ensure context is running (retry resume if suspended)
        if (ctx.state === 'suspended') {
             ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        if (type === 'tick') {
            // Beep corto acuto per il conto alla rovescia
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'start' || type === 'test') {
            // Suono di avvio positivo
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(volume * 0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'finish') {
            // Fanfara (Arpeggio Do Maggiore)
            const duration = 0.6;
            
            // Simula arpeggio cambiando frequenza rapidamente
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
            
            // Tono più morbido
            osc.type = 'triangle';
            
            gain.gain.setValueAtTime(volume * 0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + duration);
            
            osc.start(now);
            osc.stop(now + duration);
        } else if (type === 'rest_finish') {
             // Doppio beep per fine riposo
             osc.frequency.setValueAtTime(600, now);
             
             // Inviluppo ampiezza per creare due suoni distinti con un solo oscillatore
             gain.gain.setValueAtTime(volume * 0.4, now);
             gain.gain.setValueAtTime(0, now + 0.1); // Silenzio
             gain.gain.setValueAtTime(volume * 0.4, now + 0.2); // Secondo beep
             gain.gain.linearRampToValueAtTime(0, now + 0.4);
             
             osc.start(now);
             osc.stop(now + 0.4);
        }
    } catch (e) {
        console.error("Error playing sound", e);
    }
};
