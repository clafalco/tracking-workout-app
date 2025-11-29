
import { GoogleGenAI } from "@google/genai";

// Funzione helper per ottenere la chiave (prima storage utente, poi env build)
const getApiKey = (): string => {
    const userKey = localStorage.getItem('iron_track_api_key');
    if (userKey && userKey.length > 10) {
        return userKey;
    }
    // Fallback alla chiave della build se esiste
    return process.env.API_KEY || "";
};

export const generateExerciseAdvice = async (exerciseName: string): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
      return "Chiave API mancante. Vai nelle Impostazioni e inserisci la tua Google AI Key.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: `Fornisci 3 consigli brevi e tecnici per eseguire perfettamente l'esercizio: ${exerciseName}. Rispondi in italiano.`,
    });
    return response.text || "Nessun consiglio disponibile.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Errore connessione AI. Controlla la chiave nelle impostazioni.";
  }
};

export const suggestRoutineStructure = async (goal: string, daysPerWeek: number): Promise<string> => {
    const apiKey = getApiKey();

    if (!apiKey) {
        return "Chiave API mancante. Inseriscila nelle Impostazioni per usare questa funzione.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: `Crea una struttura di routine di allenamento (solo i nomi dei giorni e gruppi muscolari, niente esercizi specifici) per l'obiettivo: ${goal}, su ${daysPerWeek} giorni a settimana. Rispondi in italiano e sii conciso.`,
        });
        return response.text || "Impossibile generare suggerimenti.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Errore AI. Verifica la tua chiave API nelle impostazioni.";
    }
}
