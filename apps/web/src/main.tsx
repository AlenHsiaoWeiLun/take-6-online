import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SessionProvider } from './state/session';
import { LangProvider } from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LangProvider>
        <ErrorBoundary>
          <SessionProvider>
            <App />
          </SessionProvider>
        </ErrorBoundary>
      </LangProvider>
    </BrowserRouter>
  </StrictMode>,
);
