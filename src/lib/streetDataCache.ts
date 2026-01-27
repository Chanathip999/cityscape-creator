/**
 * IndexedDB cache for street data - persists across browser sessions
 * Dramatically speeds up repeated views of the same area
 */

const DB_NAME = 'poster-street-cache';
// IMPORTANT: Increment version when data format changes (e.g., coordinate precision)
// v2: Changed from 3 decimal places to 5 decimal places for smooth lines
const DB_VERSION = 2;
const STORE_NAME = 'tiles';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedTile {
  key: string;
  data: unknown;
  timestamp: number;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  // If we have an active connection, return it
  if (dbInstance && dbInstance.transaction) {
    try {
      // Test if connection is still valid
      dbInstance.transaction(STORE_NAME, 'readonly');
      return Promise.resolve(dbInstance);
    } catch {
      // Connection is stale, reset
      dbInstance = null;
      dbPromise = null;
    }
  }
  
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Handle connection closing unexpectedly
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      
      dbInstance.onerror = () => {
        dbInstance = null;
        dbPromise = null;
      };
      
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
  
  return dbPromise;
}

export async function getCachedTile(key: string): Promise<unknown | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        
        request.onsuccess = () => {
          const result = request.result as CachedTile | undefined;
          if (result && Date.now() - result.timestamp < CACHE_TTL) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      } catch {
        // Transaction failed, reset connection
        dbInstance = null;
        dbPromise = null;
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function setCachedTile(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ key, data, timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        // Transaction failed, reset connection
        dbInstance = null;
        dbPromise = null;
        resolve();
      }
    });
  } catch {
    // Silently fail - cache is optional
  }
}

export async function clearOldCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tile = cursor.value as CachedTile;
        if (Date.now() - tile.timestamp > CACHE_TTL) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch {
    // Silently fail
  }
}

// Clear ALL cached tiles - for manual refresh
export async function clearAllCache(): Promise<void> {
  try {
    // Close any existing connection first
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
      dbPromise = null;
    }
    
    // Delete the entire database to ensure complete cache clear
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('Street data cache cleared (database deleted)');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('Failed to delete cache database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      
      deleteRequest.onblocked = () => {
        console.warn('Cache delete blocked - forcing close');
        // Force resolve after a short delay
        setTimeout(() => {
          console.log('Cache clear completed (forced)');
          resolve();
        }, 500);
      };
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}

// Generate cache key from tile parameters
export function getTileCacheKey(lat: number, lng: number, radius: number): string {
  return `tile-${lat.toFixed(3)}-${lng.toFixed(3)}-${radius}`;
}
