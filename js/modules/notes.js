/**
 * Módulo 3: Notas Rápidas & Apuntes (Desacoplado de Recordatorios)
 * Soporta texto libre y checklists interactivas, con enlace opcional a un recordatorio.
 */

import { createId, deleteRecord, getAll, putRecord } from '../core/db.js';
import { t } from '../core/i18n.js';
import { closeModal, escapeHtml, openModal } from '../core/ui.js';
import { openReminderModal } from './reminders.js';

let searchTerm = '';

function openNoteModal(note, onSaved) {
  const isEdit = Boolean(note);
  const noteType = note?.type || 'text';
  const contentText = noteType === 'checklist' && Array.isArray(note?.items)
    ? note.items.map((it) => it.text).join('\n')
    : (note?.content || '');

  const html = `
    <form id="note-form">
      <div class="field">
        <label for="note-title">${escapeHtml(t('notes.titleLabel'))}</label>
        <input id="note-title" class="input" type="text" required
          placeholder="${escapeHtml(t('notes.titlePlaceholder'))}"
          value="${escapeHtml(note?.title || '')}" />
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="note-type">${escapeHtml(t('notes.typeLabel'))}</label>
          <select id="note-type" class="select">
            <option value="text" ${noteType === 'text' ? 'selected' : ''}>${escapeHtml(t('notes.typeText'))}</option>
            <option value="checklist" ${noteType === 'checklist' ? 'selected' : ''}>${escapeHtml(t('notes.typeChecklist'))}</option>
          </select>
        </div>

        <div class="field">
          <label for="note-tag">${escapeHtml(t('notes.tagLabel'))}</label>
          <input id="note-tag" class="input" type="text" placeholder="#Personal" value="${escapeHtml(note?.tag || '#Personal')}" />
        </div>
      </div>

      <div class="field">
        <label for="note-content">${escapeHtml(t('notes.contentLabel'))}</label>
        <textarea id="note-content" class="textarea"
          placeholder="${escapeHtml(noteType === 'checklist' ? t('notes.checklistPlaceholder') : t('notes.contentPlaceholder'))}">${escapeHtml(contentText)}</textarea>
      </div>

      <label class="switch-row" style="margin-bottom: 14px;">
        <span style="font-weight: 700;">📌 ${escapeHtml(t('notes.pinNote'))}</span>
        <input id="note-pin" type="checkbox" ${note?.isPinned ? 'checked' : ''} />
      </label>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" class="btn btn-ghost" id="note-cancel">${escapeHtml(t('app.cancel'))}</button>
        <button type="submit" class="btn btn-amber">${escapeHtml(t('app.save'))}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? t('notes.editNote') : t('notes.newNote'), html);

  const typeSelect = document.getElementById('note-type');
  const contentArea = document.getElementById('note-content');
  typeSelect.addEventListener('change', () => {
    contentArea.placeholder = typeSelect.value === 'checklist'
      ? t('notes.checklistPlaceholder')
      : t('notes.contentPlaceholder');
  });

  document.getElementById('note-cancel').addEventListener('click', closeModal);

  document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('note-title').value.trim();
    const type = typeSelect.value;
    const rawContent = contentArea.value;
    const tag = document.getElementById('note-tag').value.trim() || '#General';
    const isPinned = document.getElementById('note-pin').checked;
    if (!title) return;

    let items = [];
    if (type === 'checklist') {
      const existingDone = new Map((note?.items || []).map((it) => [it.text, it.done]));
      items = rawContent
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, done: existingDone.get(text) || false }));
    }

    const record = {
      id: note?.id || createId(),
      title,
      type,
      content: type === 'text' ? rawContent : '',
      items,
      tag: tag.startsWith('#') ? tag : `#${tag}`,
      isPinned,
      linkedReminderId: note?.linkedReminderId || null,
      createdAt: note?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await putRecord('notes', record);
    closeModal();
    onSaved();
  });
}

/**
 * Renderiza la pantalla de Notas Rápidas.
 */
