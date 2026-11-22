/**
 * Módulo 4: Supermercado & Calculadora Inteligente en Góndola
 * Cálculo reactivo en vivo, barra de presupuesto, historial de precios y exportación a WhatsApp.
 */

import { createId, deleteByIndex, deleteRecord, getAll, getById, getByIndex, putRecord } from '../core/db.js';
import { t } from '../core/i18n.js';
import { CURRENCIES, formatMoney, getDefaultCurrency, parseNumericInput, parseQuantityInput } from '../core/currency.js';
import { closeModal, confirmModal, escapeHtml, openModal, showToast } from '../core/ui.js';

const CATEGORY_KEYS = ['Abarrotes', 'Lácteos', 'Carnes', 'Verduras', 'Panadería', 'Limpieza', 'Perfumería', 'Otros'];

let selectedCategory = 'ALL';
let activeListId = null;

/**
 * Calcula los totales de una lista de productos.
 */
export function calculateListTotals(items, budgetLimit = 0) {
  let totalInCart = 0;
  let totalEstimated = 0;
  let inCartCount = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const subtotal = qty * price;
    totalEstimated += subtotal;
    if (item.inCart) {
      totalInCart += subtotal;
      inCartCount += 1;
    }
  }

  const hasBudget = budgetLimit > 0;
  const budgetDiff = budgetLimit - totalEstimated;
  const isExceeded = hasBudget && totalEstimated > budgetLimit;
  const progressPct = hasBudget ? Math.min(100, (totalEstimated / budgetLimit) * 100) : 0;

  return {
    totalInCart,
    totalEstimated,
    inCartCount,
    totalCount: items.length,
    hasBudget,
    budgetDiff,
    isExceeded,
    progressPct
  };
}

/**
 * Formatea la lista de compras en texto plano para compartir por WhatsApp / Mensajería.
 */
export function formatListForShare(list, items) {
  const totals = calculateListTotals(items, list.budgetLimit);
  const lines = [`🛒 *${list.title}*`, ''];

  for (const item of items) {
    const mark = item.inCart ? '[✓]' : '[ ]';
    const sub = formatMoney(item.quantity * item.unitPrice, list.currency);
    lines.push(`${mark} ${item.name} (x${item.quantity}) - ${sub}`);
  }

  lines.push('');
  lines.push(`*${t('market.inCart')}:* ${formatMoney(totals.totalInCart, list.currency)}`);
  lines.push(`*${t('market.totalProjected')}:* ${formatMoney(totals.totalEstimated, list.currency)}`);
  if (totals.hasBudget) {
    lines.push(`*${t('market.budgetLabel')}:* ${formatMoney(list.budgetLimit, list.currency)}`);
  }

  return lines.join('\n');
}

