/**
 * Módulo 0: Motor Multimoneda
 * Formateo nativo con Intl.NumberFormat según estándar ISO 4217.
 */

export const CURRENCIES = {
  CLP: { code: 'CLP', symbol: '$', locale: 'es-CL', decimals: 0, thousandsDot: true, nameEs: 'Peso Chileno', nameEn: 'Chilean Peso' },
  USD: { code: 'USD', symbol: 'US$', locale: 'en-US', decimals: 2, thousandsDot: false, nameEs: 'Dólar Estadounidense', nameEn: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', locale: 'es-ES', decimals: 2, thousandsDot: true, nameEs: 'Euro', nameEn: 'Euro' },
  ARS: { code: 'ARS', symbol: '$', locale: 'es-AR', decimals: 0, thousandsDot: true, nameEs: 'Peso Argentino', nameEn: 'Argentine Peso' },
  MXN: { code: 'MXN', symbol: 'MX$', locale: 'es-MX', decimals: 2, thousandsDot: false, nameEs: 'Peso Mexicano', nameEn: 'Mexican Peso' }
};

let activeCurrency = 'CLP';

export function setDefaultCurrency(code) {
  activeCurrency = CURRENCIES[code] ? code : 'CLP';
}

export function getDefaultCurrency() {
  return activeCurrency;
}

/**
 * Formatea un monto numérico en la moneda especificada.
 * @param {number} amount
 * @param {string} [currencyCode]
 * @returns {string}
 */
export function formatMoney(amount, currencyCode = activeCurrency) {
  const meta = CURRENCIES[currencyCode] || CURRENCIES.CLP;
  const safeValue = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals
    }).format(safeValue);
  } catch {
    return `${meta.symbol} ${safeValue.toFixed(meta.decimals)}`;
  }
}

/**
 * Convierte entrada de monto monetario a número respetando el separador de miles
 * de la moneda activa (ej. en CLP/ARS/EUR "40.000" -> 40000, "1,5" -> 1.5).
 * @param {string|number} raw
 * @param {string} [currencyCode]
 * @returns {number}
 */
export function parseNumericInput(raw, currencyCode = activeCurrency) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  if (raw == null) return 0;

  let text = String(raw).trim().replace(/\s+/g, '');
  if (!text) return 0;

  const meta = CURRENCIES[currencyCode] || CURRENCIES.CLP;

  if (meta.thousandsDot) {
    // En locales con punto de miles (CLP, ARS, EUR):
    // - Si hay coma, los puntos son miles y la coma es decimal.
    // - Si hay varios puntos, todos son miles.
    // - Si hay un único punto seguido de 3 dígitos (ej: "1.190" o "40.000"), o la moneda no tiene decimales, es separador de miles.
    if (text.includes(',')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if ((text.match(/\./g) || []).length > 1) {
      text = text.replace(/\./g, '');
    } else if (/\.\d{3}$/.test(text) || meta.decimals === 0) {
      text = text.replace(/\./g, '');
    }
  } else {
    // En locales con coma de miles (USD, MXN):
    // - Si hay punto y coma, las comas son miles.
    // - Si solo hay una coma con 1-2 dígitos al final (ej: "1,5"), tratarla como decimal; si tiene 3 dígitos (ej: "1,250"), quitarla como miles.
    if (text.includes('.') && text.includes(',')) {
      text = text.replace(/,/g, '');
    } else if (text.includes(',')) {
      text = /,\d{3}$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
    }
  }

  const parsed = parseFloat(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Convierte entrada de cantidad (acepta tanto punto como coma decimal: "1.5" o "1,5").
 * @param {string|number} raw
 * @returns {number}
 */
export function parseQuantityInput(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  if (raw == null) return 0;
  const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
