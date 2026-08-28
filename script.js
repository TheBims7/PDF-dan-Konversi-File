class ConverterApp {
    constructor() {
        // State
        this.currentConverter = null;
        this.selectedFiles = [];
        this.currentResult = null;
        this.currentResults = [];
        this.isDownloading = false;
        this.converterModal = null;
        this.resultModal = null;
        this.currentImageAspect = null;
        
        // Library references
        this.jsPDF = null;
        this.pdfjsLib = null;
        this.PDFLib = null;
        
        // Converter definitions - HANYA 3 FITUR
        this.converters = {
            'merge-pdf': {
                name: 'Gabungkan PDF',
                description: 'Menjadikan beberapa file PDF menjadi 1 File PDF',
                accept: ['application/pdf'],
                acceptLabel: 'PDF',
                multipleFiles: true
            },
            'resize-image': {
                name: 'Ubah Ukuran',
                description: 'Mengubah ukuran dimensi gambar (JPG/PNG)',
                accept: ['image/jpeg', 'image/png', 'image/jpg'],
                acceptLabel: 'JPG, PNG',
                showOptions: 'dimensions'
            },
            'compress-image': {
                name: 'Kompres Gambar',
                description: 'Memperkecil ukuran file Gambar atau Foto',
                accept: ['image/jpeg', 'image/png', 'image/jpg'],
                acceptLabel: 'JPG, PNG',
                showOptions: 'quality'
            }
        };
        
        this.init();
    }

    init() {
        console.log('Converter App initialized - 3 Fitur');
        
        this.initializeLibraries();
        this.setupModalInstances();
        this.setupEventListeners();
        this.setupCardListeners();
        this.setupOptionListeners();
        this.checkLibraries();
    }

    initializeLibraries() {
        console.log('Initializing libraries...');
        
        // jsPDF
        if (typeof window.jspdf !== 'undefined') {
            this.jsPDF = window.jspdf.jsPDF;
            console.log('jsPDF loaded');
        }
        
        // PDF.js
        if (typeof window.pdfjsLib !== 'undefined') {
            this.pdfjsLib = window.pdfjsLib;
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('PDF.js loaded');
        }
        
        // pdf-lib
        if (typeof window.PDFLib !== 'undefined') {
            this.PDFLib = window.PDFLib;
            console.log('pdf-lib loaded');
        }
    }

    setupModalInstances() {
        const converterModalEl = document.getElementById('converterModal');
        const resultModalEl = document.getElementById('resultModal');
        
        if (converterModalEl && typeof bootstrap !== 'undefined') {
            this.converterModal = new bootstrap.Modal(converterModalEl);
        }
        
        if (resultModalEl && typeof bootstrap !== 'undefined') {
            this.resultModal = new bootstrap.Modal(resultModalEl);
        }
    }

    setupCardListeners() {
        const cards = document.querySelectorAll('.content .card');
        const converterKeys = ['merge-pdf', 'resize-image', 'compress-image'];
        
        cards.forEach((card, index) => {
            card.addEventListener('click', () => {
                const key = converterKeys[index] || 'merge-pdf';
                this.openConverterModal(key);
            });
        });
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');
        const convertBtn = document.getElementById('convertBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (!dropZone || !fileInput || !browseBtn || !convertBtn) return;
        
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });
        
        convertBtn.addEventListener('click', () => {
            this.startConversion();
        });
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadResult();
            });
        }
    }

    setupOptionListeners() {
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', () => {
                qualityValue.textContent = qualitySlider.value + '%';
                this.previewCompressedSize(qualitySlider.value);
            });
        }
        
        const resizeWidth = document.getElementById('resizeWidth');
        const resizeHeight = document.getElementById('resizeHeight');
        const keepAspect = document.getElementById('keepAspectRatio');
        
        if (resizeWidth && resizeHeight && keepAspect) {
            resizeWidth.addEventListener('input', () => {
                if (keepAspect.checked && this.currentImageAspect) {
                    resizeHeight.value = Math.round(resizeWidth.value / this.currentImageAspect);
                }
            });
            
            resizeHeight.addEventListener('input', () => {
                if (keepAspect.checked && this.currentImageAspect) {
                    resizeWidth.value = Math.round(resizeHeight.value * this.currentImageAspect);
                }
            });
        }
    }

    openConverterModal(type) {
        this.currentConverter = type;
        const converter = this.converters[type];
        
        if (!converter) {
            console.error('Converter not found:', type);
            return;
        }
        
        this.selectedFiles = [];
        this.currentResults = [];
        this.currentImageAspect = null;
        this.isDownloading = false;
        
        document.getElementById('fileInput').value = '';
        document.getElementById('fileListContainer').style.display = 'none';
        document.getElementById('fileList').innerHTML = '';
        document.getElementById('fileCount').textContent = '0';
        document.getElementById('convertBtn').disabled = true;
        document.getElementById('sizePreview').style.display = 'none';
        
        const fileInput = document.getElementById('fileInput');
        fileInput.multiple = converter.multipleFiles || false;
        fileInput.accept = converter.accept.filter(type => type.includes('/')).join(',');
        
        this.showConverterOptions(converter.showOptions);
        
        document.getElementById('modalTitle').textContent = converter.name;
        document.getElementById('converterDescription').textContent = converter.description;
        document.getElementById('supportedFormats').textContent = converter.acceptLabel;
        
        if (this.converterModal) {
            this.converterModal.show();
        }
    }

    showConverterOptions(optionsType) {
        const optionPanels = ['formatOptions', 'qualityOptions', 'resizeOptions'];
        optionPanels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) panel.style.display = 'none';
        });
        
        if (optionsType === 'dimensions') {
            const panel = document.getElementById('resizeOptions');
            if (panel) panel.style.display = 'block';
        } else if (optionsType === 'quality') {
            const panel = document.getElementById('qualityOptions');
            if (panel) panel.style.display = 'block';
        }
        
        const sizePreview = document.getElementById('sizePreview');
        if (sizePreview) sizePreview.style.display = 'none';
    }

    handleFileSelection(files) {
        const converter = this.converters[this.currentConverter];
        const validFiles = [];
        const invalidFiles = [];
        
        Array.from(files).forEach(file => {
            if (this.validateFile(file, converter)) {
                const exists = this.selectedFiles.some(f => 
                    f.name === file.name && f.size === file.size
                );
                if (!exists) {
                    validFiles.push(file);
                }
            } else {
                invalidFiles.push(file);
            }
        });
        
        validFiles.forEach(file => {
            this.selectedFiles.push(file);
        });
        
        if (invalidFiles.length > 0) {
            this.showToast(
                `${invalidFiles.length} file tidak valid. Format: ${converter.acceptLabel}`,
                'warning'
            );
        }
        
        this.renderFileList();
        
        if (this.currentConverter === 'resize-image' && this.selectedFiles.length > 0) {
            this.loadImageDimensions(this.selectedFiles[0]);
        }
        
        if (this.currentConverter === 'compress-image' && this.selectedFiles.length > 0) {
            setTimeout(() => {
                const qualitySlider = document.getElementById('qualitySlider');
                if (qualitySlider) {
                    this.previewCompressedSize(qualitySlider.value);
                }
            }, 100);
        }
    }

    validateFile(file, converter) {
        if (converter.accept.includes(file.type)) {
            return true;
        }
        
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (converter.accept.includes(extension)) {
            return true;
        }
        
        return false;
    }

    renderFileList() {
        const fileListContainer = document.getElementById('fileListContainer');
        const fileList = document.getElementById('fileList');
        const fileCount = document.getElementById('fileCount');
        const convertBtn = document.getElementById('convertBtn');
        
        if (this.selectedFiles.length === 0) {
            fileListContainer.style.display = 'none';
            convertBtn.disabled = true;
            return;
        }
        
        fileListContainer.style.display = 'block';
        fileList.innerHTML = '';
        fileCount.textContent = this.selectedFiles.length;
        
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="bi ${this.getFileIcon(file)}"></i>
                </div>
                <div class="file-info">
                    <p class="file-name" title="${file.name}">${file.name}</p>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                </div>
                <span class="remove-file" data-index="${index}">
                    <i class="bi bi-x-circle"></i>
                </span>
            `;
            
            fileItem.querySelector('.remove-file').addEventListener('click', () => {
                this.removeFile(index);
            });
            
            fileList.appendChild(fileItem);
        });
        
        convertBtn.disabled = false;
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
        
        if (this.selectedFiles.length === 0) {
            document.getElementById('fileInput').value = '';
            document.getElementById('convertBtn').disabled = true;
            document.getElementById('sizePreview').style.display = 'none';
        }
    }

    getFileIcon(file) {
        if (file.type.includes('image')) return 'bi-file-image text-primary';
        if (file.type.includes('pdf')) return 'bi-filetype-pdf text-danger';
        return 'bi-file-earmark text-secondary';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async loadImageDimensions(file) {
        try {
            const img = await this.createImageFromFile(file);
            this.currentImageAspect = img.width / img.height;
            
            const resizeWidth = document.getElementById('resizeWidth');
            const resizeHeight = document.getElementById('resizeHeight');
            
            if (resizeWidth && resizeHeight) {
                resizeWidth.value = img.width;
                resizeHeight.value = img.height;
            }
        } catch (error) {
            console.error('Error loading image dimensions:', error);
        }
    }

    createImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async previewCompressedSize(quality) {
        if (this.currentConverter !== 'compress-image' || this.selectedFiles.length === 0) {
            return;
        }
        
        const file = this.selectedFiles[0];
        const sizePreview = document.getElementById('sizePreview');
        
        try {
            const img = await this.createImageFromFile(file);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const qualityValue = parseInt(quality) / 100;
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', qualityValue);
            });
            
            document.getElementById('originalSizePreview').textContent = 
                this.formatFileSize(file.size);
            document.getElementById('estimatedSize').textContent = 
                this.formatFileSize(blob.size);
            
            const reduction = ((file.size - blob.size) / file.size) * 100;
            const reductionEl = document.getElementById('sizeReduction');
            reductionEl.textContent = reduction > 0 ? 
                `${reduction.toFixed(1)}% lebih kecil` : 
                'Tidak ada pengurangan';
            reductionEl.className = reduction > 0 ? 'text-success' : 'text-warning';
            
            sizePreview.style.display = 'block';
        } catch (error) {
            console.error('Error previewing size:', error);
        }
    }

    async startConversion() {
        if (this.selectedFiles.length === 0) {
            this.showToast('Pilih file terlebih dahulu!', 'warning');
            return;
        }
        
        console.log(`Starting: ${this.converters[this.currentConverter].name}`);
        this.showLoading('Mengkonversi...');
        
        try {
            let result;
            
            switch (this.currentConverter) {
                case 'merge-pdf':
                    result = await this.mergePdf();
                    break;
                case 'resize-image':
                    result = await this.resizeImage();
                    break;
                case 'compress-image':
                    result = await this.compressImage();
                    break;
                default:
                    throw new Error('Converter belum diimplementasikan');
            }
            
            this.hideLoading();
            this.showResult(result);
            
        } catch (error) {
            this.hideLoading();
            this.showToast('Gagal konversi: ' + error.message, 'error');
            console.error('Conversion error:', error);
        }
    }

    // ============================================================
    // 1. MERGE PDF
    // ============================================================
    async mergePdf() {
        const pdfFiles = this.selectedFiles;
        
        if (pdfFiles.length < 2) {
            throw new Error('Pilih minimal 2 file PDF untuk digabungkan');
        }
        
        if (!this.PDFLib) {
            throw new Error('pdf-lib library tidak tersedia');
        }
        
        this.updateProgress('Membaca file PDF...', 20);
        
        const mergedPdf = await this.PDFLib.PDFDocument.create();
        
        for (let i = 0; i < pdfFiles.length; i++) {
            this.updateProgress(`Menggabungkan file ${i + 1} dari ${pdfFiles.length}...`, 
                20 + (i / pdfFiles.length) * 70);
            
            const arrayBuffer = await this.readFileAsArrayBuffer(pdfFiles[i]);
            const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
            
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        const mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        
        return {
            fileName: 'Gabungan PDF-' + Date.now() + '.pdf',
            fileSize: mergedPdfBlob.size,
            blob: mergedPdfBlob,
            mimeType: 'application/pdf'
        };
    }

    // ============================================================
    // 2. RESIZE IMAGE
    // ============================================================
    async resizeImage() {
        const imageFile = this.selectedFiles[0];
        const width = parseInt(document.getElementById('resizeWidth').value);
        const height = parseInt(document.getElementById('resizeHeight').value);
        
        if (!imageFile) {
            throw new Error('Pilih gambar terlebih dahulu');
        }
        
        if (!width || !height || width < 1 || height < 1) {
            throw new Error('Masukkan dimensi yang valid');
        }
        
        this.updateProgress('Mengubah ukuran gambar...', 50);
        
        const img = await this.createImageFromFile(imageFile);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        
        if (imageFile.type === 'image/png') {
            ctx.clearRect(0, 0, width, height);
        } else {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const mimeType = imageFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, mimeType, 0.92);
        });
        
        const extension = mimeType === 'image/png' ? 'png' : 'jpg';
        const fileName = imageFile.name.replace(/\.[^.]+$/, '') + `-resized-${width}x${height}.${extension}`;
        
        return {
            fileName: fileName,
            fileSize: blob.size,
            blob: blob,
            mimeType: mimeType
        };
    }

    // ============================================================
    // 3. COMPRESS IMAGE
    // ============================================================
    async compressImage() {
        const imageFile = this.selectedFiles[0];
        const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
        
        if (!imageFile) {
            throw new Error('Pilih gambar terlebih dahulu');
        }
        
        this.updateProgress('Mengkompres gambar...', 50);
        
        const img = await this.createImageFromFile(imageFile);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const mimeType = imageFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, mimeType, quality);
        });
        
        const extension = mimeType === 'image/png' ? 'png' : 'jpg';
        const fileName = imageFile.name.replace(/\.[^.]+$/, '') + `-compressed.${extension}`;
        
        return {
            fileName: fileName,
            fileSize: blob.size,
            blob: blob,
            mimeType: mimeType
        };
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    updateProgress(text, percentage) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingDetail').textContent = `${Math.round(percentage)}%`;
        
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = percentage + '%';
        progressBar.textContent = Math.round(percentage) + '%';
    }

    showResult(result) {
        const downloadBtn = document.getElementById('downloadBtn');
        const multipleFilesPreview = document.getElementById('multipleFilesPreview');
        
        // Sembunyikan multiple files preview
        multipleFilesPreview.style.display = 'none';
        downloadBtn.style.display = 'inline-block';
        
        // Selalu single file
        this.currentResult = result;
        this.currentResults = [];
        
        document.getElementById('resultFileName').textContent = result.fileName;
        document.getElementById('resultFileSize').textContent = 
            `Size: ${this.formatFileSize(result.fileSize)}`;
        
        // Tampilkan icon download di depan text
        downloadBtn.innerHTML = `<i class="bi bi-download me-2"></i> Download File`;
        downloadBtn.onclick = () => this.downloadResult();
        
        this.converterModal.hide();
        
        setTimeout(() => {
            if (this.resultModal) {
                this.resultModal.show();
            }
        }, 500);
    }

    downloadResult() {
        if (this.isDownloading) return;
        this.isDownloading = true;
        
        try {
            if (this.currentResult) {
                const url = URL.createObjectURL(this.currentResult.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.currentResult.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                this.showToast(`"${this.currentResult.fileName}" telah diunduh`, 'success');
            }
        } catch (error) {
            console.error('Error downloading:', error);
            this.showToast('Gagal mendownload file', 'error');
        } finally {
            setTimeout(() => this.isDownloading = false, 1000);
        }
    }

    showLoading(text = 'Memproses...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingDetail').textContent = '';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('progressContainer').style.display = 'none';
    }

    showToast(message, type = 'info') {
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `custom-toast ${type}`;
        
        const iconMap = {
            success: 'bi-check-circle',
            error: 'bi-exclamation-circle',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle'
        };
        
        toast.innerHTML = `
            <i class="bi ${iconMap[type] || 'bi-info-circle'} me-2"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    checkLibraries() {
        console.log('Library Status:');
        console.log(`Bootstrap: ${typeof bootstrap !== 'undefined' ? '✅' : '❌'}`);
        console.log(`jsPDF: ${this.jsPDF ? '✅' : '❌'}`);
        console.log(`PDF.js: ${this.pdfjsLib ? '✅' : '❌'}`);
        console.log(`pdf-lib: ${this.PDFLib ? '✅' : '❌'}`);
        console.log('App ready! 3 Fitur: Merge PDF, Resize Image, Compress Image');
    }
}

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    const app = new ConverterApp();
    window.app = app;
    console.log('Tips: Ketik "app" di console untuk akses instance');
});