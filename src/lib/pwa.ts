const CACHE_PREFIX = 'mystic-lore-studio-';
const DEVELOPMENT_RELOAD_KEY = 'mystic-lore-studio:development-sw-cleanup';

export async function prepareServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    await clearDevelopmentServiceWorker();
    return;
  }

  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('Mystic Lore Studio service worker registration failed.', error);
    });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

async function clearDevelopmentServiceWorker() {
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX))
        .map((cacheName) => window.caches.delete(cacheName)),
    );
  }

  if (wasControlled && !window.sessionStorage.getItem(DEVELOPMENT_RELOAD_KEY)) {
    window.sessionStorage.setItem(DEVELOPMENT_RELOAD_KEY, 'pending');
    window.location.reload();
    await new Promise<never>(() => undefined);
  }

  window.sessionStorage.removeItem(DEVELOPMENT_RELOAD_KEY);
}
