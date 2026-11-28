/**
 * Orquestador Principal de Anotado (PWA)
 * Coordina el router, estado de configuración, menú de navegación y Service Worker.
 */

import { exportAllData, getAll, getById, importAllData, putRecord } from './core/db.js';
import { detectBrowserLanguage, getLanguage, setLanguage, t } from './core/i18n.js';
import { CURRENCIES, getDefaultCurrency, setDefaultCurrency } from './core/currency.js';
import { applyTheme, getThemeMode, initThemeListener, isDarkActive } from './core/theme.js';
import { closeModal, confirmModal, escapeHtml, openModal, showToast } from './core/ui.js';
import { renderHome } from './modules/home.js';
import { checkDueReminders, renderReminders } from './modules/reminders.js';
import { renderNotes } from './modules/notes.js';
import { decodeSharePayload, importShoppingList, renderMarket } from './modules/market.js';

let currentRoute = 'home';
let currentParams = {};

async function loadSettings() {
  const saved = await getById('settings', 'user_prefs');
  const lang = saved?.language || detectBrowserLanguage();
  const theme = saved?.themeMode || 'system';
  const currency = saved?.defaultCurrency || 'CLP';

  setLanguage(lang);
  setDefaultCurrency(currency);
  applyTheme(theme);
}

async function saveSettings(partial) {
  const existing = (await getById('settings', 'user_prefs')) || { id: 'user_prefs' };
  const updated = { ...existing, ...partial, id: 'user_prefs' };
  await putRecord('settings', updated);
}

function openSettingsModal() {
  const notifState = 'Notification' in window ? Notification.permission : 'denied';
  const lang = getLanguage();
  const curr = getDefaultCurrency();
  const theme = getThemeMode();

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  const html = `
    <div class="field">
      <label for="set-theme">${escapeHtml(t('settings.themeLabel'))}</label>
      <select id="set-theme" class="select">
        <option value="system" ${theme === 'system' ? 'selected' : ''}>💻 ${escapeHtml(t('settings.themeSystem'))}</option>
        <option value="light" ${theme === 'light' ? 'selected' : ''}>☀️ ${escapeHtml(t('settings.themeLight'))}</option>
        <option value="dark" ${theme === 'dark' ? 'selected' : ''}>🌙 ${escapeHtml(t('settings.themeDark'))}</option>
      </select>
    </div>

    <div class="grid-2">
      <div class="field">
        <label for="set-lang">${escapeHtml(t('settings.languageLabel'))}</label>
        <select id="set-lang" class="select">
          <option value="es" ${lang === 'es' ? 'selected' : ''}>Español</option>
          <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>

      <div class="field">
        <label for="set-curr">${escapeHtml(t('settings.currencyLabel'))}</label>
        <select id="set-curr" class="select">
          ${Object.values(CURRENCIES).map((c) => `
            <option value="${c.code}" ${c.code === curr ? 'selected' : ''}>${c.code} (${c.symbol})</option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="field">
      <label>${escapeHtml(t('settings.notificationsLabel'))}</label>
      ${notifState === 'granted' ? `
        <div class="badge badge-green" style="padding: 10px 14px; font-size: 0.85rem;">
          ✓ ${escapeHtml(t('settings.notificationsGranted'))}
        </div>
      ` : `
        <button type="button" id="btn-req-notif" class="btn btn-blue">
          🔔 ${escapeHtml(t('settings.notificationsBtn'))}
        </button>
      `}
    </div>

    <div class="field">
      <label>${escapeHtml(t('settings.backupLabel'))}</label>
      <div class="grid-2">
        <button type="button" id="btn-export-backup" class="btn btn-sm btn-ghost">
          📤 ${escapeHtml(t('settings.exportBackup'))}
        </button>
        <button type="button" id="btn-import-backup" class="btn btn-sm btn-ghost">
          📥 ${escapeHtml(t('settings.importBackup'))}
        </button>
        <input id="input-import-file" type="file" accept="application/json" class="hidden" />
      </div>
    </div>

    ${isIos && !isStandalone ? `
      <div class="card" style="background-color: var(--amber-soft); color: var(--amber-soft-text); border-color: var(--amber); font-size: 0.85rem; font-weight: 600; margin-bottom: 12px;">
        📱 ${escapeHtml(t('settings.iosTip'))}
      </div>
    ` : ''}

    <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
      <button type="button" id="set-done" class="btn btn-primary">${escapeHtml(t('app.close'))}</button>
    </div>
  `;

  openModal(t('settings.title'), html);

  document.getElementById('set-theme').addEventListener('change', async (e) => {
    applyTheme(e.target.value);
    await saveSettings({ themeMode: e.target.value });
    renderShell();
  });

  document.getElementById('set-lang').addEventListener('change', async (e) => {
    setLanguage(e.target.value);
    await saveSettings({ language: e.target.value });
    closeModal();
    renderApp();
  });

  document.getElementById('set-curr').addEventListener('change', async (e) => {
    setDefaultCurrency(e.target.value);
    await saveSettings({ defaultCurrency: e.target.value });
    renderApp();
  });

  const notifBtn = document.getElementById('btn-req-notif');
  if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          showToast(t('settings.notificationsGranted'));
          closeModal();
        } else {
          showToast(t('settings.notificationsDenied'));
        }
      }
    });
  }

  document.getElementById('btn-export-backup').addEventListener('click', async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anotado-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(t('settings.backupExported'));
  });

  const importInput = document.getElementById('input-import-file');
  document.getElementById('btn-import-backup').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      await importAllData(parsed);
      showToast(t('settings.backupImported'));
      closeModal();
      await loadSettings();
      await renderApp();
    } catch {
      showToast(t('settings.backupError'));
    }
  });

  document.getElementById('set-done').addEventListener('click', closeModal);
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const items = [
    { key: 'home', emoji: '🏠', label: t('app.backToMenu') },
    { key: 'market', emoji: '🛒', label: t('home.marketTitle') },
    { key: 'reminders', emoji: '⏰', label: t('home.remindersTitle') },
    { key: 'notes', emoji: '📝', label: t('home.notesTitle') }
  ];

  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-icon" aria-hidden="true">✓</div>
      <div>
        <h1 class="brand-title">${escapeHtml(t('app.name'))}</h1>
        <span class="brand-sub">${escapeHtml(t('app.tagline'))}</span>
      </div>
    </div>

    <nav class="nav-list">
      ${items.map((it) => `
        <button type="button" class="nav-item ${currentRoute === it.key ? 'active' : ''}" data-side-nav="${it.key}">
          <span class="nav-emoji" aria-hidden="true">${it.emoji}</span>
          <span>${escapeHtml(it.label)}</span>
        </button>
      `).join('')}
    </nav>

    <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
      <button type="button" id="side-settings-btn" class="btn btn-ghost" style="width: 100%; justify-content: flex-start;">
        ⚙️ ${escapeHtml(t('app.settings'))}
      </button>
      <div class="badge badge-green" style="justify-content: center; padding: 6px;">
        ✓ ${escapeHtml(t('app.offlineBadge'))}
      </div>
    </div>
  `;

  sidebar.querySelectorAll('[data-side-nav]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-side-nav')));
  });
  document.getElementById('side-settings-btn').addEventListener('click', openSettingsModal);
}

