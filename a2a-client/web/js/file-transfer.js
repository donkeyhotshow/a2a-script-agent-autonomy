/**
 * File Transfer Module
 * Handles file upload and download in the web interface
 */

(function (global) {
    'use strict';

    const FileTransfer = {
        // Configuration
        apiBase: '/api/v1',
        sessionId: null,
        _listeners: new Map(),
        _uploadProgress: new Map(),
        
        // Configuration options
        config: {
            chunkSize: 1024 * 1024, // 1MB chunks
            maxFileSize: 100 * 1024 * 1024, // 100MB
            allowedTypes: null, // null = all types
            maxConcurrent: 3
        },

        /**
         * Configure file transfer
         */
        configure(options = {}) {
            if (options.apiBase) this.apiBase = options.apiBase.replace(/\/?$/, '');
            if (options.sessionId) this.sessionId = options.sessionId;
            if (options.chunkSize) this.config.chunkSize = options.chunkSize;
            if (options.maxFileSize) this.config.maxFileSize = options.maxFileSize;
            if (options.allowedTypes) this.config.allowedTypes = options.allowedTypes;
            return this;
        },

        /**
         * Get auth headers
         */
        _getHeaders() {
            const headers = {};
            const token = global.apiIntegration?.token;
            if (token) headers['Authorization'] = `Bearer ${token}`;
            return headers;
        },

        /**
         * Make request
         */
        async _request(method, path, options = {}) {
            const url = `${this.apiBase}${path}`;
            const headers = { ...this._getHeaders(), ...options.headers };
            
            const requestOptions = {
                method,
                headers
            };

            if (options.body) {
                requestOptions.body = options.body;
            }

            try {
                const response = await fetch(url, requestOptions);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data?.error?.message || `Request failed: ${response.status}`);
                }
                return data.data || data;
            } catch (error) {
                console.error('[FileTransfer] Request error:', error);
                throw error;
            }
        },

        /**
         * Upload file(s)
         */
        async uploadFile(file, options = {}) {
            const { sessionId = this.sessionId, onProgress = () => {} } = options;
            
            // Validate file
            if (file.size > this.config.maxFileSize) {
                throw new Error(`File too large. Max size: ${this.config.maxFileSize / 1024 / 1024}MB`);
            }

            // Check allowed types
            if (this.config.allowedTypes) {
                const ext = file.name.split('.').pop().toLowerCase();
                if (!this.config.allowedTypes.includes(ext)) {
                    throw new Error(`File type .${ext} not allowed`);
                }
            }

            const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this._uploadProgress.set(uploadId, {
                fileName: file.name,
                fileSize: file.size,
                uploaded: 0,
                status: 'uploading'
            });

            this.emit('uploadStart', { uploadId, fileName: file.name, fileSize: file.size });

            try {
                // For small files, use simple upload
                if (file.size <= this.config.chunkSize) {
                    return await this._uploadSimple(file, sessionId, uploadId, onProgress);
                } else {
                    // For large files, use chunked upload
                    return await this._uploadChunked(file, sessionId, uploadId, onProgress);
                }
            } catch (error) {
                this._uploadProgress.set(uploadId, { status: 'error', error: error.message });
                this.emit('uploadError', { uploadId, error });
                throw error;
            }
        },

        /**
         * Simple file upload
         */
        async _uploadSimple(file, sessionId, uploadId, onProgress) {
            const formData = new FormData();
            formData.append('file', file);
            if (sessionId) formData.append('sessionId', sessionId);

            const result = await this._request('POST', '/upload', {
                headers: {}, // Let browser set Content-Type for FormData
                body: formData
            });

            this._uploadProgress.set(uploadId, { status: 'complete', uploaded: file.size });
            this.emit('uploadComplete', { uploadId, result });
            onProgress(100);

            return result;
        },

        /**
         * Chunked file upload
         */
        async _uploadChunked(file, sessionId, uploadId, onProgress) {
            const totalChunks = Math.ceil(file.size / this.config.chunkSize);
            let uploaded = 0;

            // Initiate chunked upload
            const initResult = await this._request('POST', '/upload/init', {
                body: {
                    fileName: file.name,
                    fileSize: file.size,
                    chunkSize: this.config.chunkSize,
                    totalChunks,
                    sessionId
                }
            });

            const uploadUrl = initResult?.uploadUrl || initResult?.url;
            const uploadToken = initResult?.token;

            // Upload chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * this.config.chunkSize;
                const end = Math.min(start + this.config.chunkSize, file.size);
                const chunk = file.slice(start, end);

                await this._uploadChunk(chunk, i, totalChunks, uploadUrl, uploadToken);

                uploaded += chunk.size;
                const progress = Math.round((uploaded / file.size) * 100);
                
                this._uploadProgress.set(uploadId, { 
                    status: 'uploading', 
                    uploaded, 
                    total: file.size,
                    progress 
                });
                
                onProgress(progress);
                this.emit('uploadProgress', { uploadId, progress, uploaded, total: file.size });
            }

            // Complete upload
            const result = await this._request('POST', '/upload/complete', {
                body: {
                    token: uploadToken,
                    sessionId
                }
            });

            this._uploadProgress.set(uploadId, { status: 'complete', uploaded: file.size });
            this.emit('uploadComplete', { uploadId, result });

            return result;
        },

        /**
         * Upload single chunk
         */
        async _uploadChunk(chunk, index, total, url, token) {
            const headers = this._getHeaders();
            headers['Content-Type'] = 'application/octet-stream';
            headers['X-Chunk-Index'] = String(index);
            headers['X-Total-Chunks'] = String(total);
            if (token) headers['X-Upload-Token'] = token;

            await fetch(url, {
                method: 'POST',
                headers,
                body: chunk
            });
        },

        /**
         * Download file
         */
        async downloadFile(fileId, options = {}) {
            const { filename = 'download', onProgress = () => {} } = options;

            this.emit('downloadStart', { fileId, filename });

            try {
                // Get file info
                const fileInfo = await this._request('GET', `/files/${encodeURIComponent(fileId)}`);
                
                const url = fileInfo?.downloadUrl || fileInfo?.url;
                if (!url) {
                    throw new Error('No download URL available');
                }

                // Download file
                const response = await fetch(url, {
                    headers: this._getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`Download failed: ${response.status}`);
                }

                const blob = await response.blob();
                
                // Save file
                this._saveFile(blob, filename);

                this.emit('downloadComplete', { fileId, filename, size: blob.size });
                onProgress(100);

                return { filename, size: blob.size };
            } catch (error) {
                this.emit('downloadError', { fileId, error });
                throw error;
            }
        },

        /**
         * Save blob to file
         */
        _saveFile(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        /**
         * Render file upload UI to container
         */
        renderUploadUI(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const { 
                accept = '*',
                multiple = true,
                showProgress = true,
                onFileSelect = () => {},
                onUploadComplete = () => {},
                onUploadError = () => {}
            } = options;

            const uploadId = `file-upload-${Date.now()}`;

            container.innerHTML = `
                <div class="file-upload-container" id="${uploadId}">
                    <input type="file" 
                           id="${uploadId}_input" 
                           accept="${accept}" 
                           ${multiple ? 'multiple' : ''} 
                           class="file-upload-input">
                    <label for="${uploadId}_input" class="file-upload-label">
                        <span class="file-upload-icon">📁</span>
                        <span class="file-upload-text">Click or drag files here</span>
                    </label>
                    ${showProgress ? '<div class="file-upload-progress-container"></div>' : ''}
                </div>
            `;

            const input = container.querySelector(`#${uploadId}_input`);
            const progressContainer = container.querySelector('.file-upload-progress-container');

            // File selection handler
            input.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;

                onFileSelect(files);

                for (const file of files) {
                    try {
                        const result = await this.uploadFile(file, {
                            onProgress: (progress) => {
                                if (progressContainer) {
                                    this._renderProgress(progressContainer, file.name, progress);
                                }
                            }
                        });
                        onUploadComplete(result);
                    } catch (error) {
                        onUploadError(error);
                        if (progressContainer) {
                            progressContainer.innerHTML += `<div class="file-upload-error">Error uploading ${file.name}: ${error.message}</div>`;
                        }
                    }
                }

                // Reset input
                input.value = '';
            });

            // Drag and drop
            const dropZone = container.querySelector('.file-upload-label');
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                    const dataTransfer = new DataTransfer();
                    files.forEach(f => dataTransfer.items.add(f));
                    input.files = dataTransfer.files;
                    input.dispatchEvent(new Event('change'));
                }
            });
        },

        /**
         * Render progress bar
         */
        _renderProgress(container, filename, progress) {
            container.innerHTML = `
                <div class="file-upload-item">
                    <span class="file-upload-item-name">${escapeHtml(filename)}</span>
                    <div class="file-upload-item-progress">
                        <div class="file-upload-item-bar" style="width: ${progress}%"></div>
                    </div>
                    <span class="file-upload-item-percent">${progress}%</span>
                </div>
            `;
        },

        /**
         * Subscribe to events
         */
        on(event, callback) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        },

        /**
         * Unsubscribe from events
         */
        off(event, callback) {
            this._listeners.get(event)?.delete(callback);
        },

        /**
         * Emit event
         */
        emit(event, data) {
            this._listeners.get(event)?.forEach(cb => {
                try { cb(data); } catch (e) { console.error('[FileTransfer] Event error:', e); }
            });
        }
    };

    // Escape HTML helper
    function escapeHtml(s) {
        if (s == null) return '';
        const el = document.createElement('div');
        el.textContent = String(s);
        return el.innerHTML;
    }

    // Export
    global.FileTransfer = FileTransfer;

})(typeof window !== 'undefined' ? window : globalThis);
