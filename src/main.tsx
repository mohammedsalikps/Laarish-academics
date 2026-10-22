import '@fontsource-variable/nunito';
import '@fontsource-variable/fredoka';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { LocalProgressRepository } from './state/persistence';

const repository = new LocalProgressRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App repository={repository} />
    </BrowserRouter>
  </StrictMode>,
);
