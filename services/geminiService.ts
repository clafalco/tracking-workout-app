
import { GoogleGenAI } from "@google/genai";

// Helper to handle API key errors and trigger re-selection
const handleAiError = (error: any) => {
    console.error("Gemini API Error:", error);
    const errorMessage = error?.message || "";
    // Se la chiave è stata revocata o il progetto non è trovato, segnaliamo un errore di configurazione
    if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("API_KEY_INVALID")) {
        return "CONFIG_ERROR";
    }
    return "Errore connessione AI. Assicurati che la chiave sia attiva.";
};

// AI features for exercise advice
export const generateExerciseAdvice = async (exerciseName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Fornisci 3 consigli brevi e tecnici per eseguire perfettamente l'esercizio: ${exerciseName}. Rispondi in italiano.`,
    });
    return response.text || "Nessun consiglio disponibile.";
  } catch (error) {
    return handleAiError(error);
  }
};

// AI features for routine suggestions
export const suggestRoutineStructure = async (goal: string, daysPerWeek: number): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Crea una struttura di routine di allenamento (solo i nomi dei giorni e gruppi muscolari, niente esercizi specifici) per l'obiettivo: ${goal}, su ${daysPerWeek} giorni a settimana. Rispondi in italiano e sii conciso.`,
        });
        return response.text || "Impossibile generare suggerimenti.";
    } catch (error) {
        return handleAiError(error);
    }
};

// AI features for workout performance analysis
export const analyzeWorkoutPerformance = async (logs: any[], exercises: any[]): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const recentLogs = logs.slice(-10);
        const muscleDist = recentLogs.reduce((acc: any, log: any) => {
            log.exercises.forEach((le: any) => {
                const ex = exercises.find(e => e.id === le.exerciseId);
                if (ex) acc[ex.muscleGroup] = (acc[ex.muscleGroup] || 0) + 1;
            });
            return acc;
        }, {});

        const prompt = `
            Sei un esperto Head Coach di Bodybuilding e Powerlifting. Analizza i dati degli ultimi 10 allenamenti dell'atleta:
            
            DATI:
            - Numero allenamenti recenti: ${recentLogs.length}
            - Distribuzione gruppi muscolari (frequenza): ${JSON.stringify(muscleDist)}
            - Durata media sessione: ${Math.round(recentLogs.reduce((a, b) => a + b.durationMinutes, 0) / recentLogs.length)} min
            
            Fornisci un'analisi tecnica in italiano (max 120 parole). 
            Commenta il bilanciamento tra i gruppi muscolari (ci sono muscoli trascurati?), la frequenza e dai un consiglio proattivo per la prossima settimana. 
            Sii motivante ma molto tecnico.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 4000 } },
        });
        
        return response.text || "Dati insufficienti per un'analisi di performance.";
    } catch (error) {
        const err = handleAiError(error);
        return err === "CONFIG_ERROR" ? "Errore: Chiave API non valida o progetto non trovato. Ricollegala nelle impostazioni." : err;
    }
};

// New feature: Analyze body measurements
export const analyzeBodyMeasurements = async (profile: any, latest: any, history: any[]): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
            Sei un esperto personal trainer e nutrizionista sportivo. Analizza i seguenti dati antropometrici dell'utente:
            
            PROFILO:
            - Sesso: ${profile.gender === 'M' ? 'Uomo' : 'Donna'}
            - Altezza: ${profile.height} cm
            
            ULTIMA MISURAZIONE:
            - Peso: ${latest.weight} kg
            - Massa Grassa (BF): ${latest.bodyFat || 'non inserita'}%
            
            Fornisci un commento tecnico e motivante in italiano (massimo 100 parole). 
            Commenta il trend e dai un consiglio professionale.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });
        
        return response.text || "Dati insufficienti per un'analisi dettagliata.";
    } catch (error) {
        const err = handleAiError(error);
        return err === "CONFIG_ERROR" ? "Errore: Chiave API non valida. Ricollegala nelle impostazioni." : err;
    }
};

// AI features for image editing in the AI Lab using gemini-2.5-flash-image
export const editImageWithAI = async (base64ImageData: string, prompt: string, mimeType: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
        });
        
        if (response.candidates && response.candidates[0] && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                // Find the image part in the response candidates
                if (part.inlineData) {
                    const base64EncodedString = part.inlineData.data;
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodedString}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Error editing image with AI:", error);
        return null;
    }
};
