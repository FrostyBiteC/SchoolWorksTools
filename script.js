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
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                this.addFile(file);
            }
            
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
        }
    }

    addFile(file) {
        const fileId = this.generateFileId();
        const fileData = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            extension: this.getFileExtension(file.name),
            category: this.getFileCategory(file.type, file.name),
            pages: [],
            content: null
        };
        
        // Read file content based on file type
        this.readFileContent(file, fileData);
        
        this.files.push(fileData);
        
        if (!this.fileAreas[fileData.category]) {
            this.fileAreas[fileData.category] = [];
        }
        
        this.fileAreas[fileData.category].push(fileData);
    }

    readFileContent(file, fileData) {
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
                this.renderFileAreas();
                this.updateNavPanel();
            };
            reader.readAsDataURL(file);
        } else if (file.type.includes('text') || fileData.extension === 'txt') {
            // For text files, read as text
            reader.onload = (e) => {
                fileData.content = e.target.result;
                fileData.pages = this.splitTextIntoPages(e.target.result);
                this.renderFileAreas();
                this.updateNavPanel();
            };
            reader.readAsText(file);
        } else if (fileData.extension === 'pdf') {
            // For PDFs, create placeholder content (PDF.js would be needed for actual rendering)
            fileData.pages = this.generateMockPages(fileData.name);
            this.renderFileAreas();
            this.updateNavPanel();
        } else if (fileData.extension === 'doc' || fileData.extension === 'docx') {
            // For Word documents, create placeholder content
            fileData.pages = this.generateMockPages(fileData.name);
            this.renderFileAreas();
            this.updateNavPanel();
        } else {
            // For other file types, create placeholder content
            fileData.pages = this.generateMockPages(fileData.name);
            this.renderFileAreas();
            this.updateNavPanel();
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
        contentPreview.className = 'content-preview';
        
        if (file.type.includes('image')) {
            // Image preview
            const img = document.createElement('img');
            img.src = file.content;
            img.alt = file.name;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '200px';
            img.style.borderRadius = '4px';
            contentPreview.appendChild(img);
        } else if (file.type.includes('text') || file.extension === 'txt') {
            // Text preview
            const previewText = document.createElement('div');
            previewText.className = 'text-preview';
            const snippet = file.content.substring(0, 200);
            previewText.textContent = snippet + (file.content.length > 200 ? '...' : '');
            previewText.style.fontSize = '12px';
            previewText.style.color = '#666';
            previewText.style.marginTop = '10px';
            contentPreview.appendChild(previewText);
        }
        
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
            pageThumbnail.textContent = `Page ${page.number}`;
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
            max-width: 800px;
            max-height: 80vh;
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
            // PDF display placeholder
            const pdfViewer = document.createElement('div');
            pdfViewer.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 16px;
            `;
            pdfViewer.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                <p>PDF preview requires PDF.js library</p>
                <p style="font-size: 12px; margin-top: 10px;">This is a placeholder for PDF content</p>
                ${file.pages.length > 0 ? `<p style="font-size: 14px; margin-top: 10px;">Pages: ${file.pages.length}</p>` : ''}
            `;
            modalBody.appendChild(pdfViewer);
        } else if (file.extension === 'doc' || file.extension === 'docx') {
            // Word document display placeholder
            const docViewer = document.createElement('div');
            docViewer.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 16px;
            `;
            docViewer.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 10px;">📘</div>
                <p>Word document preview requires specialized library</p>
                <p style="font-size: 12px; margin-top: 10px;">This is a placeholder for document content</p>
                ${file.pages.length > 0 ? `<p style="font-size: 14px; margin-top: 10px;">Pages: ${file.pages.length}</p>` : ''}
            `;
            modalBody.appendChild(docViewer);
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
        if (savedFiles) {
            this.files = JSON.parse(savedFiles);
            
            this.fileAreas = {};
            this.files.forEach(file => {
                if (!this.fileAreas[file.category]) {
                    this.fileAreas[file.category] = [];
                }
                this.fileAreas[file.category].push(file);
            });
            
            this.renderFileAreas();
        }
    }
}

// Initialize file manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FileManager();
});