import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { prepareServiceWorker } from './lib/pwa';
import '@fontsource/cinzel-decorative/700.css';
import './styles/index.css';

async function bootstrap() {
  try {
    await prepareServiceWorker();
  } catch (error) {
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
