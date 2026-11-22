/**
 * Módulo 0: Motor de Persistencia Local-First (IndexedDB)
 * Almacena configuraciones, recordatorios, listas de compras, productos, notas e historial de precios.
 */

let dbName = 'AnotadoDB';
const DB_VERSION = 1;
const STORES = [
  { name: 'settings', keyPath: 'id' },
  { name: 'reminders', keyPath: 'id', index: 'scheduledTime' },
  { name: 'shopping_lists', keyPath: 'id' },
  { name: 'products', keyPath: 'id', index: 'listId' },
  { name: 'notes', keyPath: 'id' },
  { name: 'price_history', keyPath: 'nameKey' }
];

let dbPromise = null;

/**
 * Permite cambiar el nombre de la base de datos (ej. para aislar pruebas).
 * @param {string} name
 */
export function setDatabaseName(name) {
  if (name && name !== dbName) {
    dbName = name;
    dbPromise = null;
  }
}

/**
 * Abre o inicializa la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const storeDef of STORES) {
        if (!db.objectStoreNames.contains(storeDef.name)) {
          const store = db.createObjectStore(storeDef.name, { keyPath: storeDef.keyPath });
          if (storeDef.index) {
            store.createIndex(storeDef.index, storeDef.index, { unique: false });
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/**
 * Genera un identificador único compatible con todos los navegadores.
 * @returns {string}
 */
export function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Obtiene un registro por clave primaria.
 */
export async function getById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene todos los registros de una tabla.
 */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene registros filtrados por un índice.
 */
export async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Inserta o actualiza un registro.
 */
export async function putRecord(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Elimina un registro por clave primaria.
 */
export async function deleteRecord(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Elimina múltiples registros que coincidan con un índice.
 */
export async function deleteByIndex(storeName, indexName, value) {
  const items = await getByIndex(storeName, indexName, value);
  if (!items.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.delete(item.id);
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Exporta todas las tablas de IndexedDB en un objeto JSON serializable.
 */
export async function exportAllData() {
  const stores = {};
  for (const def of STORES) {
    stores[def.name] = await getAll(def.name);
  }
  return {
    app: 'Anotado',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores
  };
}

/**
 * Importa registros desde un respaldo JSON previamente exportado.
 */
export async function importAllData(payload) {
  if (!payload || typeof payload !== 'object' || !payload.stores) {
    throw new Error('Formato de respaldo inválido');
  }

  const db = await openDB();
  const validNames = STORES.map((s) => s.name).filter((name) => Array.isArray(payload.stores[name]));
  if (validNames.length === 0) {
    throw new Error('El respaldo no contiene tablas válidas');
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(validNames, 'readwrite');
    for (const name of validNames) {
      const store = tx.objectStore(name);
      store.clear();
      for (const record of payload.stores[name]) {
        store.put(record);
      }
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
