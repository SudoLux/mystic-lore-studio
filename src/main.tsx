import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { prepareServiceWorker } from './lib/pwa';
import { recordClientEvent } from './lib/observability';
import '@fontsource/cinzel-decorative/700.css';
import './styles/index.css';

async function bootstrap() {
  window.addEventListener('error', () => recordClientEvent({ context: { boundary: 'window_error' }, kind: 'client_error' }));
  window.addEventListener('unhandledrejection', () => recordClientEvent({ context: { boundary: 'unhandled_rejection' }, kind: 'client_error' }));
  try {
    await prepareServiceWorker();
  } catch (error) {
    recordClientEvent({ context: { stage: 'service_worker' }, kind: 'client_error' });
    console.warn('Mystic Lore Studio service worker preparation failed.', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

void bootstrap();
