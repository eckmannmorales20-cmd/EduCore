import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './lib/ThemeContext';

console.log('Main.tsx is executing');
console.log('ENV:', import.meta.env);
console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL);

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StrictMode>,
    );
    console.log('React render called successfully');

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
  } catch (error) {
    console.error('Error during React render:', error);
    rootElement.innerHTML = '<div style="padding: 20px; color: red;"><h1>Runtime Error</h1><pre>' + String(error) + '</pre></div>';
  }
}

