// ArticleManager.js
const ArticleManager = (function() {
  // Upload article with validation
  const uploadArticle = async (file, metadata = {}) => {
    try {
      // Validate file
      const fileValidation = ValidationService.validateFile(file);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.errors.join('. '));
      }

      // Convert file to Base64
      const fileContent = await fileToBase64(file);

      // Create article object
      const article = {
        id: 'art_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileType: fileValidation.fileType,
        fileSize: file.size,
        fileContent: fileContent,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
        authors: metadata.authors || ['Autor pendiente'],
        abstract: metadata.abstract || '',
        keywords: metadata.keywords || [],
        status: 'pendiente',
        uploadDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: 1
      };

      // Save to storage
      const result = await ArticleStorage.saveArticle(article);
      
      return {
        success: true,
        articleId: result.id,
        article: article
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Error al subir el artículo'
      };
    }
  };

  // Get article by ID
  const getArticle = async (articleId) => {
    try {
      const article = await ArticleStorage.getArticleById(articleId);
      return article || null;
    } catch (error) {
      console.error('Error getting article:', error);
      return null;
    }
  };

  // Get all articles
  const getAllArticles = async () => {
    try {
      return await ArticleStorage.getAllArticles();
    } catch (error) {
      console.error('Error getting all articles:', error);
      return [];
    }
  };

  // Update article metadata
  const updateArticle = async (articleId, updates) => {
    try {
      const article = await ArticleStorage.getArticleById(articleId);
      if (!article) {
        throw new Error('Artículo no encontrado');
      }

      // Update fields
      Object.assign(article, updates);
      article.lastModified = new Date().toISOString();
      article.version = (article.version || 1) + 1;

      // Save back (using saveArticle which does put)
      await ArticleStorage.saveArticle(article);
      
      return {
        success: true,
        article: article
      };
    } catch (error) {
      console.error('Error updating article:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Delete article
  const deleteArticle = async (articleId) => {
    try {
      await ArticleStorage.deleteArticle(articleId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting article:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Helper: File to Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return {
    uploadArticle,
    getArticle,
    getAllArticles,
    updateArticle,
    deleteArticle
  };
})();