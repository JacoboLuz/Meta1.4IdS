// ArticleStorage.js - Persistencia usando IndexedDB
const ArticleStorage = (function() {
  const DB_NAME = 'ArticleReviewDB';
  const DB_VERSION = 2;
  const ARTICLES_STORE = 'articles';
  const STATUS_STORE = 'status';
  
  let db = null;

  const initDB = () => {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject('Error opening database');
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create articles store
        if (!db.objectStoreNames.contains(ARTICLES_STORE)) {
          const articleStore = db.createObjectStore(ARTICLES_STORE, { keyPath: 'id' });
          articleStore.createIndex('fileName', 'fileName', { unique: false });
          articleStore.createIndex('uploadDate', 'uploadDate', { unique: false });
          articleStore.createIndex('status', 'status', { unique: false });
        }

        // Create status history store
        if (!db.objectStoreNames.contains(STATUS_STORE)) {
          const statusStore = db.createObjectStore(STATUS_STORE, { keyPath: 'id', autoIncrement: true });
          statusStore.createIndex('articleId', 'articleId', { unique: false });
          statusStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  };

  // Save article with initial status
  const saveArticle = async (articleData) => {
    try {
      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE, STATUS_STORE], 'readwrite');
        
        const articleStore = transaction.objectStore(ARTICLES_STORE);
        const statusStore = transaction.objectStore(STATUS_STORE);

        // Generate ID if not present
        if (!articleData.id) {
          articleData.id = 'art_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Add timestamp
        articleData.uploadDate = articleData.uploadDate || new Date().toISOString();
        articleData.lastModified = new Date().toISOString();

        // Save article
        const articleRequest = articleStore.put(articleData);

        articleRequest.onsuccess = () => {
          // Create initial status entry
          const statusEntry = {
            articleId: articleData.id,
            status: articleData.status || 'pendiente',
            timestamp: new Date().toISOString(),
            notes: 'Artículo subido'
          };

          statusStore.put(statusEntry);
        };

        transaction.oncomplete = () => {
          resolve({ success: true, id: articleData.id });
        };

        transaction.onerror = (event) => {
          console.error('Transaction error:', event.target.error);
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error saving article:', error);
      throw error;
    }
  };

  // Get all articles
  const getAllArticles = async () => {
    try {
      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE], 'readonly');
        const store = transaction.objectStore(ARTICLES_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error getting articles:', error);
      return [];
    }
  };

  // Get article by ID
  const getArticleById = async (articleId) => {
    try {
      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE], 'readonly');
        const store = transaction.objectStore(ARTICLES_STORE);
        const request = store.get(articleId);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error getting article:', error);
      return null;
    }
  };

  // Update article status
  const updateArticleStatus = async (articleId, newStatus, notes = '') => {
    try {
      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE, STATUS_STORE], 'readwrite');
        
        const articleStore = transaction.objectStore(ARTICLES_STORE);
        const statusStore = transaction.objectStore(STATUS_STORE);

        // Get current article
        const getRequest = articleStore.get(articleId);

        getRequest.onsuccess = () => {
          const article = getRequest.result;
          if (article) {
            // Update article status
            article.status = newStatus;
            article.lastModified = new Date().toISOString();
            
            articleStore.put(article);

            // Create status history entry
            const statusEntry = {
              articleId: articleId,
              status: newStatus,
              timestamp: new Date().toISOString(),
              notes: notes
            };

            statusStore.put(statusEntry);
          }
        };

        transaction.oncomplete = () => {
          resolve({ success: true });
        };

        transaction.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  // Get status history for an article
  const getStatusHistory = async (articleId) => {
    try {
      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STATUS_STORE], 'readonly');
        const store = transaction.objectStore(STATUS_STORE);
        const index = store.index('articleId');
        const request = index.getAll(articleId);

        request.onsuccess = () => {
          resolve(request.result.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          ));
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error getting status history:', error);
      return [];
    }
  };

  // Delete article
  const deleteArticle = async (articleId) => {
    try {
      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([ARTICLES_STORE, STATUS_STORE], 'readwrite');
        
        const articleStore = transaction.objectStore(ARTICLES_STORE);
        const statusStore = transaction.objectStore(STATUS_STORE);
        const statusIndex = statusStore.index('articleId');

        // Delete article
        articleStore.delete(articleId);

        // Delete all status entries for this article
        const statusRequest = statusIndex.getAllKeys(articleId);
        
        statusRequest.onsuccess = () => {
          statusRequest.result.forEach(key => {
            statusStore.delete(key);
          });
        };

        transaction.oncomplete = () => {
          resolve({ success: true });
        };

        transaction.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  };

  // Public API
  return {
    saveArticle,
    getAllArticles,
    getArticleById,
    updateArticleStatus,
    getStatusHistory,
    deleteArticle
  };
})();