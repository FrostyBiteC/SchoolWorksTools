// File Management System
class FileManager {
    constructor() {
        this.files = [];
        this.fileAreas = {};
        this.currentArea = null;
        this.currentFile = null;
        this.currentPage = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFiles();
    }

    setupEventListeners() {
        // Upload functionality
        const plusBtn = document.getElementById('plusBtn');
        const fileInput = document.getElementById('fileInput');
        const uploadBtn = document.getElementById('uploadBtn');
        
        plusBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        uploadBtn.addEventListener('click', () => fileInput.click());

        // Toggle between views
        const toggleBtn = document.getElementById('toggleBtn');
        const uploadSection = document.getElementById('uploadSection');
        const filesSection = document.getElementById('filesSection');

        toggleBtn.addEventListener('click', () => {
            const isUploading = uploadSection.classList.contains('active');
            uploadSection.classList.toggle('active');
            filesSection.classList.toggle('active');
            toggleBtn.textContent = isUploading ? 'Add Files' : 'View Files';
            toggleBtn.classList.toggle('active');
            
            if (!isUploading) {
                this.updateNavPanel();
            }
        });

        // Navigation
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        
        searchBtn.addEventListener('click', () => this.searchFiles());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchFiles();
            }
        });

        // Nav panel interactions
        document.addEventListener('click', (e) => {
            const navPanel = document.getElementById('navPanel');
            const isNavClick = navPanel.contains(e.target);
            const isNavToggle = e.target.classList.contains('toggle-btn');
            
            if (!isNavClick && !isNavToggle && navPanel.classList.contains('active')) {
                navPanel.classList.remove('active');
            }
        });
    }

    handleFileUpload(event) {
        const selectedFiles = event.target.files;
        
        if (selectedFiles.length > 0) {
            const fileReadPromises = [];
            
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const promise = new Promise((resolve) => {
                    this.addFile(file, resolve);
                });
                fileReadPromises.push(promise);
            }
            
            // Wait for all files to be read before saving and rendering
            Promise.all(fileReadPromises).then(() => {
                this.saveFiles();
                this.renderFileAreas();
                this.updateNavPanel();
                
                // Show files section after upload
                const uploadSection = document.getElementById('uploadSection');
                const filesSection = document.getElementById('filesSection');
                const toggleBtn = document.getElementById('toggleBtn');
                
                if (uploadSection.classList.contains('active')) {
                    uploadSection.classList.remove('active');
                    filesSection.classList.add('active');
                    toggleBtn.textContent = 'Add Files';
                    toggleBtn.classList.add('active');
                }
            });
        }
    }

    addFile(file, resolve) {
        const fileId = this.generateFileId();
        const extension = this.getFileExtension(file.name);
        // Ensure we have a proper MIME type for PDF files (sometimes browsers don't provide it)
        const mimeType = file.type || (extension === 'pdf' ? 'application/pdf' : 'application/octet-stream');
        
        const fileData = {
            id: fileId,
            name: file.name,
            type: mimeType,
            size: file.size,
            lastModified: file.lastModified,
            extension: extension,
            category: this.getFileCategory(mimeType, file.name),
            pages: [],
            content: null
        };
        
        console.log('Adding file:', fileData);
        
        // Read file content based on file type
        this.readFileContent(file, fileData, resolve);
        
        this.files.push(fileData);
        
        if (!this.fileAreas[fileData.category]) {
            this.fileAreas[fileData.category] = [];
        }
        
        this.fileAreas[fileData.category].push(fileData);
    }

     readFileContent(file, fileData, resolve) {
        const reader = new FileReader();
        
        if (file.type.includes('image')) {
            // For images, read as data URL
            reader.onload = (e) => {
                fileData.content = e.target.result;
                fileData.pages = [
                    {
                        number: 1,
                        content: e.target.result
                    }
                ];
                resolve(); // File reading complete
            };
            reader.readAsDataURL(file);
        } else if (file.type.includes('text') || fileData.extension === 'txt') {
            // For text files, read as text
            reader.onload = (e) => {
                fileData.content = e.target.result;
                fileData.pages = this.splitTextIntoPages(e.target.result);
                resolve(); // File reading complete
            };
            reader.readAsText(file);
        } else if (fileData.extension === 'pdf') {
            // For PDFs, read as data URL for embedding and count actual pages
            reader.onload = (e) => {
                fileData.content = e.target.result;
                
                // Use PDF.js to count actual pages and render thumbnails
                const arrayBuffer = this.dataURLToArrayBuffer(e.target.result);
                pdfjsLib.getDocument(arrayBuffer).promise.then(pdf => {
                    const pageCount = pdf.numPages;
                    const pages = [];
                    
                    // Render each page as a thumbnail
                    const pagePromises = [];
                    for (let i = 1; i <= pageCount; i++) {
                        const pagePromise = pdf.getPage(i).then(page => {
                            const viewport = page.getViewport({ scale: 0.3 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            
                            return page.render({
                                canvasContext: context,
                                viewport: viewport
                            }).promise.then(() => {
                                pages.push({
                                    number: i,
                                    content: canvas.toDataURL('image/png')
                                });
                            });
                        });
                        pagePromises.push(pagePromise);
                    }
                    
                    Promise.all(pagePromises).then(() => {
                        // Sort pages by number
                        fileData.pages = pages.sort((a, b) => a.number - b.number);
                        resolve(); // File reading complete
                    });
                }).catch(error => {
                    console.error('Error reading PDF:', error);
                    // Fallback to mock pages if PDF.js fails
                    fileData.pages = this.generateMockPages(fileData.name);
                    resolve(); // File reading complete (even with error)
                });
            };
            reader.readAsDataURL(file);
        } else if (fileData.extension === 'doc' || fileData.extension === 'docx') {
            // For Word documents, read as data URL and generate preview
            reader.onload = (e) => {
                fileData.content = e.target.result;
                // Generate preview pages with actual document content placeholder
                fileData.pages = [
                    { number: 1, content: `Document: ${fileData.name}\n\nThis is a preview of your Word document. For full functionality, please download and open the document.` }
                ];
                resolve(); // File reading complete
            };
            reader.readAsDataURL(file);
        } else if (fileData.extension === 'xlsx' || fileData.extension === 'xls') {
            // For Excel files, read as data URL and generate preview
            reader.onload = (e) => {
                fileData.content = e.target.result;
                fileData.pages = [
                    { number: 1, content: `Spreadsheet: ${fileData.name}\n\nThis is a preview of your Excel spreadsheet. For full functionality, please download and open the document.` }
                ];
                resolve(); // File reading complete
            };
            reader.readAsDataURL(file);
        } else if (fileData.extension === 'ppt' || fileData.extension === 'pptx') {
            // For PowerPoint files, read as data URL and generate preview
            reader.onload = (e) => {
                fileData.content = e.target.result;
                fileData.pages = [
                    { number: 1, content: `Presentation: ${fileData.name}\n\nThis is a preview of your PowerPoint presentation. For full functionality, please download and open the document.` }
                ];
                resolve(); // File reading complete
            };
            reader.readAsDataURL(file);
        } else {
            // For other file types, read as data URL
            reader.onload = (e) => {
                fileData.content = e.target.result;
                fileData.pages = [
                    { number: 1, content: `File: ${fileData.name}\n\nPreview not available for this file type. Please download to view.` }
                ];
                resolve(); // File reading complete
            };
            reader.readAsDataURL(file);
        }
    }

    splitTextIntoPages(text) {
        const pages = [];
        const pageSize = 500; // Characters per page
        let pageNumber = 1;
        
        for (let i = 0; i < text.length; i += pageSize) {
            const pageContent = text.substring(i, i + pageSize);
            pages.push({
                number: pageNumber,
                content: pageContent
            });
            pageNumber++;
        }
        
        return pages;
    }

    generateFileId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    getFileCategory(mimeType, filename) {
        const extension = this.getFileExtension(filename);
        
        if (['pdf'].includes(extension)) {
            return 'PDF Documents';
        } else if (['doc', 'docx'].includes(extension)) {
            return 'Word Documents';
        } else if (['txt'].includes(extension)) {
            return 'Text Files';
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
            return 'Images';
        } else {
            return 'Other Files';
        }
    }

    generateMockPages(filename) {
        const pageCount = Math.floor(Math.random() * 20) + 1;
        const pages = [];
        
        for (let i = 1; i <= pageCount; i++) {
            pages.push({
                number: i,
                content: `Page ${i} of ${filename}`
            });
        }
        
        return pages;
    }

    renderFileAreas() {
        const filesContainer = document.querySelector('.files-container');
        filesContainer.innerHTML = '';

        Object.keys(this.fileAreas).forEach(category => {
            const areaDiv = this.createFileArea(category);
            filesContainer.appendChild(areaDiv);
        });
    }

    createFileArea(category) {
        const areaDiv = document.createElement('div');
        areaDiv.className = 'file-area';
        areaDiv.dataset.category = category;
        
        const title = document.createElement('h3');
        title.textContent = category;
        
        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        
        this.fileAreas[category].forEach(file => {
            const fileItem = this.createFileItem(file);
            fileList.appendChild(fileItem);
        });
        
        areaDiv.appendChild(title);
        areaDiv.appendChild(fileList);
        
        return areaDiv;
    }

    createFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = file.id;
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        fileIcon.textContent = this.getFileIcon(file.extension);
        
        const fileDetails = document.createElement('div');
        fileDetails.className = 'file-details';
        
        const fileName = document.createElement('h4');
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('p');
        fileSize.textContent = this.formatFileSize(file.size);
        
        fileDetails.appendChild(fileName);
        fileDetails.appendChild(fileSize);
        
        fileInfo.appendChild(fileIcon);
        fileInfo.appendChild(fileDetails);
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'View';
        viewBtn.addEventListener('click', () => this.viewFile(file));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.deleteFile(file.id));
        
        fileActions.appendChild(viewBtn);
        fileActions.appendChild(deleteBtn);
        
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(fileActions);
        
        // Create content preview based on file type
        if (file.content) {
            const contentPreview = this.createContentPreview(file);
            fileItem.appendChild(contentPreview);
        }
        
        // Create pages preview if file has pages
        if (file.pages && file.pages.length > 1) {
            const pagesPreview = this.createPagesPreview(file);
            fileItem.appendChild(pagesPreview);
        }
        
        return fileItem;
    }

    createContentPreview(file) {
        const contentPreview = document.createElement('div');
        contentPreview.className = 'content-preview expanded';
        
        // Preview header with toggle button
        const previewHeader = document.createElement('div');
        previewHeader.className = 'preview-header';
        
        const previewTitle = document.createElement('h4');
        previewTitle.className = 'preview-title';
        previewTitle.textContent = 'Preview';
        
        const previewToggle = document.createElement('button');
        previewToggle.className = 'preview-toggle';
        previewToggle.textContent = 'Hide Preview';
        
        previewHeader.appendChild(previewTitle);
        previewHeader.appendChild(previewToggle);
        
        // Preview content container
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        previewContent.style.display = 'block';
        
        // Render appropriate preview based on file type
        if (file.type.includes('image')) {
            // Image preview
            const img = document.createElement('img');
            img.className = 'image-preview';
            img.src = file.content;
            img.alt = file.name;
            previewContent.appendChild(img);
        } else if (file.type.includes('text') || file.extension === 'txt') {
            // Text preview
            const previewText = document.createElement('div');
            previewText.className = 'text-preview';
            previewText.textContent = file.content;
            previewContent.appendChild(previewText);
        } else if (file.extension === 'pdf') {
            // PDF preview (embedded)
            const pdfPreview = document.createElement('object');
            pdfPreview.className = 'pdf-preview';
            pdfPreview.data = file.content;
            pdfPreview.type = 'application/pdf';
            pdfPreview.innerHTML = `
                <div class="doc-preview">
                    <div class="file-icon">📄</div>
                    <p>PDF Preview</p>
                    <p style="font-size: 12px; margin-top: 10px;">${file.name}</p>
                </div>
            `;
            previewContent.appendChild(pdfPreview);
        } else if (['doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx'].includes(file.extension)) {
            // Document preview
            const docPreview = document.createElement('div');
            docPreview.className = 'doc-preview';
            const icon = this.getFileIcon(file.extension);
            docPreview.innerHTML = `
                <div class="file-icon">${icon}</div>
                <p>${file.extension.toUpperCase()} Document</p>
                <p style="font-size: 12px; margin-top: 10px;">${file.name}</p>
            `;
            previewContent.appendChild(docPreview);
        } else {
            // Default preview
            const defaultPreview = document.createElement('div');
            defaultPreview.className = 'doc-preview';
            defaultPreview.innerHTML = `
                <div class="file-icon">📦</div>
                <p>File Preview</p>
                <p style="font-size: 12px; margin-top: 10px;">${file.name}</p>
            `;
            previewContent.appendChild(defaultPreview);
        }
        
        // Toggle functionality
        previewToggle.addEventListener('click', () => {
            const isExpanded = contentPreview.classList.contains('expanded');
            
            if (isExpanded) {
                contentPreview.classList.remove('expanded');
                previewContent.style.display = 'none';
                previewToggle.textContent = 'Show Preview';
            } else {
                contentPreview.classList.add('expanded');
                previewContent.style.display = 'block';
                previewToggle.textContent = 'Hide Preview';
            }
        });
        
        contentPreview.appendChild(previewHeader);
        contentPreview.appendChild(previewContent);
        
        return contentPreview;
    }

    getFileIcon(extension) {
        const icons = {
            pdf: '📄',
            doc: '📘',
            docx: '📘',
            txt: '📝',
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️'
        };
        
        return icons[extension] || '📦';
    }

    dataURLToArrayBuffer(dataURL) {
        const base64 = dataURL.split(',')[1];
        const binaryString = window.atob(base64);
        const arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }
        return arrayBuffer;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

     createPagesPreview(file) {
        const pagesPreview = document.createElement('div');
        pagesPreview.className = 'pages-preview';
        
        const pagesTitle = document.createElement('h4');
        pagesTitle.textContent = `Pages (${file.pages.length})`;
        
        const pagesGrid = document.createElement('div');
        pagesGrid.className = 'pages-grid';
        
        file.pages.slice(0, 6).forEach(page => {
            const pageThumbnail = document.createElement('div');
            pageThumbnail.className = 'page-thumbnail';
            
            // Display actual content preview based on file type
            if (file.type.includes('image')) {
                // Image thumbnail
                const img = document.createElement('img');
                img.src = page.content;
                img.alt = `Page ${page.number}`;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 6px;
                `;
                pageThumbnail.appendChild(img);
            } else if (file.extension === 'pdf' && page.content && page.content.startsWith('data:image')) {
                // PDF thumbnail
                const img = document.createElement('img');
                img.src = page.content;
                img.alt = `Page ${page.number}`;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 6px;
                `;
                pageThumbnail.appendChild(img);
            } else {
                // Text or other type thumbnail
                pageThumbnail.textContent = `Page ${page.number}`;
                if (page.content && page.content.length > 30) {
                    const previewText = page.content.substring(0, 30) + '...';
                    const previewDiv = document.createElement('div');
                    previewDiv.style.cssText = `
                        font-size: 10px;
                        margin-top: 5px;
                        text-align: center;
                        color: #999;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    `;
                    previewDiv.textContent = previewText;
                    pageThumbnail.appendChild(previewDiv);
                }
            }
            
            pageThumbnail.addEventListener('click', () => this.viewPage(file, page.number));
            pagesGrid.appendChild(pageThumbnail);
        });
        
        if (file.pages.length > 6) {
            const morePages = document.createElement('div');
            morePages.className = 'page-thumbnail';
            morePages.textContent = `+${file.pages.length - 6}`;
            morePages.style.fontStyle = 'italic';
            pagesGrid.appendChild(morePages);
        }
        
        pagesPreview.appendChild(pagesTitle);
        pagesPreview.appendChild(pagesGrid);
        
        return pagesPreview;
    }

    viewFile(file) {
        this.currentFile = file;
        this.currentArea = file.category;
        this.currentPage = null;
        
        this.updateNavPanel();
        this.highlightActiveArea();
        
        // Scroll to file area
        const fileArea = document.querySelector(`.file-area[data-category="${file.category}"]`);
        if (fileArea) {
            fileArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Show file content modal
        this.showFileModal(file);
    }

    showFileModal(file) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'file-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'file-modal-content';
        modalContent.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 900px;
            max-height: 90vh;
            width: 100%;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        `;
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
        `;
        
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = file.name;
        modalTitle.style.margin = '0';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.addEventListener('click', () => modal.remove());
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        
        // Modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'file-modal-body';
        
        // File preview based on type
        if (file.type.includes('image')) {
            // Image display
            const img = document.createElement('img');
            img.src = file.content;
            img.alt = file.name;
            img.style.cssText = `
                max-width: 100%;
                height: auto;
                border-radius: 4px;
            `;
            modalBody.appendChild(img);
        } else if (file.type.includes('text') || file.extension === 'txt') {
            // Text display
            const textContainer = document.createElement('pre');
            textContainer.textContent = file.content;
            textContainer.style.cssText = `
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.6;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                margin: 0;
                max-height: 60vh;
                overflow-y: auto;
            `;
            modalBody.appendChild(textContainer);
        } else if (file.extension === 'pdf') {
            // PDF display using data URL
            console.log('Displaying PDF file:', file);
            if (file.content && file.content.startsWith('data:')) {
                const pdfViewer = document.createElement('embed');
                pdfViewer.src = file.content;
                pdfViewer.type = 'application/pdf';
                pdfViewer.style.cssText = `
                    width: 100%;
                    height: 600px;
                    border-radius: 4px;
                `;
                modalBody.appendChild(pdfViewer);
            } else {
                console.error('Invalid PDF content - no data URL found');
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    padding: 20px;
                    text-align: center;
                    color: #e74c3c;
                    font-size: 16px;
                `;
                errorDiv.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                    <p>Failed to load PDF file</p>
                    <p style="font-size: 12px; margin-top: 10px;">The PDF content could not be loaded. Please try re-uploading the file.</p>
                `;
                modalBody.appendChild(errorDiv);
            }
         } else if (file.extension === 'doc' || file.extension === 'docx' || 
                   file.extension === 'xlsx' || file.extension === 'xls' || 
                   file.extension === 'ppt' || file.extension === 'pptx') {
            // Office document preview with Google Docs Viewer
            const officeViewer = document.createElement('div');
            officeViewer.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 16px;
            `;
            
            // Check if we have file content to create a download link
            let downloadLink = '';
            if (file.content) {
                downloadLink = `
                    <a href="${file.content}" download="${file.name}" 
                       style="display: inline-block; margin-top: 15px; padding: 10px 20px; 
                              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; text-decoration: none; border-radius: 25px; 
                              font-weight: 600; transition: all 0.3s ease;">
                        📥 Download ${file.name}
                    </a>
                `;
            }
            
            const fileIcons = {
                doc: '📘',
                docx: '📘',
                xls: '📊',
                xlsx: '📊',
                ppt: '📽️',
                pptx: '📽️'
            };
            
            // Try to use Google Docs Viewer for preview
            const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.content)}&embedded=true`;
            
            officeViewer.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">${fileIcons[file.extension] || '📄'}</div>
                <p>${file.extension.toUpperCase()} Document Preview</p>
                ${file.pages.length > 0 ? `<p style="font-size: 14px; margin-top: 10px;">Pages: ${file.pages.length}</p>` : ''}
                
                <div style="margin: 20px 0; height: 500px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
                    <iframe 
                        src="${googleViewerUrl}" 
                        width="100%" 
                        height="100%" 
                        frameborder="0"
                        style="border: none;"
                    >
                        <p>Your browser does not support iframes. Please download the document to view.</p>
                    </iframe>
                </div>
                
                <p style="font-size: 12px; margin-top: 10px;">
                    For best viewing experience, use the Google Docs Viewer or download and open in Microsoft Office
                </p>
                ${downloadLink}
            `;
            modalBody.appendChild(officeViewer);
        } else {
            // Other file types display
            const defaultViewer = document.createElement('div');
            defaultViewer.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 16px;
            `;
            defaultViewer.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                <p>Preview not available for this file type</p>
                <p style="font-size: 12px; margin-top: 10px;">${file.size > 0 ? this.formatFileSize(file.size) : ''}</p>
            `;
            modalBody.appendChild(defaultViewer);
        }
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

     viewPage(file, pageNumber) {
        this.currentFile = file;
        this.currentArea = file.category;
        this.currentPage = pageNumber;
        
        this.updateNavPanel();
        this.highlightActiveArea();
        
        console.log(`Viewing page ${pageNumber} of ${file.name}`);
        
        // Show page content modal
        this.showPageModal(file, pageNumber);
    }

    showPageModal(file, pageNumber) {
        const page = file.pages.find(p => p.number === pageNumber);
        if (!page) {
            console.error(`Page ${pageNumber} not found in file ${file.name}`);
            return;
        }
        
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'file-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'file-modal-content';
        modalContent.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 900px;
            max-height: 90vh;
            width: 100%;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        `;
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #e0e0e0;
        `;
        
        const modalTitle = document.createElement('h3');
        modalTitle.textContent = `${file.name} - Page ${pageNumber}`;
        modalTitle.style.margin = '0';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.addEventListener('click', () => modal.remove());
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        
        // Modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'page-modal-body';
        
        // Display page content based on file type
        if (file.type.includes('image')) {
            // Image display
            const img = document.createElement('img');
            img.src = page.content;
            img.alt = `${file.name} - Page ${pageNumber}`;
            img.style.cssText = `
                max-width: 100%;
                height: auto;
                border-radius: 4px;
            `;
            modalBody.appendChild(img);
        } else if (file.type.includes('text') || file.extension === 'txt') {
            // Text display
            const textContainer = document.createElement('pre');
            textContainer.textContent = page.content;
            textContainer.style.cssText = `
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 14px;
                line-height: 1.6;
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                margin: 0;
                max-height: 60vh;
                overflow-y: auto;
            `;
            modalBody.appendChild(textContainer);
        } else if (file.extension === 'pdf') {
            // PDF page display
            if (page.content && page.content.startsWith('data:image')) {
                // Display the rendered page thumbnail
                const img = document.createElement('img');
                img.src = page.content;
                img.alt = `${file.name} - Page ${pageNumber}`;
                img.style.cssText = `
                    max-width: 100%;
                    height: auto;
                    border-radius: 4px;
                `;
                modalBody.appendChild(img);
                
                // Add button to view full PDF
                const viewFullBtn = document.createElement('button');
                viewFullBtn.textContent = 'View Full PDF';
                viewFullBtn.style.cssText = `
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                `;
                viewFullBtn.addEventListener('click', () => {
                    modal.remove();
                    this.showFileModal(file);
                });
                modalBody.appendChild(viewFullBtn);
            } else {
                // Fallback to text preview
                const textContainer = document.createElement('div');
                textContainer.style.cssText = `
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-size: 16px;
                `;
                textContainer.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                    <p>Page ${pageNumber} of ${file.name}</p>
                    <p style="font-size: 12px; margin-top: 10px;">PDF page content not available</p>
                `;
                modalBody.appendChild(textContainer);
            }
        } else if (['doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx'].includes(file.extension)) {
            // Office document page display
            const docContainer = document.createElement('div');
            docContainer.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 16px;
            `;
            
            const fileIcons = {
                doc: '📘',
                docx: '📘',
                xls: '📊',
                xlsx: '📊',
                ppt: '📽️',
                pptx: '📽️'
            };
            
            docContainer.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">${fileIcons[file.extension] || '📄'}</div>
                <p>${file.extension.toUpperCase()} Document - Page ${pageNumber}</p>
                <p style="font-size: 14px; margin-top: 10px;">${page.content}</p>
            `;
            
            modalBody.appendChild(docContainer);
        } else {
            // Other file types display
            const defaultContainer = document.createElement('div');
            defaultContainer.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 16px;
            `;
            defaultContainer.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
                <p>Page ${pageNumber} of ${file.name}</p>
                <p style="font-size: 12px; margin-top: 10px;">Preview not available for this file type</p>
            `;
            modalBody.appendChild(defaultContainer);
        }
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modal.appendChild(modalContent);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }

    deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file?')) {
            const fileIndex = this.files.findIndex(file => file.id === fileId);
            if (fileIndex > -1) {
                const file = this.files[fileIndex];
                const categoryFiles = this.fileAreas[file.category];
                const categoryIndex = categoryFiles.findIndex(f => f.id === fileId);
                
                if (categoryIndex > -1) {
                    categoryFiles.splice(categoryIndex, 1);
                    
                    if (categoryFiles.length === 0) {
                        delete this.fileAreas[file.category];
                    }
                }
                
                this.files.splice(fileIndex, 1);
                this.saveFiles();
                this.renderFileAreas();
                this.updateNavPanel();
                
                if (this.currentFile?.id === fileId) {
                    this.currentFile = null;
                    this.currentPage = null;
                }
            }
        }
    }

    updateNavPanel() {
        const navPanel = document.getElementById('navPanel');
        navPanel.classList.add('active');
        
        this.updateAreaNav();
        this.updatePageNav();
    }

    updateAreaNav() {
        const areaNav = document.getElementById('areaNav');
        areaNav.innerHTML = '';
        
        Object.keys(this.fileAreas).forEach(category => {
            const li = document.createElement('li');
            li.textContent = `${category} (${this.fileAreas[category].length})`;
            li.addEventListener('click', () => this.navigateToArea(category));
            
            if (category === this.currentArea) {
                li.classList.add('active');
            }
            
            areaNav.appendChild(li);
        });
    }

    updatePageNav() {
        const pageNav = document.getElementById('pageNav');
        pageNav.innerHTML = '';
        
        if (this.currentFile && this.currentFile.pages) {
            this.currentFile.pages.forEach(page => {
                const li = document.createElement('li');
                li.textContent = `Page ${page.number}`;
                li.addEventListener('click', () => this.viewPage(this.currentFile, page.number));
                
                if (page.number === this.currentPage) {
                    li.classList.add('active');
                }
                
                pageNav.appendChild(li);
            });
        }
    }

    navigateToArea(category) {
        this.currentArea = category;
        this.currentFile = null;
        this.currentPage = null;
        
        this.highlightActiveArea();
        this.updateNavPanel();
        
        const fileArea = document.querySelector(`.file-area[data-category="${category}"]`);
        if (fileArea) {
            fileArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    highlightActiveArea() {
        document.querySelectorAll('.file-area').forEach(area => {
            area.style.borderColor = area.dataset.category === this.currentArea ? '#3498db' : '#e0e0e0';
            area.style.backgroundColor = area.dataset.category === this.currentArea ? '#f8f9fa' : '#fafafa';
        });
    }

    searchFiles() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm.trim() === '') {
            alert('Please enter a search term');
            return;
        }
        
        const results = this.files.filter(file => {
            return file.name.toLowerCase().includes(searchTerm) ||
                   file.pages.some(page => page.content.toLowerCase().includes(searchTerm));
        });
        
        if (results.length > 0) {
            const resultFiles = results.map(file => file.name).join('\n');
            alert(`Found ${results.length} file${results.length > 1 ? 's' : ''}:\n${resultFiles}`);
        } else {
            alert('No files matching your search term');
        }
    }

    saveFiles() {
        localStorage.setItem('uploadedFiles', JSON.stringify(this.files));
    }

    loadFiles() {
        const savedFiles = localStorage.getItem('uploadedFiles');
        console.log('Loading saved files from localStorage:', savedFiles);
        if (savedFiles) {
            try {
                this.files = JSON.parse(savedFiles);
                console.log('Parsed files:', this.files);
                
                // Ensure all files have proper properties and MIME types
                this.files = this.files.map(file => {
                    // Ensure we have a proper file type
                    if (!file.type || file.type === '') {
                        const extension = file.extension || this.getFileExtension(file.name);
                        file.type = extension === 'pdf' ? 'application/pdf' : 
                                   extension === 'txt' ? 'text/plain' :
                                   extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
                                   extension === 'png' ? 'image/png' :
                                   extension === 'gif' ? 'image/gif' :
                                   'application/octet-stream';
                    }
                    
                    // Ensure we have extension property
                    if (!file.extension) {
                        file.extension = this.getFileExtension(file.name);
                    }
                    
                    // Ensure we have category property
                    if (!file.category) {
                        file.category = this.getFileCategory(file.type, file.name);
                    }
                    
                    // Ensure pages array exists
                    if (!file.pages || !Array.isArray(file.pages)) {
                        file.pages = this.generateMockPages(file.name);
                    }
                    
                    return file;
                });
                
                this.fileAreas = {};
                this.files.forEach(file => {
                    if (!this.fileAreas[file.category]) {
                        this.fileAreas[file.category] = [];
                    }
                    this.fileAreas[file.category].push(file);
                });
                
                console.log('File areas created:', this.fileAreas);
                this.renderFileAreas();
            } catch (error) {
                console.error('Error loading files from localStorage:', error);
                // Clear invalid localStorage data
                localStorage.removeItem('uploadedFiles');
                this.files = [];
                this.fileAreas = {};
            }
        }
    }
}

// Initialize file manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FileManager();
});