function openListModal(existingList, onSaved) {
  const isEdit = Boolean(existingList);
  const curr = existingList?.currency || getDefaultCurrency();

  const html = `
    <form id="list-form">
      <div class="field">
        <label for="list-title">${escapeHtml(t('market.title'))}</label>
        <input id="list-title" class="input" type="text" required
          placeholder="${escapeHtml(t('market.listNamePlaceholder'))}"
          value="${escapeHtml(existingList?.title || '')}" />
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="list-currency">${escapeHtml(t('settings.currencyLabel'))}</label>
          <select id="list-currency" class="select">
            ${Object.values(CURRENCIES).map((c) => `
              <option value="${c.code}" ${c.code === curr ? 'selected' : ''}>${c.code} (${c.symbol})</option>
            `).join('')}
          </select>
        </div>

        <div class="field">
          <label for="list-budget">${escapeHtml(t('market.budgetLabel'))}</label>
          <input id="list-budget" class="input" type="text" inputmode="decimal"
            placeholder="0"
            value="${escapeHtml(existingList?.budgetLimit ?? 40000)}" />
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px;">
        <button type="button" class="btn btn-ghost" id="list-cancel">${escapeHtml(t('app.cancel'))}</button>
        <button type="submit" class="btn btn-primary">${escapeHtml(t('app.save'))}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? t('app.edit') : t('market.newList'), html);
  document.getElementById('list-cancel').addEventListener('click', closeModal);

  document.getElementById('list-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('list-title').value.trim();
    if (!title) return;

    const currency = document.getElementById('list-currency').value;
    const record = {
      id: existingList?.id || createId(),
      title,
      currency,
      budgetLimit: parseNumericInput(document.getElementById('list-budget').value, currency),
      isArchived: existingList?.isArchived || false,
      createdAt: existingList?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await putRecord('shopping_lists', record);
    activeListId = record.id;
    closeModal();
    onSaved();
  });
}

async function openProductModal(list, existingItem, onSaved) {
  const isEdit = Boolean(existingItem);
  const priceHistory = await getAll('price_history');
  const historyMap = new Map(priceHistory.map((h) => [h.nameKey, h]));

  const html = `
    <form id="product-form">
      <div class="field">
        <label for="prod-name">${escapeHtml(t('market.productName'))}</label>
        <input id="prod-name" class="input" type="text" required autocomplete="off"
          placeholder="${escapeHtml(t('market.productPlaceholder'))}"
          value="${escapeHtml(existingItem?.name || '')}" />
        <div id="price-suggestion-box" class="hidden" style="margin-top: 4px;"></div>
      </div>

      <div class="field">
        <label for="prod-cat">${escapeHtml(t('market.category'))}</label>
        <select id="prod-cat" class="select">
          ${CATEGORY_KEYS.map((key) => `
            <option value="${key}" ${(existingItem?.category || 'Abarrotes') === key ? 'selected' : ''}>
              ${escapeHtml(t('market.categories.' + key))}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="prod-qty">${escapeHtml(t('market.quantity'))}</label>
          <input id="prod-qty" class="input" type="text" inputmode="decimal" required
            value="${escapeHtml(existingItem?.quantity ?? 1)}" />
        </div>

        <div class="field">
          <label for="prod-price">${escapeHtml(t('market.unitPrice'))} (${escapeHtml(list.currency)})</label>
          <input id="prod-price" class="input" type="text" inputmode="decimal"
            placeholder="0"
            value="${escapeHtml(existingItem?.unitPrice ?? '')}" />
        </div>
      </div>

      <div style="padding: 12px; border-radius: 12px; background-color: var(--surface-subtle); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <span style="font-weight: 700;">${escapeHtml(t('market.subtotal'))}:</span>
        <span id="prod-live-sub" class="mono-num" style="font-size: 1.2rem; color: var(--primary);">
          ${escapeHtml(formatMoney((existingItem?.quantity || 1) * (existingItem?.unitPrice || 0), list.currency))}
        </span>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" class="btn btn-ghost" id="prod-cancel">${escapeHtml(t('app.cancel'))}</button>
        <button type="submit" class="btn btn-primary">${escapeHtml(t('app.save'))}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? t('market.editItem') : t('market.addItem'), html);

  const nameInput = document.getElementById('prod-name');
  const qtyInput = document.getElementById('prod-qty');
  const priceInput = document.getElementById('prod-price');
  const catSelect = document.getElementById('prod-cat');
  const liveSub = document.getElementById('prod-live-sub');
  const suggestionBox = document.getElementById('price-suggestion-box');

  function refreshSubtotal() {
    const q = parseQuantityInput(qtyInput.value);
    const p = parseNumericInput(priceInput.value, list.currency);
    liveSub.textContent = formatMoney(q * p, list.currency);
  }

  qtyInput.addEventListener('input', refreshSubtotal);
  priceInput.addEventListener('input', refreshSubtotal);

  nameInput.addEventListener('input', () => {
    const key = `${nameInput.value.trim().toLowerCase()}::${list.currency}`;
    const match = historyMap.get(key);
    if (match && match.lastPrice > 0) {
      let diffBadge = '';
      if (match.prevPrice > 0 && match.prevPrice !== match.lastPrice) {
        const pct = Math.round(((match.lastPrice - match.prevPrice) / match.prevPrice) * 100);
        if (pct !== 0) {
          diffBadge = ` (${pct > 0 ? '▲ +' : '▼ '}${pct}%)`;
        }
      }
      suggestionBox.classList.remove('hidden');
      suggestionBox.innerHTML = `
        <button type="button" id="apply-suggested-price" class="badge badge-green" style="border: 1px solid var(--primary); cursor: pointer; padding: 6px 10px;">
          💡 ${escapeHtml(t('market.priceSuggestion'))} ${escapeHtml(formatMoney(match.lastPrice, list.currency))}${escapeHtml(diffBadge)}
        </button>
      `;
      document.getElementById('apply-suggested-price').addEventListener('click', () => {
        priceInput.value = String(match.lastPrice);
        if (match.category) catSelect.value = match.category;
        refreshSubtotal();
      });
    } else {
      suggestionBox.classList.add('hidden');
      suggestionBox.innerHTML = '';
    }
  });

  document.getElementById('prod-cancel').addEventListener('click', closeModal);

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    const quantity = parseQuantityInput(qtyInput.value) || 1;
    const unitPrice = parseNumericInput(priceInput.value, list.currency);
    const category = catSelect.value;

    const record = {
      id: existingItem?.id || createId(),
      listId: list.id,
      name,
      category,
      quantity,
      unitPrice,
      inCart: existingItem?.inCart || false,
      createdAt: existingItem?.createdAt || Date.now()
    };

    await putRecord('products', record);

    // Guardar en historial de precios por moneda si tiene valor
    if (unitPrice > 0) {
      const historyKey = `${name.toLowerCase()}::${list.currency}`;
      const existingHistory = historyMap.get(historyKey);
      const prevPrice = existingHistory && existingHistory.lastPrice !== unitPrice
        ? existingHistory.lastPrice
        : (existingHistory?.prevPrice ?? null);

      await putRecord('price_history', {
        nameKey: historyKey,
        name,
        category,
        lastPrice: unitPrice,
        prevPrice,
        currency: list.currency,
        updatedAt: Date.now()
      });
    }

    closeModal();
    onSaved();
  });
}

/**
 * Renderiza la pantalla completa de Supermercado y la barra de totales fija inferior.
 */
export async function renderMarket(container, stickyBar, { params = {} } = {}) {
  let lists = await getAll('shopping_lists');

  // Si no hay ninguna lista todavía, crear una lista inicial por defecto
  if (lists.length === 0) {
    const defaultList = {
      id: createId(),
      title: t('market.title'),
      currency: getDefaultCurrency(),
      budgetLimit: 40000,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await putRecord('shopping_lists', defaultList);
    lists = [defaultList];
  }

  lists.sort((a, b) => {
    if (Boolean(a.isArchived) !== Boolean(b.isArchived)) return a.isArchived ? 1 : -1;
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  });

  if (params.listId && lists.some((l) => l.id === params.listId)) {
    activeListId = params.listId;
  } else if (!activeListId || !lists.some((l) => l.id === activeListId)) {
    const prefs = await getById('settings', 'user_prefs');
    const remembered = prefs?.lastOpenedListId && lists.find((l) => l.id === prefs.lastOpenedListId);
    activeListId = remembered ? remembered.id : lists[0].id;
  }

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];
  const existingPrefs = (await getById('settings', 'user_prefs')) || { id: 'user_prefs' };
  if (existingPrefs.lastOpenedListId !== activeList.id) {
    await putRecord('settings', { ...existingPrefs, id: 'user_prefs', lastOpenedListId: activeList.id });
  }
  const allItems = await getByIndex('products', 'listId', activeList.id);

  // Ordenar: pendientes primero, en el carro al final
  const sortedItems = [...allItems].sort((a, b) => {
    if (a.inCart !== b.inCart) return a.inCart ? 1 : -1;
    return a.createdAt - b.createdAt;
  });

  const visibleItems = selectedCategory === 'ALL'
    ? sortedItems
    : sortedItems.filter((it) => it.category === selectedCategory);

  const totals = calculateListTotals(allItems, activeList.budgetLimit);

  container.innerHTML = `
    <section>
      <!-- Selector de Lista y Acciones -->
      <div class="toolbar">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px;">
          <select id="active-list-select" class="select" aria-label="${escapeHtml(t('market.title'))}" style="font-weight: 800;">
            ${lists.map((l) => `
              <option value="${escapeHtml(l.id)}" ${l.id === activeList.id ? 'selected' : ''}>
                ${l.isArchived ? '📦' : '🛒'} ${escapeHtml(l.title)} (${escapeHtml(l.currency)})${l.isArchived ? ` [${escapeHtml(t('market.archivedBadge'))}]` : ''}
              </option>
            `).join('')}
          </select>
          <button type="button" id="btn-edit-list" class="btn-icon" title="${escapeHtml(t('app.edit'))}">✏️</button>
          ${lists.length > 1 ? `<button type="button" id="btn-del-list" class="btn-icon" title="${escapeHtml(t('app.delete'))}" style="color: var(--danger);">🗑️</button>` : ''}
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button type="button" id="btn-new-list" class="btn btn-sm btn-ghost">+ ${escapeHtml(t('market.newList'))}</button>
          <button type="button" id="btn-share-list" class="btn btn-sm btn-ghost">💬 ${escapeHtml(t('market.shareBtn'))}</button>
          ${totals.inCartCount > 0 ? `<button type="button" id="btn-clear-cart" class="btn btn-sm btn-ghost">🧹 ${escapeHtml(t('market.clearCart'))}</button>` : ''}
          <button type="button" id="btn-archive-list" class="btn btn-sm btn-ghost">
            ${activeList.isArchived ? `↩️ ${escapeHtml(t('market.reopenList'))}` : `✓ ${escapeHtml(t('market.finishShopping'))}`}
          </button>
          <button type="button" id="btn-add-product" class="btn btn-sm btn-primary">+ ${escapeHtml(t('market.addItem'))}</button>
        </div>
      </div>

      <!-- Chips de Categoría -->
      <div class="chip-row" role="tablist">
        <button type="button" class="chip ${selectedCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">
          ${escapeHtml(t('app.all'))} (${allItems.length})
        </button>
        ${CATEGORY_KEYS.map((key) => {
          const count = allItems.filter((it) => it.category === key).length;
          if (count === 0) return '';
          return `
            <button type="button" class="chip ${selectedCategory === key ? 'active' : ''}" data-cat="${key}">
              ${escapeHtml(t('market.categories.' + key))} (${count})
            </button>
          `;
        }).join('')}
      </div>

      <!-- Lista de Productos -->
      ${visibleItems.length === 0 ? `
        <div class="empty-state">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🛒</div>
          <p style="margin: 0; font-weight: 600;">${escapeHtml(t('market.emptyList'))}</p>
        </div>
      ` : `
        <div class="product-list">
          ${visibleItems.map((item) => {
            const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
            return `
              <div class="product-row ${item.inCart ? 'in-cart' : ''}">
                <button type="button" class="check-circle ${item.inCart ? 'checked' : ''}"
                  data-toggle-cart="${escapeHtml(item.id)}"
                  aria-pressed="${item.inCart ? 'true' : 'false'}"
                  aria-label="${escapeHtml(item.name)}">
                  ${item.inCart ? '✓' : ''}
                </button>

                <div class="product-info" role="button" tabindex="0" data-edit-prod="${escapeHtml(item.id)}" style="cursor: pointer;">
                  <div class="product-name">${escapeHtml(item.name)}</div>
                  <div class="product-sub">
                    <span>${escapeHtml(item.quantity)} × ${escapeHtml(formatMoney(item.unitPrice, activeList.currency))}</span>
                    <span class="badge badge-green" style="font-size: 0.75rem; padding: 2px 8px;">
                      ${escapeHtml(t('market.categories.' + (item.category || 'Otros')))}
                    </span>
                  </div>
                </div>

                <div class="product-actions">
                  <div class="price-tag">${escapeHtml(formatMoney(subtotal, activeList.currency))}</div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <button type="button" class="btn btn-sm btn-ghost btn-touch" data-qty-minus="${escapeHtml(item.id)}" aria-label="-">-</button>
                    <button type="button" class="btn btn-sm btn-ghost btn-touch" data-qty-plus="${escapeHtml(item.id)}" aria-label="+">+</button>
                    <button type="button" class="btn btn-sm btn-ghost btn-touch" style="margin-left: 8px; color: var(--danger);" data-del-prod="${escapeHtml(item.id)}" aria-label="${escapeHtml(t('app.delete'))}">✕</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </section>
  `;

  // Barra Sticky Inferior con Totales y Presupuesto
  stickyBar.classList.remove('hidden');
  stickyBar.innerHTML = `
    <div class="sticky-inner">
      <div class="totals-row">
        <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 700;">
          ${escapeHtml(t('market.inCart'))} (${totals.inCartCount}/${totals.totalCount}):
        </span>
        <span class="mono-num" style="font-size: 1.25rem; color: var(--primary);">
          ${escapeHtml(formatMoney(totals.totalInCart, activeList.currency))}
        </span>
      </div>

      <div class="totals-row">
        <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 700;">
          ${escapeHtml(t('market.totalProjected'))}:
        </span>
        <span class="mono-num" style="font-size: 1.05rem;">
          ${escapeHtml(formatMoney(totals.totalEstimated, activeList.currency))}
        </span>
      </div>

      ${totals.hasBudget ? `
        <div class="progress-track">
          <div class="progress-fill ${totals.isExceeded ? 'exceeded' : ''}" style="width: ${totals.progressPct}%;"></div>
        </div>
        <div class="totals-row" style="font-size: 0.85rem;">
          <span style="font-weight: 800; color: ${totals.isExceeded ? 'var(--danger)' : 'var(--primary)'};">
            ${totals.isExceeded
              ? `⚠️ ${escapeHtml(t('market.budgetExceeded'))} ${escapeHtml(formatMoney(Math.abs(totals.budgetDiff), activeList.currency))}`
              : `✓ ${escapeHtml(t('market.budgetWithin'))} (${escapeHtml(t('market.budgetRemaining'))}: ${escapeHtml(formatMoney(totals.budgetDiff, activeList.currency))})`}
          </span>
          <span class="mono-num" style="color: var(--text-muted);">
            Max: ${escapeHtml(formatMoney(activeList.budgetLimit, activeList.currency))}
          </span>
        </div>
      ` : ''}
    </div>
  `;

  // Event Listeners
  const rerender = () => renderMarket(container, stickyBar, { params: { listId: activeList.id } });

  document.getElementById('active-list-select').addEventListener('change', (e) => {
    activeListId = e.target.value;
    selectedCategory = 'ALL';
    rerender();
  });

  document.getElementById('btn-new-list').addEventListener('click', () => {
    openListModal(null, rerender);
  });

  document.getElementById('btn-edit-list').addEventListener('click', () => {
    openListModal(activeList, rerender);
  });

  const delListBtn = document.getElementById('btn-del-list');
  if (delListBtn) {
    delListBtn.addEventListener('click', async () => {
      const confirmed = await confirmModal({
        title: t('app.delete'),
        message: t('app.confirmDelete'),
        confirmLabel: t('app.delete'),
        cancelLabel: t('app.cancel')
      });
      if (!confirmed) return;
      const allReminders = await getAll('reminders');
      for (const rem of allReminders) {
        if (rem.linkedShoppingListId === activeList.id) {
          rem.linkedShoppingListId = null;
          await putRecord('reminders', rem);
        }
      }
      await deleteByIndex('products', 'listId', activeList.id);
      await deleteRecord('shopping_lists', activeList.id);
      activeListId = null;
      rerender();
    });
  }

  const clearCartBtn = document.getElementById('btn-clear-cart');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', async () => {
      const checkedItems = allItems.filter((it) => it.inCart);
      if (checkedItems.length === 0) return;
      for (const it of checkedItems) {
        await deleteRecord('products', it.id);
      }
      showToast(t('market.cartCleared'));
      rerender();
    });
  }

  document.getElementById('btn-archive-list').addEventListener('click', async () => {
    activeList.isArchived = !activeList.isArchived;
    activeList.updatedAt = Date.now();
    await putRecord('shopping_lists', activeList);
    if (activeList.isArchived) {
      showToast(t('market.listArchived'));
    }
    rerender();
  });

  document.getElementById('btn-add-product').addEventListener('click', () => {
    openProductModal(activeList, null, rerender);
  });

  document.getElementById('btn-share-list').addEventListener('click', async () => {
    const text = formatListForShare(activeList, allItems);
    if (navigator.share) {
      try {
        await navigator.share({ title: activeList.title, text });
        return;
      } catch {
        // Fallback al portapapeles si el usuario cancela o falla share
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast(t('market.copiedToast'));
    }
  });

  container.querySelectorAll('[data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      selectedCategory = chip.getAttribute('data-cat');
      rerender();
    });
  });

  container.querySelectorAll('[data-toggle-cart]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-toggle-cart');
      const item = allItems.find((it) => it.id === id);
      if (!item) return;
      item.inCart = !item.inCart;
      await putRecord('products', item);
      rerender();
    });
  });

  container.querySelectorAll('[data-edit-prod]').forEach((el) => {
    const openEdit = () => {
      const item = allItems.find((it) => it.id === el.getAttribute('data-edit-prod'));
      if (item) openProductModal(activeList, item, rerender);
    };
    el.addEventListener('click', openEdit);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEdit();
      }
    });
  });

  container.querySelectorAll('[data-qty-plus]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = allItems.find((it) => it.id === btn.getAttribute('data-qty-plus'));
      if (!item) return;
      item.quantity = Number((item.quantity + 1).toFixed(2));
      await putRecord('products', item);
      rerender();
    });
  });

  container.querySelectorAll('[data-qty-minus]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const item = allItems.find((it) => it.id === btn.getAttribute('data-qty-minus'));
      if (!item) return;
      item.quantity = Math.max(0.5, Number((item.quantity - 1).toFixed(2)));
      await putRecord('products', item);
      rerender();
    });
  });

  container.querySelectorAll('[data-del-prod]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del-prod');
      const deletedCopy = allItems.find((it) => it.id === id);
      if (!deletedCopy) return;
      await deleteRecord('products', id);
      rerender();
      showToast(`${t('app.itemDeleted')}: ${deletedCopy.name}`, {
        durationMs: 5000,
        actionLabel: t('app.undo'),
        onAction: async () => {
          await putRecord('products', deletedCopy);
          rerender();
        }
      });
    });
  });
}
