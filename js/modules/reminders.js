/**
 * Módulo 2: Recordatorios Independientes & Enlace Inteligente a Compras
 * Permite programar alarmas por categoría y crear listas de compras con presupuesto vinculado.
 */

import { createId, deleteRecord, getAll, getById, putRecord } from '../core/db.js';
import { t, getLanguage } from '../core/i18n.js';
import { formatMoney, getDefaultCurrency, parseNumericInput } from '../core/currency.js';
import { closeModal, confirmModal, escapeHtml, openModal, showToast } from '../core/ui.js';

const CATEGORY_META = {
  shopping: { icon: '🛒', badgeClass: 'badge-green' },
  health: { icon: '🏥', badgeClass: 'badge-blue' },
  bills: { icon: '💳', badgeClass: 'badge-amber' },
  general: { icon: '📌', badgeClass: 'badge-blue' }
};

function toLocalDateTimeInput(isoOrMs) {
  const date = isoOrMs ? new Date(isoOrMs) : new Date(Date.now() + 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Abre el modal para crear o editar un recordatorio (con Smart Link para compras).
 */
export async function openReminderModal({ reminder = null, prefillTitle = '', linkedNoteId = null, onSaved } = {}) {
  const isEdit = Boolean(reminder);
  const selectedCat = reminder?.category || 'shopping';
  const defaultBudget = reminder?.linkedBudgetLimit || 40000;

  const html = `
    <form id="reminder-form">
      <div class="field">
        <label for="rem-title">${escapeHtml(t('reminders.titleLabel'))}</label>
        <input id="rem-title" class="input" type="text" required
          placeholder="${escapeHtml(t('reminders.titlePlaceholder'))}"
          value="${escapeHtml(reminder?.title || prefillTitle)}" />
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="rem-datetime">${escapeHtml(t('reminders.dateTimeLabel'))}</label>
          <input id="rem-datetime" class="input" type="datetime-local" required
            value="${escapeHtml(toLocalDateTimeInput(reminder?.scheduledTime))}" />
        </div>

        <div class="field">
          <label for="rem-cat">${escapeHtml(t('reminders.categoryLabel'))}</label>
          <select id="rem-cat" class="select">
            <option value="shopping" ${selectedCat === 'shopping' ? 'selected' : ''}>🛒 ${escapeHtml(t('reminders.categories.shopping'))}</option>
            <option value="health" ${selectedCat === 'health' ? 'selected' : ''}>🏥 ${escapeHtml(t('reminders.categories.health'))}</option>
            <option value="bills" ${selectedCat === 'bills' ? 'selected' : ''}>💳 ${escapeHtml(t('reminders.categories.bills'))}</option>
            <option value="general" ${selectedCat === 'general' ? 'selected' : ''}>📌 ${escapeHtml(t('reminders.categories.general'))}</option>
          </select>
        </div>
      </div>

      <!-- Smart Linking Box (solo si es categoría compras y no tiene lista aún) -->
      <div id="smart-link-section" class="smart-link-box ${selectedCat === 'shopping' && !reminder?.linkedShoppingListId ? '' : 'hidden'}">
        <label class="switch-row">
          <div>
            <div style="font-weight: 800; font-size: 0.95rem;">🛒 ${escapeHtml(t('reminders.smartLinkTitle'))}</div>
            <div style="font-size: 0.8rem; opacity: 0.9; margin-top: 2px;">${escapeHtml(t('reminders.smartLinkHint'))}</div>
          </div>
          <input id="rem-link-list" type="checkbox" checked />
        </label>
        <div id="rem-budget-wrap" class="field" style="margin-top: 12px; margin-bottom: 0;">
          <label for="rem-budget">${escapeHtml(t('market.budgetLabel'))} (${escapeHtml(getDefaultCurrency())})</label>
          <input id="rem-budget" class="input" type="text" inputmode="decimal" value="${escapeHtml(defaultBudget)}" />
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px;">
        <button type="button" class="btn btn-ghost" id="rem-cancel">${escapeHtml(t('app.cancel'))}</button>
        <button type="submit" class="btn btn-blue">${escapeHtml(t('app.save'))}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? t('reminders.editReminder') : t('reminders.newReminder'), html);

  const catSelect = document.getElementById('rem-cat');
  const smartBox = document.getElementById('smart-link-section');
  const linkCheck = document.getElementById('rem-link-list');
  const budgetWrap = document.getElementById('rem-budget-wrap');

  catSelect.addEventListener('change', () => {
    const show = catSelect.value === 'shopping' && !reminder?.linkedShoppingListId;
    smartBox.classList.toggle('hidden', !show);
  });

  linkCheck.addEventListener('change', () => {
    budgetWrap.classList.toggle('hidden', !linkCheck.checked);
  });

  document.getElementById('rem-cancel').addEventListener('click', closeModal);

  document.getElementById('reminder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('rem-title').value.trim();
    const dtVal = document.getElementById('rem-datetime').value;
    const category = catSelect.value;
    if (!title || !dtVal) return;

    const scheduledTime = new Date(dtVal).getTime();
    let linkedShoppingListId = reminder?.linkedShoppingListId || null;

    if (linkedShoppingListId && category !== 'shopping') {
      linkedShoppingListId = null;
    }

    // Si es categoría compras y el usuario activó armar lista
    if (category === 'shopping' && !linkedShoppingListId && linkCheck.checked) {
      const currency = getDefaultCurrency();
      const budgetLimit = parseNumericInput(document.getElementById('rem-budget').value, currency);
      const newList = {
        id: createId(),
        title,
        currency,
        budgetLimit,
        targetDate: scheduledTime,
        isArchived: false,
        createdAt: Date.now()
      };
      await putRecord('shopping_lists', newList);
      linkedShoppingListId = newList.id;
    }

    const record = {
      id: reminder?.id || createId(),
      title,
      scheduledTime,
      category,
      isCompleted: reminder?.isCompleted || false,
      notified: false,
      linkedShoppingListId,
      linkedNoteId: reminder?.linkedNoteId || linkedNoteId || null,
      createdAt: reminder?.createdAt || Date.now()
    };

    await putRecord('reminders', record);

    // Si viene de una nota, guardar enlace inverso opcional en la nota
    if (record.linkedNoteId) {
      const note = await getById('notes', record.linkedNoteId);
      if (note) {
        note.linkedReminderId = record.id;
        await putRecord('notes', note);
      }
    }

    closeModal();
    if (typeof onSaved === 'function') onSaved(record);
  });
}

function formatIcsUtc(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcsText(str) {
  return String(str ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Genera y descarga un evento .ics para que la alarma nativa del celular suene incluso con la app cerrada.
 */
export function exportReminderToIcs(reminder) {
  const start = formatIcsUtc(reminder.scheduledTime);
  const end = formatIcsUtc(reminder.scheduledTime + 30 * 60 * 1000);
  const stamp = formatIcsUtc(Date.now());
  const desc = reminder.linkedShoppingListId
    ? `${t('reminders.linkedBadge')} - Anotado`
    : `${t('reminders.categories.' + reminder.category)} - Anotado`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anotado//PWA//ES',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@anotado`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(reminder.title)}`,
    `DESCRIPTION:${escapeIcsText(desc)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(reminder.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `anotado-${reminder.id.slice(0, 8)}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(t('reminders.calendarExported'));
}

/**
 * Renderiza la vista de Recordatorios.
 */
export async function renderReminders(container, { navigate }) {
  const [reminders, lists] = await Promise.all([
    getAll('reminders'),
    getAll('shopping_lists')
  ]);

  const listMap = new Map(lists.map((l) => [l.id, l]));
  const sorted = [...reminders].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.scheduledTime - b.scheduledTime;
  });

  const locale = getLanguage() === 'en' ? 'en-US' : 'es-CL';

  container.innerHTML = `
    <section>
      <div class="toolbar">
        <div>
          <h2 style="margin: 0; font-size: 1.4rem; font-weight: 900;">⏰ ${escapeHtml(t('reminders.title'))}</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(t('reminders.subtitle'))}</span>
        </div>
        <button type="button" id="btn-new-reminder" class="btn btn-blue">
          + ${escapeHtml(t('reminders.newReminder'))}
        </button>
      </div>

      <div class="card" style="margin-bottom: 14px; background-color: var(--blue-soft); color: var(--blue-soft-text); border-color: var(--blue); font-size: 0.88rem; font-weight: 600;">
        ℹ️ ${escapeHtml(t('reminders.openAppNotice'))}
      </div>

      ${sorted.length === 0 ? `
        <div class="empty-state">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">⏰</div>
          <p style="margin: 0; font-weight: 600;">${escapeHtml(t('reminders.empty'))}</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${sorted.map((r) => {
            const meta = CATEGORY_META[r.category] || CATEGORY_META.general;
            const linkedList = r.linkedShoppingListId ? listMap.get(r.linkedShoppingListId) : null;
            const dateStr = new Date(r.scheduledTime).toLocaleString(locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });

            return `
              <article class="card" style="${r.isCompleted ? 'opacity: 0.6;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span class="badge ${meta.badgeClass}">${meta.icon} ${escapeHtml(t('reminders.categories.' + r.category))}</span>
                  <span style="font-size: 0.85rem; font-weight: 700; color: var(--blue);">⏰ ${escapeHtml(dateStr)}</span>
                </div>

                <h3 style="margin: 10px 0 8px; font-size: 1.1rem; font-weight: 800; ${r.isCompleted ? 'text-decoration: line-through;' : ''}">
                  ${escapeHtml(r.title)}
                </h3>

                ${linkedList ? `
                  <div style="padding: 10px 12px; border-radius: 12px; background-color: var(--primary-soft); color: var(--primary-soft-text); display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.85rem;">🛒 ${escapeHtml(t('reminders.linkedBadge'))}</div>
                      <div style="font-size: 0.8rem;">
                        ${escapeHtml(t('market.budgetLabel'))}: <strong>${escapeHtml(linkedList.budgetLimit > 0 ? formatMoney(linkedList.budgetLimit, linkedList.currency) : t('market.noBudget'))}</strong>
                      </div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary" data-open-list="${escapeHtml(linkedList.id)}">
                      ${escapeHtml(t('reminders.openLinkedList'))} ➔
                    </button>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-sm btn-ghost" data-toggle-done="${escapeHtml(r.id)}">
                    ${r.isCompleted ? '↩️' : '✓'} ${escapeHtml(r.isCompleted ? t('reminders.completed') : t('reminders.markDone'))}
                  </button>
                  <button type="button" class="btn btn-sm btn-ghost" data-ics-rem="${escapeHtml(r.id)}">
                    📅 ${escapeHtml(t('reminders.exportCalendar'))}
                  </button>
                  <button type="button" class="btn btn-sm btn-ghost" data-edit-rem="${escapeHtml(r.id)}">
                    ✏️ ${escapeHtml(t('app.edit'))}
                  </button>
                  <button type="button" class="btn btn-sm btn-ghost" data-del-rem="${escapeHtml(r.id)}" style="color: var(--danger);">
                    🗑️ ${escapeHtml(t('app.delete'))}
                  </button>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `}
    </section>
  `;

  document.getElementById('btn-new-reminder').addEventListener('click', () => {
    openReminderModal({
      onSaved: () => renderReminders(container, { navigate })
    });
  });

  container.querySelectorAll('[data-open-list]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate('market', { listId: btn.getAttribute('data-open-list') });
    });
  });

  container.querySelectorAll('[data-toggle-done]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-toggle-done');
      const item = reminders.find((r) => r.id === id);
      if (!item) return;
      item.isCompleted = !item.isCompleted;
      await putRecord('reminders', item);
      renderReminders(container, { navigate });
    });
  });

  container.querySelectorAll('[data-edit-rem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-rem');
      const item = reminders.find((r) => r.id === id);
      if (!item) return;
      openReminderModal({
        reminder: item,
        onSaved: () => renderReminders(container, { navigate })
      });
    });
  });

  container.querySelectorAll('[data-ics-rem]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = reminders.find((r) => r.id === btn.getAttribute('data-ics-rem'));
      if (item) exportReminderToIcs(item);
    });
  });

  container.querySelectorAll('[data-del-rem]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del-rem');
      const confirmed = await confirmModal({
        title: t('app.delete'),
        message: t('reminders.confirmDeleteMessage'),
        confirmLabel: t('app.delete'),
        cancelLabel: t('app.cancel')
      });
      if (!confirmed) return;
      const item = reminders.find((r) => r.id === id);
      if (item?.linkedNoteId) {
        const note = await getById('notes', item.linkedNoteId);
        if (note && note.linkedReminderId === id) {
          note.linkedReminderId = null;
          await putRecord('notes', note);
        }
      }
      await deleteRecord('reminders', id);
      renderReminders(container, { navigate });
    });
  });
}

/**
 * Revisa recordatorios vencidos y dispara notificación local vía Service Worker (compatible con Android Chrome).
 */
export async function checkDueReminders(onOpenLinkedList) {
  const reminders = await getAll('reminders');
  const now = Date.now();

  for (const r of reminders) {
    if (!r.isCompleted && !r.notified && r.scheduledTime <= now) {
      r.notified = true;
      await putRecord('reminders', r);

      showToast(`⏰ ${t('reminders.dueAlertTitle')}: ${r.title}`, 5000);

      if ('Notification' in window && Notification.permission === 'granted') {
        const bodyText = r.linkedShoppingListId ? t('reminders.linkedBadge') : t('reminders.categories.' + r.category);
        const notifOptions = {
          body: bodyText,
          icon: './assets/icon.svg',
          data: { listId: r.linkedShoppingListId || null }
        };

        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            if (reg && typeof reg.showNotification === 'function') {
              await reg.showNotification(`Anotado: ${r.title}`, notifOptions);
              continue;
            }
          }
          const notif = new Notification(`Anotado: ${r.title}`, notifOptions);
          notif.onclick = () => {
            window.focus();
            if (r.linkedShoppingListId && typeof onOpenLinkedList === 'function') {
              onOpenLinkedList(r.linkedShoppingListId);
            }
          };
        } catch {
          // El toast en pantalla ya fue mostrado como respaldo
        }
      }
    }
  }
}
