import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente dalla cartella corrente
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    // Importante per hosting condivisi/gratuiti: usa percorsi relativi per i file
    base: './', 
    define: {
      // Inietta la chiave API come stringa. Se manca, usa stringa vuota per non rompere l'app.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});