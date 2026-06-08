import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StudioDataProvider } from './hooks/useStudioData';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudioDataProvider>
      <App />
    </StudioDataProvider>
  </StrictMode>,
);
