/**
 * Utilidades compartidas de interfaz (escapado XSS, modales accesibles, confirmación y notificaciones toast).
 */

let lastFocusedElement = null;
let activeEscHandler = null;

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Muestra un toast temporal con soporte opcional de botón de acción (ej: Deshacer / Actualizar).
 * @param {string} message
 * @param {number|{durationMs?: number, actionLabel?: string, onAction?: Function}} [options]
 */
export function showToast(message, options = 2800) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const opts = typeof options === 'number' ? { durationMs: options } : (options || {});
  const durationMs = opts.durationMs ?? 3000;

  const el = document.createElement('div');
  el.className = 'toast';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  el.appendChild(textSpan);

  let timerId = null;
  const removeToast = () => {
    if (timerId) clearTimeout(timerId);
    el.remove();
  };

  if (opts.actionLabel && typeof opts.onAction === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'toast-action';
    actionBtn.textContent = opts.actionLabel;
    actionBtn.addEventListener('click', () => {
      removeToast();
      opts.onAction();
    });
    el.appendChild(actionBtn);
  }

  root.appendChild(el);
  if (durationMs > 0) {
    timerId = setTimeout(removeToast, durationMs);
  }
}

export function openModal(title, bodyHtml) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  lastFocusedElement = document.activeElement;

  root.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">${escapeHtml(title)}</h3>
        <button type="button" class="btn-icon" id="modal-close-btn" aria-label="Cerrar">✕</button>
      </div>
      <div id="modal-body">${bodyHtml}</div>
    </div>
  `;
  root.classList.remove('hidden');

  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  root.onclick = (e) => {
    if (e.target === root) closeModal();
  };

  if (activeEscHandler) {
    document.removeEventListener('keydown', activeEscHandler);
  }
  activeEscHandler = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', activeEscHandler);

  const firstFocusable = root.querySelector('input, select, textarea, button');
  if (firstFocusable && typeof firstFocusable.focus === 'function') {
    firstFocusable.focus();
  }
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.classList.add('hidden');
  root.innerHTML = '';
  if (activeEscHandler) {
    document.removeEventListener('keydown', activeEscHandler);
    activeEscHandler = null;
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

/**
 * Diálogo de confirmación propio accesible (reemplaza window.confirm).
 * @returns {Promise<boolean>}
 */
export function confirmModal({ title, message, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', danger = true }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      closeModal();
      resolve(value);
    };

    const html = `
      <p style="margin: 0 0 18px; color: var(--text-muted); font-size: 1rem;">
        ${escapeHtml(message)}
      </p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" class="btn btn-ghost" id="confirm-cancel-btn">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok-btn">${escapeHtml(confirmLabel)}</button>
      </div>
    `;

    openModal(title, html);

    const root = document.getElementById('modal-root');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const okBtn = document.getElementById('confirm-ok-btn');

    if (closeBtn) closeBtn.onclick = () => finish(false);
    if (cancelBtn) cancelBtn.onclick = () => finish(false);
    if (okBtn) okBtn.onclick = () => finish(true);
    if (root) {
      root.onclick = (e) => {
        if (e.target === root) finish(false);
      };
    }
  });
}