async function renderTopbar() {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  const showBack = currentRoute !== 'home';
  const showListSelector = currentRoute === 'market' && Boolean(currentParams?.listId);

  let lists = [];
  if (showListSelector) {
    lists = await getAll('shopping_lists');
    lists.sort((a, b) => {
      if (Boolean(a.isArchived) !== Boolean(b.isArchived)) return a.isArchived ? 1 : -1;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
  }

  topbar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
      ${showBack ? `
        <button type="button" id="top-back-btn" class="btn btn-sm btn-ghost mobile-only">
          ◀ ${escapeHtml(t('app.backToMenu'))}
        </button>
      ` : `
        <div class="brand mobile-only">
          <div class="brand-icon" aria-hidden="true">✓</div>
          <div>
            <h1 class="brand-title">${escapeHtml(t('app.name'))}</h1>
            <span class="brand-sub">${escapeHtml(t('app.tagline'))}</span>
          </div>
        </div>
      `}
    </div>

    <div class="topbar-center">
      ${showListSelector && lists.length > 0 ? `
        <select id="topbar-list-select" class="topbar-select" aria-label="${escapeHtml(t('market.title'))}">
          ${lists.map((l) => `
            <option value="${escapeHtml(l.id)}" ${l.id === currentParams.listId ? 'selected' : ''}>
              ${l.isArchived ? '📦' : '🛒'} ${escapeHtml(l.title)}
            </option>
          `).join('')}
        </select>
      ` : ''}
    </div>

    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
      <button type="button" id="top-theme-btn" class="btn-icon" aria-label="${escapeHtml(t('settings.themeLabel'))}">
        ${isDarkActive() ? '☀️' : '🌙'}
      </button>
      <button type="button" id="top-settings-btn" class="btn-icon" aria-label="${escapeHtml(t('app.settings'))}">
        ⚙️
      </button>
    </div>
  `;

  const backBtn = document.getElementById('top-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => navigate('home'));

  const listSelect = document.getElementById('topbar-list-select');
  if (listSelect) {
    listSelect.addEventListener('change', (e) => {
      navigate('market', { listId: e.target.value });
    });
  }

  document.getElementById('top-theme-btn').addEventListener('click', async () => {
    const next = isDarkActive() ? 'light' : 'dark';
    applyTheme(next);
    await saveSettings({ themeMode: next });
    renderShell();
  });

  document.getElementById('top-settings-btn').addEventListener('click', openSettingsModal);
}

async function renderShell() {
  renderSidebar();
  await renderTopbar();
}

export async function navigate(route, params = {}) {
  currentRoute = route;
  currentParams = params;
  await renderApp();
}

async function renderApp() {
  await renderShell();
  const content = document.getElementById('content');
  const stickyBar = document.getElementById('sticky-bar');
  stickyBar.classList.add('hidden');
  stickyBar.innerHTML = '';

  const context = { navigate, params: currentParams };

  if (currentRoute === 'market') {
    await renderMarket(content, stickyBar, context);
  } else if (currentRoute === 'reminders') {
    await renderReminders(content, context);
  } else if (currentRoute === 'notes') {
    await renderNotes(content, context);
  } else {
    await renderHome(content, context);
  }
}

function parseHashRoute() {
  const hash = window.location.hash || '';
  const marketMatch = hash.match(/^#market\/([a-zA-Z0-9-]+)$/);
  if (marketMatch) {
    return { route: 'market', params: { listId: marketMatch[1] } };
  }
  const importMatch = hash.match(/^#import\/([A-Za-z0-9\-_]+)$/);
  if (importMatch) {
    return { route: 'import_list', params: { token: importMatch[1] } };
  }
  return null;
}

async function handleImportToken(token) {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  try {
    const parsed = decodeSharePayload(token);
    const confirmed = await confirmModal({
      title: t('market.importConfirmTitle'),
      message: `${t('market.importConfirmMsg')} "${parsed.list.title}" (${parsed.items.length} ${t('home.itemsOnList')})`,
      confirmLabel: t('market.importBtn'),
      cancelLabel: t('app.cancel'),
      danger: false
    });
    if (confirmed) {
      const created = await importShoppingList(parsed);
      showToast(t('market.importSuccessToast'));
      await navigate('market', { listId: created.id });
      return;
    }
  } catch {
    showToast(t('market.importErrorToast'));
  }
  await navigate('market');
}

function initStickyBarObserver() {
  const stickyBar = document.getElementById('sticky-bar');
  const content = document.getElementById('content');
  if (!stickyBar || !content || typeof ResizeObserver === 'undefined') return;

  const observer = new ResizeObserver(() => {
    if (stickyBar.classList.contains('hidden')) {
      content.style.paddingBottom = '';
    } else {
      content.style.paddingBottom = `${stickyBar.offsetHeight + 28}px`;
    }
  });
  observer.observe(stickyBar);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OPEN_LIST' && event.data.listId) {
      navigate('market', { listId: event.data.listId });
    }
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const promptUpdate = (worker) => {
    if (!worker) return;
    showToast(t('app.updateAvailable'), {
      durationMs: 0,
      actionLabel: t('app.updateNow'),
      onAction: () => worker.postMessage({ type: 'SKIP_WAITING' })
    });
  };

  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    if (reg.waiting) {
      promptUpdate(reg.waiting);
    }
    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        if (next.state === 'installed' && navigator.serviceWorker.controller) {
          promptUpdate(next);
        }
      });
    });
  } catch {
    // Registro SW omitido en contextos no seguros
  }
}

async function init() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  await loadSettings();
  initThemeListener(() => renderShell());
  initStickyBarObserver();

  const initialHash = parseHashRoute();
  if (initialHash && initialHash.route !== 'import_list') {
    currentRoute = initialHash.route;
    currentParams = initialHash.params;
  }

  window.addEventListener('hashchange', () => {
    const next = parseHashRoute();
    if (!next) return;
    if (next.route === 'import_list') {
      handleImportToken(next.params.token);
    } else {
      navigate(next.route, next.params);
    }
  });

  await renderApp();
  registerServiceWorker();

  if (initialHash && initialHash.route === 'import_list') {
    handleImportToken(initialHash.params.token);
  }

  // Verificación periódica de recordatorios vencidos
  const openLinked = (listId) => navigate('market', { listId });
  checkDueReminders(openLinked);
  setInterval(() => checkDueReminders(openLinked), 30000);
}

init();
