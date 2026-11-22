/**
 * Módulo 1: Menú Principal (Home Hub)
 * Interfaz despejada con tarjetas grandes y accesibles para público adulto.
 */

import { getAll, getById, getByIndex } from '../core/db.js';
import { t, getLanguage } from '../core/i18n.js';
import { formatMoney, getDefaultCurrency } from '../core/currency.js';
import { escapeHtml } from '../core/ui.js';

/**
 * Renderiza la pantalla principal en el contenedor dado.
 */
export async function renderHome(container, { navigate }) {
  const [lists, reminders, notes, prefs] = await Promise.all([
    getAll('shopping_lists'),
    getAll('reminders'),
    getAll('notes'),
    getById('settings', 'user_prefs')
  ]);

  const sortedLists = [...lists].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const activeList =
    sortedLists.find((l) => l.id === prefs?.lastOpenedListId && !l.isArchived) ||
    sortedLists.find((l) => !l.isArchived) ||
    sortedLists[0] ||
    null;
  let activeItems = [];
  if (activeList) {
    activeItems = await getByIndex('products', 'listId', activeList.id);
  }

  const listCurrency = activeList?.currency || getDefaultCurrency();
  const listTotal = activeItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const pendingReminders = reminders
    .filter((r) => !r.isCompleted)
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  const nextReminder = pendingReminders[0] || null;

  const locale = getLanguage() === 'en' ? 'en-US' : 'es-CL';
  const nextDateText = nextReminder
    ? new Date(nextReminder.scheduledTime).toLocaleString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  container.innerHTML = `
    <section aria-label="${escapeHtml(t('home.prompt'))}">
      <p style="color: var(--text-muted); font-weight: 700; margin: 0 0 4px;">
        ${escapeHtml(t('home.greeting'))}
      </p>
      <h2 style="font-size: 1.5rem; font-weight: 900; margin: 0 0 16px;">
        ${escapeHtml(t('home.prompt'))}
      </h2>

      <div class="hub-grid">
        <!-- Tarjeta 1: Supermercado -->
        <button type="button" class="hub-card hub-card-featured" data-nav="market">
          <div class="hub-icon hub-icon-green" aria-hidden="true">🛒</div>
          <div style="flex: 1; min-width: 0;">
            <div class="hub-title">
              <span>${escapeHtml(t('home.marketTitle'))}</span>
              ${activeList ? `<span class="badge badge-green">${escapeHtml(t('home.marketActive'))}</span>` : ''}
            </div>
            <p class="hub-desc">${escapeHtml(t('home.marketDesc'))}</p>
            <div class="hub-meta" style="color: var(--primary);">
              ${activeList
                ? `${escapeHtml(activeList.title)} • ${activeItems.length} ${escapeHtml(t('home.itemsOnList'))} • ${escapeHtml(formatMoney(listTotal, listCurrency))}`
                : escapeHtml(t('home.noActiveList'))}
            </div>
          </div>
          <span style="font-size: 1.3rem; opacity: 0.5;" aria-hidden="true">➔</span>
        </button>

        <!-- Tarjeta 2: Recordatorios -->
        <button type="button" class="hub-card" data-nav="reminders">
          <div class="hub-icon hub-icon-blue" aria-hidden="true">⏰</div>
          <div style="flex: 1; min-width: 0;">
            <div class="hub-title">${escapeHtml(t('home.remindersTitle'))}</div>
            <p class="hub-desc">${escapeHtml(t('home.remindersDesc'))}</p>
            <div class="hub-meta" style="color: var(--blue);">
              ${nextReminder
                ? `${escapeHtml(t('home.nextReminder'))} ${escapeHtml(nextReminder.title)} (${escapeHtml(nextDateText)})`
                : escapeHtml(t('home.noReminders'))}
            </div>
          </div>
          <span style="font-size: 1.3rem; opacity: 0.5;" aria-hidden="true">➔</span>
        </button>

        <!-- Tarjeta 3: Notas -->
        <button type="button" class="hub-card" data-nav="notes">
          <div class="hub-icon hub-icon-amber" aria-hidden="true">📝</div>
          <div style="flex: 1; min-width: 0;">
            <div class="hub-title">${escapeHtml(t('home.notesTitle'))}</div>
            <p class="hub-desc">${escapeHtml(t('home.notesDesc'))}</p>
            <div class="hub-meta" style="color: var(--amber);">
              ${notes.length} ${escapeHtml(t('home.savedNotes'))}
            </div>
          </div>
          <span style="font-size: 1.3rem; opacity: 0.5;" aria-hidden="true">➔</span>
        </button>
      </div>

      <div class="card" style="margin-top: 20px; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.4rem;" aria-hidden="true">✓</span>
        <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">
          ${escapeHtml(t('home.adultHint'))}
        </span>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      navigate(target, activeList && target === 'market' ? { listId: activeList.id } : {});
    });
  });
}
