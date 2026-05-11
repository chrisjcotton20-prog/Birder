// Tiny Promise-based IndexedDB wrapper.
// Mimics the get/set/delete interface of window.storage used in the artifact,
// so the rest of the app doesn't need to know about IDB.

const DB_NAME = 'continental-census';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const result = fn(store);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const storage = {
  async get(key) {
    return new Promise((resolve, reject) => {
      openDb().then((db) => {
        const t = db.transaction(STORE, 'readonly');
        const req = t.objectStore(STORE).get(key);
        req.onsuccess = () => {
          const v = req.result;
          resolve(v === undefined ? null : v);
        };
        req.onerror = () => reject(req.error);
      }).catch(reject);
    });
  },

  async set(key, value) {
    await tx('readwrite', (store) => store.put(value, key));
  },

  async del(key) {
    await tx('readwrite', (store) => store.delete(key));
  },
};
