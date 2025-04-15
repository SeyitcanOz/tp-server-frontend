import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number; // seconds until expiry
}

interface CacheStore {
  [key: string]: CacheEntry<unknown>;
}

// Initialize the cache store
const createCache = () => {
  // Initial state - try to load from localStorage if in browser
  let initialCache: CacheStore = {};
  
  if (browser) {
    try {
      const storedCache = localStorage.getItem('app_cache');
      if (storedCache) {
        initialCache = JSON.parse(storedCache);
        
        // Clean up expired items on initialization
        const now = Date.now();
        Object.keys(initialCache).forEach(key => {
          if (initialCache[key].timestamp + initialCache[key].expiry * 1000 < now) {
            delete initialCache[key];
          }
        });
      }
    } catch (e) {
      console.error('Error loading cache from localStorage:', e);
    }
  }
  
  const { subscribe, set, update } = writable<CacheStore>(initialCache);
  
  return {
    subscribe,
    
    /**
     * Set a value in the cache
     * @param key Cache key
     * @param value Data to store
     * @param expiry Expiry time in seconds (default: 5 minutes)
     */
    set: <T>(key: string, value: T, expiry: number = 300) => {
      update(store => {
        store[key] = {
          data: value,
          timestamp: Date.now(),
          expiry
        };
        
        // Update localStorage if in browser
        if (browser) {
          try {
            localStorage.setItem('app_cache', JSON.stringify(store));
          } catch (e) {
            console.error('Error saving cache to localStorage:', e);
          }
        }
        
        return store;
      });
    },
    
    /**
     * Get a value from the cache
     * @param key Cache key
     * @returns The cached value or null if not found or expired
     */
    get: <T>(key: string): T | null => {
      const store = get({ subscribe });
      const entry = store[key] as CacheEntry<T> | undefined;
      
      if (!entry) return null;
      
      // Check if the entry has expired
      if (entry.timestamp + entry.expiry * 1000 < Date.now()) {
        // Remove expired entry
        update(store => {
          delete store[key];
          
          if (browser) {
            try {
              localStorage.setItem('app_cache', JSON.stringify(store));
            } catch (e) {
              console.error('Error saving cache to localStorage:', e);
            }
          }
          
          return store;
        });
        
        return null;
      }
      
      return entry.data;
    },
    
    /**
     * Check if a key exists in the cache and is not expired
     * @param key Cache key
     * @returns True if the key exists and is not expired
     */
    has: (key: string): boolean => {
      const store = get({ subscribe });
      const entry = store[key];
      
      if (!entry) return false;
      
      return entry.timestamp + entry.expiry * 1000 >= Date.now();
    },
    
    /**
     * Remove a specific key from the cache
     * @param key Cache key
     */
    remove: (key: string) => {
      update(store => {
        delete store[key];
        
        if (browser) {
          try {
            localStorage.setItem('app_cache', JSON.stringify(store));
          } catch (e) {
            console.error('Error saving cache to localStorage:', e);
          }
        }
        
        return store;
      });
    },
    
    /**
     * Clear all entries from the cache
     */
    clear: () => {
      set({});
      
      if (browser) {
        try {
          localStorage.removeItem('app_cache');
        } catch (e) {
          console.error('Error clearing cache from localStorage:', e);
        }
      }
    },
    
    /**
     * Clear all entries that match a prefix
     * @param prefix The prefix to match
     */
    clearByPrefix: (prefix: string) => {
      update(store => {
        Object.keys(store).forEach(key => {
          if (key.startsWith(prefix)) {
            delete store[key];
          }
        });
        
        if (browser) {
          try {
            localStorage.setItem('app_cache', JSON.stringify(store));
          } catch (e) {
            console.error('Error saving cache to localStorage:', e);
          }
        }
        
        return store;
      });
    }
  };
};

// Export the cache store singleton
export const cache = createCache();

/**
 * A utility function to cache the result of an async function
 * @param key Cache key
 * @param fetchFn Function to fetch data if not in cache
 * @param expiry Cache expiry time in seconds
 * @returns The cached or fetched data
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  expiry: number = 300
): Promise<T> {
  const cachedData = cache.get<T>(key);
  
  if (cachedData !== null) {
    return cachedData;
  }
  
  const data = await fetchFn();
  cache.set(key, data, expiry);
  return data;
}

/**
 * Get a cache key with namespacing
 * @param namespace The namespace for the key (e.g. 'projects')
 * @param id The specific identifier
 * @param params Optional parameters to include in the key
 */
export function getCacheKey(
  namespace: string,
  id?: string | number,
  params?: Record<string, unknown>
): string {
  let key = namespace;
  
  if (id !== undefined) {
    key += `:${id}`;
  }
  
  if (params) {
    // Sort keys to ensure consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, unknown>);
    
    key += `:${JSON.stringify(sortedParams)}`;
  }
  
  return key;
}