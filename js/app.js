// app.js - Main Application

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Offline Service
    OfflineService.init();
    
    // Set up offline listener
    OfflineService.addListener(handleConnectivityChange);
    
    // Load initial data
    await loadArticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check initial connectivity
    updateOnlineStatus();
});

// ========== UI Components ==========

// ArticleUploadForm Component
const ArticleUploadForm = {
    render: () => {
        return `
            <div class="card">
                <h2 class="card-title">📤 Subir nuevo artículo</h2>
                
                <div class="form-group">
                    <label for="article-title">Título del artículo</label>
                    <input type="text" id="article-title" placeholder="Ej: Estudio sobre inteligencia artificial...">
                </div>

                <div class="form-group">
                    <label for="article-authors">Autores (separados por coma)</label>
                    <input type="text" id="article-authors" placeholder="Juan Pérez, María García, ...">
                </div>

                <div class="form-group">
                    <label for="article-abstract">Resumen</label>
                    <textarea id="article-abstract" rows="3" placeholder="Breve resumen del artículo..."></textarea>
                </div>

                <div class="form-group">
                    <label for="file-input">Archivo del artículo</label>
                    <input type="file" id="file-input" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">
                    <div class="file-info">Formatos: PDF, DOCX, TXT (máx 10MB)</div>
                </div>

                <button id="upload-btn" class="btn btn-primary" disabled>
                    <span>📦</span> Subir artículo
                </button>

                <div id="upload-message" class="message-area"></div>
            </div>
        `;
    },

    init: () => {
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-btn');
        const titleInput = document.getElementById('article-title');
        const authorsInput = document.getElementById('article-authors');
        const abstractInput = document.getElementById('article-abstract');

        // Enable/disable upload button based on file selection
        fileInput.addEventListener('change', () => {
            uploadBtn.disabled = !fileInput.files[0];
        });

        // Handle upload
        uploadBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) return;

            // Show loading state
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="spinner"></span> Subiendo...';

            // Prepare metadata
            const metadata = {
                title: titleInput.value.trim() || file.name.replace(/\.[^/.]+$/, ''),
                authors: authorsInput.value.split(',').map(a => a.trim()).filter(a => a),
                abstract: abstractInput.value.trim()
            };

            // Upload article
            const result = await ArticleManager.uploadArticle(file, metadata);

            if (result.success) {
                showMessage('upload-message', '✅ Artículo subido correctamente', 'success');
                
                // Reset form
                fileInput.value = '';
                titleInput.value = '';
                authorsInput.value = '';
                abstractInput.value = '';
                
                // Reload articles list
                await loadArticles();
                
                // Switch to status tab
                switchTab('status');
            } else {
                showMessage('upload-message', `❌ Error: ${result.error}`, 'error');
            }

            // Reset button
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span>📦</span> Subir artículo';
        });
    }
};

