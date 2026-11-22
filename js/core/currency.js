/**
 * Módulo 0: Motor Multimoneda
 * Formateo nativo con Intl.NumberFormat según estándar ISO 4217.
 */

export const CURRENCIES = {
  CLP: { code: 'CLP', symbol: '$', locale: 'es-CL', decimals: 0, nameEs: 'Peso Chileno', nameEn: 'Chilean Peso' },
  USD: { code: 'USD', symbol: 'US$', locale: 'en-US', decimals: 2, nameEs: 'Dólar Estadounidense', nameEn: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', locale: 'es-ES', decimals: 2, nameEs: 'Euro', nameEn: 'Euro' },
  ARS: { code: 'ARS', symbol: '$', locale: 'es-AR', decimals: 0, nameEs: 'Peso Argentino', nameEn: 'Argentine Peso' },
  MXN: { code: 'MXN', symbol: 'MX$', locale: 'es-MX', decimals: 2, nameEs: 'Peso Mexicano', nameEn: 'Mexican Peso' }
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
 * Convierte entrada de texto (con coma o punto) a número válido.
 */
export function parseNumericInput(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (!raw) return 0;
  const normalized = String(raw).trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
