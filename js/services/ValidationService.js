// ValidationService.js
const ValidationService = (function() {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };

  const validateFile = (file) => {
    const errors = [];

    if (!file) {
      errors.push('No se seleccionó ningún archivo');
      return { valid: false, errors };
    }

    // Check file type
    if (!ALLOWED_TYPES[file.type]) {
      errors.push('Tipo de archivo no permitido. Usa PDF, DOCX o TXT');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`El archivo excede los 10MB (tamaño: ${formatFileSize(file.size)})`);
    }

    // Check file name (no empty, no path traversal)
    if (!file.name || file.name.includes('..') || file.name.includes('/')) {
      errors.push('Nombre de archivo inválido');
    }

    return {
      valid: errors.length === 0,
      errors,
      fileType: ALLOWED_TYPES[file.type] || 'unknown',
      fileSize: file.size,
      fileName: file.name
    };
  };

  const validateArticleMetadata = (metadata) => {
    const errors = [];

    if (!metadata.title || metadata.title.trim().length < 3) {
      errors.push('El título debe tener al menos 3 caracteres');
    }

    if (!metadata.authors || !Array.isArray(metadata.authors) || metadata.authors.length === 0) {
      errors.push('Debe especificar al menos un autor');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return {
    validateFile,
    validateArticleMetadata,
    formatFileSize
  };
})();