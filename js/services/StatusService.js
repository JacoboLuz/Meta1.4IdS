// StatusService.js
const StatusService = (function() {
  const VALID_STATUSES = ['pendiente', 'en_revision', 'revision_completada', 'aceptado', 'rechazado'];

  // Get current status of an article
  const getStatus = async (articleId) => {
    try {
      const article = await ArticleManager.getArticle(articleId);
      if (!article) {
        return {
          success: false,
          error: 'Artículo no encontrado'
        };
      }

      // Get status history for additional context
      const history = await ArticleStorage.getStatusHistory(articleId);

      return {
        success: true,
        currentStatus: article.status,
        lastUpdated: article.lastModified,
        history: history,
        validTransitions: getValidTransitions(article.status)
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Update article status
  const updateStatus = async (articleId, newStatus, notes = '') => {
    try {
      // Validate status
      if (!VALID_STATUSES.includes(newStatus)) {
        throw new Error(`Estado inválido: ${newStatus}`);
      }

      // Get current article to check transition validity
      const article = await ArticleManager.getArticle(articleId);
      if (!article) {
        throw new Error('Artículo no encontrado');
      }

      // Check if transition is valid
      const validTransitions = getValidTransitions(article.status);
      if (!validTransitions.includes(newStatus)) {
        throw new Error(`Transición inválida de ${article.status} a ${newStatus}`);
      }

      // Update in storage
      await ArticleStorage.updateArticleStatus(articleId, newStatus, notes);

      return {
        success: true,
        articleId: articleId,
        newStatus: newStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Get all articles with their current status
  const getAllStatuses = async () => {
    try {
      const articles = await ArticleManager.getAllArticles();
      
      // For each article, get full status info
      const statuses = await Promise.all(
        articles.map(async (article) => {
          const history = await ArticleStorage.getStatusHistory(article.id);
          return {
            articleId: article.id,
            title: article.title,
            fileName: article.fileName,
            currentStatus: article.status,
            uploadDate: article.uploadDate,
            lastModified: article.lastModified,
            history: history.slice(0, 3), // Last 3 status changes
            historyCount: history.length
          };
        })
      );

      return {
        success: true,
        statuses: statuses.sort((a, b) => 
          new Date(b.lastModified) - new Date(a.lastModified)
        )
      };
    } catch (error) {
      console.error('Error getting all statuses:', error);
      return {
        success: false,
        error: error.message,
        statuses: []
      };
    }
  };

  // Save initial status when article is created
  const saveInitialStatus = async (articleId) => {
    try {
      const article = await ArticleManager.getArticle(articleId);
      if (!article) {
        throw new Error('Artículo no encontrado');
      }

      // Status is already saved during article creation
      // This method is for ensuring initial status exists
      const history = await ArticleStorage.getStatusHistory(articleId);
      
      if (history.length === 0) {
        // If no history, create initial status
        await ArticleStorage.updateArticleStatus(articleId, article.status, 'Estado inicial');
      }

      return {
        success: true,
        articleId: articleId
      };
    } catch (error) {
      console.error('Error saving initial status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Get valid status transitions
  const getValidTransitions = (currentStatus) => {
    const transitions = {
      'pendiente': ['en_revision', 'rechazado'],
      'en_revision': ['revision_completada', 'rechazado'],
      'revision_completada': ['aceptado', 'rechazado', 'en_revision'],
      'aceptado': [],
      'rechazado': ['pendiente'] // Allow resubmission
    };

    return transitions[currentStatus] || [];
  };

  // Get status display info (colors, labels)
  const getStatusDisplayInfo = (status) => {
    const displayMap = {
      'pendiente': { label: 'Pendiente', color: '#f59e0b', bgColor: '#fffbeb' },
      'en_revision': { label: 'En Revisión', color: '#3b82f6', bgColor: '#eff6ff' },
      'revision_completada': { label: 'Revisión Completada', color: '#8b5cf6', bgColor: '#f5f3ff' },
      'aceptado': { label: 'Aceptado', color: '#10b981', bgColor: '#f0fdf4' },
      'rechazado': { label: 'Rechazado', color: '#ef4444', bgColor: '#fef2f2' }
    };

    return displayMap[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
  };

  return {
    getStatus,
    updateStatus,
    getAllStatuses,
    saveInitialStatus,
    getValidTransitions,
    getStatusDisplayInfo
  };
})();