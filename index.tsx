import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Impossibile trovare l'elemento root");
}

const root = ReactDOM.createRoot(rootElement);

try {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} catch (err) {
    console.error("Errore durante il rendering:", err);
    rootElement.innerHTML = '<div style="color:red; padding:20px;">Si è verificato un errore imprevisto durante l\'avvio dell\'app. Controlla la console.</div>';
}