// ArticleStatusView Component
const ArticleStatusView = {
    render: () => {
        return `
            <div class="card">
                <h2 class="card-title">📋 Estado de artículos</h2>
                <div id="status-list" class="articles-grid">
                    <div style="text-align: center; padding: 2rem; color: var(--gray-500); grid-column: 1/-1;">
                        Cargando artículos...
                    </div>
                </div>
            </div>

            <div id="status-detail-modal" style="display: none;">
                <!-- Modal for status details will be injected here -->
            </div>
        `;
    },

    load: async () => {
        const statusList = document.getElementById('status-list');
        
        try {
            const result = await StatusService.getAllStatuses();
            
            if (!result.success || result.statuses.length === 0) {
                statusList.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--gray-500); grid-column: 1/-1;">
                        📭 No hay artículos subidos
                    </div>
                `;
                return;
            }

            statusList.innerHTML = result.statuses.map(status => {
                const displayInfo = StatusService.getStatusDisplayInfo(status.currentStatus);
                
                return `
                    <div class="article-card" data-article-id="${status.articleId}">
                        <div class="article-header">
                            <div>
                                <div class="article-title">${status.title}</div>
                                <div class="article-meta">
                                    ${ValidationService.formatFileSize(status.fileSize || 0)} • 
                                    ${new Date(status.uploadDate).toLocaleDateString()}
                                </div>
                            </div>
                            <span class="status-badge" style="
                                background: ${displayInfo.bgColor};
                                color: ${displayInfo.color};
                                border: 1px solid ${displayInfo.color}20;
                            ">${displayInfo.label}</span>
                        </div>
                        
                        <div class="article-authors">
                            ${status.authors ? status.authors.join(', ') : 'Sin autor'}
                        </div>

                        <div class="status-history">
                            <div style="font-size:0.875rem; color:var(--gray-600); margin-bottom:0.5rem;">
                                Últimos cambios:
                            </div>
                            ${status.history.slice(0, 2).map(h => `
                                <div class="status-history-item">
                                    <span class="status-history-date">
                                        ${new Date(h.timestamp).toLocaleDateString()}
                                    </span>
                                    <span class="status-history-status">
                                        ${StatusService.getStatusDisplayInfo(h.status).label}
                                    </span>
                                    <span class="status-history-notes">${h.notes || ''}</span>
                                </div>
                            `).join('')}
                            ${status.historyCount > 2 ? `
                                <div style="font-size:0.75rem; color:var(--primary); margin-top:0.5rem; cursor:pointer;" 
                                     onclick="showFullHistory('${status.articleId}')">
                                    Ver historial completo (+${status.historyCount - 2})
                                </div>
                            ` : ''}
                        </div>

                        <div class="article-actions">
                            <button class="btn btn-secondary" onclick="viewArticle('${status.articleId}')" style="flex:1;">
                                👁️ Ver
                            </button>
                            <button class="btn btn-secondary" onclick="updateArticleStatus('${status.articleId}')" style="flex:1;">
                                ✏️ Cambiar estado
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading statuses:', error);
            statusList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--danger); grid-column: 1/-1;">
                    ❌ Error al cargar artículos
                </div>
            `;
        }
    },

    showFullHistory: async (articleId) => {
        const result = await StatusService.getStatus(articleId);
        if (!result.success) return;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-bottom: 1rem;">Historial de estados</h3>
                ${result.history.map(h => `
                    <div style="display: flex; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-200);">
                        <div style="min-width: 80px; color: var(--gray-500);">${new Date(h.timestamp).toLocaleDateString()}</div>
                        <div style="min-width: 100px; font-weight: 500;">${StatusService.getStatusDisplayInfo(h.status).label}</div>
                        <div style="color: var(--gray-600);">${h.notes || ''}</div>
                    </div>
                `).join('')}
                <button onclick="this.closest('div[style*="fixed"]').remove()" class="btn btn-primary" style="margin-top: 1rem; width: 100%;">
                    Cerrar
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }
};

// ArticleViewer Component
// ArticleViewer Component
const ArticleViewer = {
    show: async (articleId) => {
        const article = await ArticleManager.getArticle(articleId);
        if (!article) return;

        // Crear modal con identificador único
        const modal = document.createElement('div');
        modal.className = 'viewer-modal'; // Clase específica
        modal.setAttribute('data-modal-type', 'viewer');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const displayInfo = StatusService.getStatusDisplayInfo(article.status);

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
                <!-- Botón X para cerrar -->
                <button onclick="closeModal(this)" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--gray-500); padding: 0.5rem; line-height: 1;">&times;</button>
                
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; padding-right: 2rem;">
                    <h3 style="font-size: 1.25rem;">${article.title}</h3>
                    <span class="status-badge" style="
                        background: ${displayInfo.bgColor};
                        color: ${displayInfo.color};
                        border: 1px solid ${displayInfo.color}20;
                    ">${displayInfo.label}</span>
                </div>

                <div style="margin-bottom: 1rem;">
                    <strong>Autores:</strong> ${article.authors ? article.authors.join(', ') : 'No especificado'}
                </div>

                <div style="margin-bottom: 1rem;">
                    <strong>Resumen:</strong>
                    <p style="margin-top: 0.25rem; color: var(--gray-600);">${article.abstract || 'Sin resumen'}</p>
                </div>

                <div style="background: var(--gray-100); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                    <div><strong>Archivo:</strong> ${article.fileName}</div>
                    <div><strong>Tamaño:</strong> ${ValidationService.formatFileSize(article.fileSize)}</div>
                    <div><strong>Subido:</strong> ${new Date(article.uploadDate).toLocaleString()}</div>
                    <div><strong>Última modificación:</strong> ${new Date(article.lastModified).toLocaleString()}</div>
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button onclick="downloadArticle('${article.id}')" class="btn btn-primary" style="flex:1;">
                        📥 Descargar
                    </button>
                    <button onclick="closeModal(this)" class="btn btn-secondary" style="flex:1;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Cerrar al hacer clic en el fondo
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModalByElement(modal);
            }
        });
    },

    download: (article) => {
        // Extract base64 content
        const base64Content = article.fileContent.split(',')[1] || article.fileContent;
        const contentType = article.fileContent.split(',')[0]?.split(':')[1]?.split(';')[0] || 'application/octet-stream';
        
        // Create blob and download
        try {
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = article.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading:', error);
            alert('Error al descargar el archivo');
        }
    }
};

// ========== Helper Functions ==========

// Show message in message area
const showMessage = (elementId, text, type) => {
    const area = document.getElementById(elementId);
    if (area) {
        area.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => {
            area.innerHTML = '';
        }, 5000);
    }
};

// Update online status display
const updateOnlineStatus = () => {
    const status = OfflineService.checkAvailability();
    const statusElement = document.getElementById('online-status');
    
    if (statusElement) {
        statusElement.className = `online-status ${status.isOnline ? 'online' : 'offline'}`;
        statusElement.innerHTML = `
            <span class="status-indicator"></span>
            ${status.isOnline ? 'Conectado' : 'Trabajando offline'}
        `;
    }

    // Show/hide offline banner
    let banner = document.getElementById('offline-banner');
    if (!status.isOnline) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.className = 'offline-banner';
            banner.innerHTML = '⚠️ Estás trabajando offline. Los cambios se sincronizarán cuando vuelvas a tener conexión.';
            document.querySelector('.app-container').insertBefore(banner, document.querySelector('.tabs'));
        }
    } else if (banner) {
        banner.remove();
        // Attempt sync when coming back online
        OfflineService.attemptSync();
    }
};

// Handle connectivity change
const handleConnectivityChange = (event) => {
    updateOnlineStatus();
    showMessage('status-message', 
        event.type === 'online' ? '🔄 Conexión restablecida. Sincronizando...' : '📴 Modo offline activado',
        event.type === 'online' ? 'success' : 'info'
    );
};

// Load articles and update status view
const loadArticles = async () => {
    await ArticleStatusView.load();
};

// Switch between tabs
const switchTab = (tabId) => {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
};

// Setup all event listeners
const setupEventListeners = () => {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Initialize upload form
    ArticleUploadForm.init();

    // Check online status periodically
    setInterval(updateOnlineStatus, 30000);
};

// ========== Global Functions (for onclick handlers) ==========

window.viewArticle = async (articleId) => {
    await ArticleViewer.show(articleId);
};

window.downloadArticle = async (articleId) => {
    const article = await ArticleManager.getArticle(articleId);
    if (article) {
        ArticleViewer.download(article);
    }
};

window.updateArticleStatus = async (articleId) => {
    const statuses = ['pendiente', 'en_revision', 'revision_completada', 'aceptado', 'rechazado'];
    
    // Create status update modal
    const modal = document.createElement('div');
    modal.className = 'status-modal'; // Añadir clase para identificar el modal
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%;">
            <h3 style="margin-bottom: 1rem;">Actualizar estado</h3>
            <select id="status-select" class="form-group" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem;">
                ${statuses.map(s => `<option value="${s}">${StatusService.getStatusDisplayInfo(s).label}</option>`).join('')}
            </select>
            <textarea id="status-notes" placeholder="Notas (opcional)" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--gray-300); border-radius: 8px;" rows="3"></textarea>
            <div style="display: flex; gap: 1rem;">
                <button onclick="confirmStatusUpdate('${articleId}')" class="btn btn-primary" style="flex:1;">Actualizar</button>
                <button onclick="closeModal(this)" class="btn btn-secondary" style="flex:1;">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
	
};

// Nueva función para cerrar modal específicamente
window.closeModal = (buttonElement) => {
    // Encuentra el modal padre (el elemento con clase 'status-modal' o el div con position fixed)
    const modal = buttonElement.closest('.status-modal') || 
                  buttonElement.closest('div[style*="fixed"]');
    if (modal) {
        modal.remove();
    }
};

// Actualizar confirmStatusUpdate para usar el mismo método de cierre
window.confirmStatusUpdate = async (articleId) => {
    const select = document.getElementById('status-select');
    const notes = document.getElementById('status-notes');
    const newStatus = select.value;
    
    // Deshabilitar botones durante la operación
    const modal = document.querySelector('.status-modal, div[style*="fixed"]');
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    try {
        const result = await StatusService.updateStatus(articleId, newStatus, notes.value);
        
        if (result.success) {
            // Close modal
            if (modal) modal.remove();
            
            // Reload status view
            await loadArticles();
            
            showMessage('status-message', '✅ Estado actualizado correctamente', 'success');
        } else {
            alert('Error: ' + result.error);
            // Rehabilitar botones
            buttons.forEach(btn => btn.disabled = false);
        }
    } catch (error) {
        alert('Error: ' + error.message);
        buttons.forEach(btn => btn.disabled = false);
    }
};

window.confirmStatusUpdate = async (articleId) => {
    const select = document.getElementById('status-select');
    const notes = document.getElementById('status-notes');
    const newStatus = select.value;
    
    const result = await StatusService.updateStatus(articleId, newStatus, notes.value);
    
    if (result.success) {
        // Close modal
        document.querySelector('div[style*="fixed"]').remove();
        
        // Reload status view
        await loadArticles();
        
        showMessage('status-message', '✅ Estado actualizado correctamente', 'success');
    } else {
        alert('Error: ' + result.error);
    }
};

window.showFullHistory = async (articleId) => {
    await ArticleStatusView.showFullHistory(articleId);
};

// ========== Render Initial UI ==========

const renderApp = () => {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="app-container">
            <header class="app-header">
                <h1>📚 Revisor de Artículos Académicos</h1>
                <div id="online-status" class="online-status online">
                    <span class="status-indicator"></span>
                    Conectado
                </div>
            </header>

            <div class="tabs">
                <button class="tab-btn active" data-tab="upload">📤 Subir artículo</button>
                <button class="tab-btn" data-tab="status">📋 Estados</button>
            </div>

            <div id="upload-tab" class="tab-content active">
                ${ArticleUploadForm.render()}
            </div>

            <div id="status-tab" class="tab-content">
                ${ArticleStatusView.render()}
                <div id="status-message" class="message-area"></div>
            </div>
        </div>
    `;
};

// Start the app
renderApp();