export async function renderNotes(container, { navigate }) {
  const notes = await getAll('notes');
  const query = searchTerm.trim().toLowerCase();

  const filtered = notes
    .filter((n) => {
      if (!query) return true;
      const inTitle = n.title.toLowerCase().includes(query);
      const inContent = (n.content || '').toLowerCase().includes(query);
      const inTag = (n.tag || '').toLowerCase().includes(query);
      return inTitle || inContent || inTag;
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

  container.innerHTML = `
    <section>
      <div class="toolbar">
        <div>
          <h2 style="margin: 0; font-size: 1.4rem; font-weight: 900;">📝 ${escapeHtml(t('notes.title'))}</h2>
          <span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(t('notes.subtitle'))}</span>
        </div>
        <button type="button" id="btn-new-note" class="btn btn-amber">
          + ${escapeHtml(t('notes.newNote'))}
        </button>
      </div>

      <div class="field">
        <input id="notes-search" class="input" type="search"
          placeholder="${escapeHtml(t('app.search'))}"
          value="${escapeHtml(searchTerm)}" />
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📝</div>
          <p style="margin: 0; font-weight: 600;">${escapeHtml(t('notes.empty'))}</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${filtered.map((n) => `
            <article class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="badge badge-amber">${escapeHtml(n.tag || '#General')}</span>
                  ${n.isPinned ? `<span class="badge badge-green">📌</span>` : ''}
                  ${n.linkedReminderId ? `<span class="badge badge-blue">⏰ ${escapeHtml(t('notes.linkedReminder'))}</span>` : ''}
                </div>
                <button type="button" class="btn btn-sm btn-ghost" data-alarm-note="${escapeHtml(n.id)}">
                  🔔 ${escapeHtml(t('notes.createAlarm'))}
                </button>
              </div>

              <h3 style="margin: 10px 0 8px; font-size: 1.1rem; font-weight: 800;">
                ${escapeHtml(n.title)}
              </h3>

              ${n.type === 'checklist' ? `
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                  ${(n.items || []).map((it, idx) => `
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                      <input type="checkbox" ${it.done ? 'checked' : ''}
                        data-check-note="${escapeHtml(n.id)}" data-check-idx="${idx}"
                        style="width: 22px; height: 22px; accent-color: var(--primary);" />
                      <span style="${it.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                        ${escapeHtml(it.text)}
                      </span>
                    </label>
                  `).join('')}
                </div>
              ` : `
                <p style="margin: 0 0 12px; color: var(--text-muted); white-space: pre-wrap;">${escapeHtml(n.content)}</p>
              `}

              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-sm btn-ghost" data-edit-note="${escapeHtml(n.id)}">
                  ✏️ ${escapeHtml(t('app.edit'))}
                </button>
                <button type="button" class="btn btn-sm btn-ghost" data-del-note="${escapeHtml(n.id)}" style="color: var(--danger);">
                  🗑️ ${escapeHtml(t('app.delete'))}
                </button>
              </div>
            </article>
          `).join('')}
        </div>
      `}
    </section>
  `;

  document.getElementById('btn-new-note').addEventListener('click', () => {
    openNoteModal(null, () => renderNotes(container, { navigate }));
  });

  const searchInput = document.getElementById('notes-search');
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderNotes(container, { navigate });
    const restored = document.getElementById('notes-search');
    if (restored) {
      restored.focus();
      restored.setSelectionRange(restored.value.length, restored.value.length);
    }
  });

  container.querySelectorAll('[data-check-note]').forEach((chk) => {
    chk.addEventListener('change', async () => {
      const noteId = chk.getAttribute('data-check-note');
      const idx = Number(chk.getAttribute('data-check-idx'));
      const note = notes.find((n) => n.id === noteId);
      if (!note || !note.items[idx]) return;
      note.items[idx].done = chk.checked;
      note.updatedAt = Date.now();
      await putRecord('notes', note);
      renderNotes(container, { navigate });
    });
  });

  container.querySelectorAll('[data-alarm-note]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const note = notes.find((n) => n.id === btn.getAttribute('data-alarm-note'));
      if (!note) return;
      openReminderModal({
        prefillTitle: note.title,
        linkedNoteId: note.id,
        onSaved: () => navigate('reminders')
      });
    });
  });

  container.querySelectorAll('[data-edit-note]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const note = notes.find((n) => n.id === btn.getAttribute('data-edit-note'));
      if (note) openNoteModal(note, () => renderNotes(container, { navigate }));
    });
  });

  container.querySelectorAll('[data-del-note]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteRecord('notes', btn.getAttribute('data-del-note'));
      renderNotes(container, { navigate });
    });
  });
}
