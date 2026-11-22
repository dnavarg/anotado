/**
 * Módulo 0: Motor de Temas (Claro / Oscuro / Automático del Sistema)
 */

let currentThemeMode = 'system'; // 'system' | 'light' | 'dark'
let mediaQuery = null;

/**
 * Resuelve si el tema efectivo actual es oscuro.
 */
export function isDarkActive() {
  if (currentThemeMode === 'dark') return true;
  if (currentThemeMode === 'light') return false;
  return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
}

/**
 * Aplica el tema al documento HTML y actualiza el meta theme-color.
 */
export function applyTheme(mode = currentThemeMode) {
  currentThemeMode = ['system', 'light', 'dark'].includes(mode) ? mode : 'system';
  const effective = isDarkActive() ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', effective);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', effective === 'dark' ? '#090d16' : '#10b981');
  }
}

export function getThemeMode() {
  return currentThemeMode;
}

/**
 * Inicializa la escucha en tiempo real de cambios del sistema operativo.
 */
export function initThemeListener(onSystemChange) {
  if (!window.matchMedia) return;
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (currentThemeMode === 'system') {
      applyTheme('system');
      if (typeof onSystemChange === 'function') onSystemChange();
    }
  };
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
  }
}
