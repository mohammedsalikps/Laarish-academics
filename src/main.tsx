import '@fontsource-variable/nunito';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/manrope';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppCrashScreen } from './components/ui/ErrorFallbacks';
import { LocalProgressRepository } from './state/persistence';

const repository = new LocalProgressRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={() => <AppCrashScreen />}>
      <BrowserRouter>
        <App repository={repository} />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
