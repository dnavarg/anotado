/**
 * Orquestador Principal de Anotado (PWA)
 * Coordina el router, estado de configuración, menú de navegación y Service Worker.
 */

import { getById, putRecord } from './core/db.js';
import { detectBrowserLanguage, getLanguage, setLanguage, t } from './core/i18n.js';
import { CURRENCIES, getDefaultCurrency, setDefaultCurrency } from './core/currency.js';
import { applyTheme, getThemeMode, initThemeListener, isDarkActive } from './core/theme.js';
import { closeModal, escapeHtml, openModal, showToast } from './core/ui.js';
import { renderHome } from './modules/home.js';
import { checkDueReminders, renderReminders } from './modules/reminders.js';
import { renderNotes } from './modules/notes.js';
import { renderMarket } from './modules/market.js';

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

function renderTopbar() {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  const showBack = currentRoute !== 'home';

  topbar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
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
      <span class="badge badge-green" style="font-family: monospace;">${escapeHtml(getDefaultCurrency())}</span>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
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

  document.getElementById('top-theme-btn').addEventListener('click', async () => {
    const next = isDarkActive() ? 'light' : 'dark';
    applyTheme(next);
    await saveSettings({ themeMode: next });
    renderShell();
  });

  document.getElementById('top-settings-btn').addEventListener('click', openSettingsModal);
}

function renderShell() {
  renderSidebar();
  renderTopbar();
}

export async function navigate(route, params = {}) {
  currentRoute = route;
  currentParams = params;
  await renderApp();
}

async function renderApp() {
  renderShell();
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

async function init() {
  await loadSettings();
  initThemeListener(() => renderShell());
  await renderApp();

  // Registro del Service Worker para funcionamiento 100% offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Verificación periódica de recordatorios vencidos
  const openLinked = (listId) => navigate('market', { listId });
  checkDueReminders(openLinked);
  setInterval(() => checkDueReminders(openLinked), 30000);
}

init();
