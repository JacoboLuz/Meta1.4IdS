// OfflineService.js
const OfflineService = (function() {
  let listeners = [];
  let isOnline = navigator.onLine;
  let syncInProgress = false;

  // Initialize service
  const init = () => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check service worker support
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    console.log('OfflineService initialized, online status:', isOnline);
  };

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Check for background sync support
      if ('sync' in registration) {
        console.log('Background Sync supported');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  // Check availability (online/offline)
  const checkAvailability = () => {
    return {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      timestamp: new Date().toISOString()
    };
  };

  // Handle online event
  const handleOnline = () => {
    isOnline = true;
    notifyListeners({ type: 'online', timestamp: new Date().toISOString() });
    attemptSync();
  };

  // Handle offline event
  const handleOffline = () => {
    isOnline = false;
    notifyListeners({ type: 'offline', timestamp: new Date().toISOString() });
  };

  // Add listener for connectivity changes
  const addListener = (callback) => {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  };

  // Remove listener
  const removeListener = (callback) => {
    listeners = listeners.filter(listener => listener !== callback);
  };

  // Notify all listeners
  const notifyListeners = (event) => {
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in listener:', error);
      }
    });
  };

  // Attempt to sync pending data
  const attemptSync = async () => {
    if (syncInProgress || !navigator.onLine) {
      return;
    }

    syncInProgress = true;
    notifyListeners({ type: 'sync-start', timestamp: new Date().toISOString() });

    try {
      // Get all articles
      const articles = await ArticleManager.getAllArticles();
      
      // Filter articles that need sync (those with pending changes)
      const pendingArticles = articles.filter(article => 
        article.syncNeeded || article.status === 'pendiente'
      );

      if (pendingArticles.length > 0) {
        console.log(`Syncing ${pendingArticles.length} articles`);
        
        // Simulate sync to server
        for (const article of pendingArticles) {
          await syncArticle(article);
        }
      }

      notifyListeners({ 
        type: 'sync-complete', 
        timestamp: new Date().toISOString(),
        syncedCount: pendingArticles.length 
      });
    } catch (error) {
      console.error('Sync error:', error);
      notifyListeners({ 
        type: 'sync-error', 
        timestamp: new Date().toISOString(),
        error: error.message 
      });
    } finally {
      syncInProgress = false;
    }
  };

  // Sync individual article (simulated)
  const syncArticle = async (article) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Article synced:', article.id);
        
        // Mark as synced in storage
        article.syncNeeded = false;
        article.lastSynced = new Date().toISOString();
        
        // Update in storage (simplified)
        ArticleStorage.saveArticle(article);
        
        resolve();
      }, 500); // Simulate network delay
    });
  };

  // Check if we're online and cache is available
  const isCacheAvailable = async () => {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cache = await caches.open('article-reviewer-v1');
      const keys = await cache.keys();
      return keys.length > 0;
    } catch (error) {
      console.error('Error checking cache:', error);
      return false;
    }
  };

  // Get cache stats
  const getCacheStats = async () => {
    if (!('caches' in window)) {
      return { supported: false };
    }

    try {
      const cache = await caches.open('article-reviewer-v1');
      const keys = await cache.keys();
      
      return {
        supported: true,
        itemCount: keys.length,
        urls: keys.map(req => req.url)
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { supported: true, error: error.message };
    }
  };

  // Public API
  return {
    init,
    checkAvailability,
    addListener,
    removeListener,
    attemptSync,
    isCacheAvailable,
    getCacheStats
  };
})();