// src/utils/storageHelpers.ts

const STORAGE_PREFIX = 'bid_brilliance_';

export const storage = {
  // User
  setUserId: (userId: string) => {
    localStorage.setItem(`${STORAGE_PREFIX}userId`, userId);
  },

  getUserId: () => {
    return localStorage.getItem(`${STORAGE_PREFIX}userId`);
  },

  setUserToken: (token: string) => {
    localStorage.setItem(`${STORAGE_PREFIX}token`, token);
  },

  getUserToken: () => {
    return localStorage.getItem(`${STORAGE_PREFIX}token`);
  },

  clearUser: () => {
    localStorage.removeItem(`${STORAGE_PREFIX}userId`);
    localStorage.removeItem(`${STORAGE_PREFIX}token`);
  },

  // Preferences
  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem(`${STORAGE_PREFIX}theme`, theme);
  },

  getTheme: () => {
    return localStorage.getItem(`${STORAGE_PREFIX}theme`) || 'light';
  },

  // Recent searches
  setRecentSearches: (searches: string[]) => {
    localStorage.setItem(`${STORAGE_PREFIX}recent_searches`, JSON.stringify(searches));
  },

  getRecentSearches: () => {
    const item = localStorage.getItem(`${STORAGE_PREFIX}recent_searches`);
    return item ? JSON.parse(item) : [];
  },

  addRecentSearch: (query: string) => {
    const searches = storage.getRecentSearches();
    const updated = [query, ...searches.filter((s) => s !== query)].slice(0, 10);
    storage.setRecentSearches(updated);
  },

  // Watchlist (local cache)
  setCachedWatchlist: (items: any[]) => {
    localStorage.setItem(`${STORAGE_PREFIX}watchlist_cache`, JSON.stringify(items));
  },

  getCachedWatchlist: () => {
    const item = localStorage.getItem(`${STORAGE_PREFIX}watchlist_cache`);
    return item ? JSON.parse(item) : [];
  },

  // Notifications read status
  setNotificationReadStatus: (notificationId: number, isRead: boolean) => {
    const key = `${STORAGE_PREFIX}notif_${notificationId}_read`;
    localStorage.setItem(key, String(isRead));
  },

  isNotificationRead: (notificationId: number) => {
    const key = `${STORAGE_PREFIX}notif_${notificationId}_read`;
    return localStorage.getItem(key) === 'true';
  },

  // Clear all
  clearAll: () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },
};
