
import React, { useState, useRef } from 'react';
import { Sparkles, Upload, Wand2, RefreshCw, X, Download, ImageIcon, Camera, Trash2 } from 'lucide-react';
import { editImageWithAI } from '../services/geminiService';

const AILab: React.FC = () => {
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [sourceMimeType, setSourceMimeType] = useState<string>('image/jpeg');
    const [prompt, setPrompt] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setSourceImage(base64);
            setSourceMimeType(file.type);
            setResultImage(null);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleEdit = async () => {
        if (!sourceImage || !prompt) return;

        setIsLoading(true);
        setError(null);
        try {
            // Remove data:image/...;base64, prefix for the API call
            const base64Data = sourceImage.split(',')[1];
            const result = await editImageWithAI(base64Data, prompt, sourceMimeType);
            
            if (result) {
                setResultImage(result);
            } else {
                setError("Il modello non ha restituito un'immagine modificata. Prova a cambiare il prompt.");
            }
        } catch (err) {
            setError("Si è verificato un errore durante l'elaborazione. Riprova più tardi.");
        } finally {
            setIsLoading(false);
        }
    };

    const suggestions = [
        "Aggiungi un filtro retro anni '80",
        "Migliora l'illuminazione e rendila cinematografica",
        "Rendi lo sfondo sfocato (effetto bokeh)",
        "Converti in bianco e nero drammatico",
        "Aggiungi un effetto neon",
        "Rimuovi le persone sullo sfondo"
    ];

    const reset = () => {
        setSourceImage(null);
        setResultImage(null);
        setPrompt('');
        setError(null);
    };

    return (
        <div className="p-4 pb-24 min-h-screen">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-primary" /> AI Progress Studio
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Powered by Nano Banana</p>
                </div>
            </header>

            {!sourceImage ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 bg-surface/50 rounded-[2.5rem] p-12 text-center cursor-pointer hover:border-primary/50 transition-all group flex flex-col items-center justify-center gap-4"
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                        <Camera size={32} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg">Carica la tua foto</p>
                        <p className="text-gray-500 text-sm mt-1">Scatta un selfie o seleziona dalla galleria</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Visualizzazione Immagine */}
                    <div className="relative group rounded-3xl overflow-hidden border border-slate-700 shadow-2xl bg-black aspect-[3/4] flex items-center justify-center">
                        <img 
                            src={resultImage || sourceImage} 
                            alt="Progress" 
                            className="w-full h-full object-contain"
                        />
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                                <RefreshCw className="text-primary animate-spin mb-4" size={48} />
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Magia in corso...</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase mt-2">Gemini sta elaborando i tuoi progressi</p>
                            </div>
                        )}
                        {!isLoading && !resultImage && (
                            <button onClick={reset} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={20} />
                            </button>
                        )}
                        {resultImage && !isLoading && (
                            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                                <button onClick={() => setResultImage(null)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl text-xs font-black uppercase border border-slate-700">Originale</button>
                                <a href={resultImage} download="ai_progress.png" className="flex-1 bg-primary text-white py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2"><Download size={14}/> Scarica</a>
                            </div>
                        )}
                    </div>

                    {/* Editor Controls */}
                    <div className="bg-surface p-6 rounded-[2rem] border border-slate-700 shadow-xl space-y-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-black mb-2 px-1 tracking-widest">Cosa vuoi cambiare?</label>
                            <div className="relative">
                                <textarea 
                                    className="w-full bg-dark border border-slate-600 p-4 pr-12 rounded-2xl text-white font-bold outline-none focus:border-primary text-sm resize-none h-24"
                                    placeholder="Es. Aggiungi un filtro retro anni '80..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <button 
                                    onClick={handleEdit}
                                    disabled={isLoading || !prompt}
                                    className="absolute right-3 bottom-3 p-3 bg-primary text-white rounded-xl shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                                >
                                    <Wand2 size={20} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-2 px-1 tracking-widest">Suggerimenti rapidi</p>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((s, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setPrompt(s)}
                                        className="px-3 py-1.5 bg-dark border border-slate-700 rounded-full text-[10px] font-bold text-gray-300 hover:border-primary hover:text-primary transition-all"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-2">
                            <X size={16} /> {error}
                        </div>
                    )}
                    
                    {resultImage && (
                        <button onClick={reset} className="w-full py-4 text-gray-500 text-xs font-black uppercase tracking-widest">Carica un'altra foto</button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AILab;
