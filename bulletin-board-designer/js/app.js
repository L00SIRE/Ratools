/**
 * Main Application
 * Orchestrates the Bulletin Board Designer
 */

class BulletinBoardDesigner {
    constructor() {
        // Core modules
        this.imageProcessor = new ImageProcessor();
        this.gridSplitter = new GridSplitter();
        this.printExporter = new PrintExporter();

        // State
        this.state = {
            originalImage: null,
            originalFile: null,
            targetWidth: 90,   // cm
            targetHeight: 60,  // cm
            dpi: 300,
            orientation: 'portrait',
            overlap: 10,       // mm
            algorithm: 'lanczos'
        };

        // DOM Elements
        this.elements = {};

        // Initialize
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.checkBrowserSupport();
        this.updateGridInfo();
    }

    cacheElements() {
        this.elements = {
            // Upload
            uploadSection: document.getElementById('uploadSection'),
            uploadZone: document.getElementById('uploadZone'),
            fileInput: document.getElementById('fileInput'),
            
            // Editor
            editorSection: document.getElementById('editorSection'),
            previewCanvas: document.getElementById('previewCanvas'),
            previewContainer: document.getElementById('previewContainer'),
            imageDimensions: document.getElementById('imageDimensions'),
            imageSize: document.getElementById('imageSize'),
            changeImageBtn: document.getElementById('changeImageBtn'),
            
            // Controls
            targetWidth: document.getElementById('targetWidth'),
            targetHeight: document.getElementById('targetHeight'),
            presetBtns: document.querySelectorAll('.preset-btn'),
            dpiBtns: document.querySelectorAll('.dpi-btn'),
            orientationBtns: document.querySelectorAll('.orientation-btn'),
            overlapRange: document.getElementById('overlapRange'),
            overlapValue: document.getElementById('overlapValue'),
            algorithmSelect: document.getElementById('algorithmSelect'),
            
            // Grid info
            gridCols: document.getElementById('gridCols'),
            gridRows: document.getElementById('gridRows'),
            totalPages: document.getElementById('totalPages'),
            upscaleFactor: document.getElementById('upscaleFactor'),
            
            // Buttons
            generateBtn: document.getElementById('generateBtn'),
            backToEditor: document.getElementById('backToEditor'),
            exportPngBtn: document.getElementById('exportPngBtn'),
            exportPdfBtn: document.getElementById('exportPdfBtn'),
            
            // Grid section
            gridSection: document.getElementById('gridSection'),
            gridWrapper: document.getElementById('gridWrapper'),
            gridSummary: document.getElementById('gridSummary'),
            overlapGuide: document.getElementById('overlapGuide'),
            
            // Modals
            progressModal: document.getElementById('progressModal'),
            progressTitle: document.getElementById('progressTitle'),
            progressText: document.getElementById('progressText'),
            progressFill: document.getElementById('progressFill'),
            progressPercent: document.getElementById('progressPercent'),
            helpModal: document.getElementById('helpModal'),
            helpBtn: document.getElementById('helpBtn'),
            closeHelpModal: document.getElementById('closeHelpModal')
        };
    }

    bindEvents() {
        // Upload zone events
        this.elements.uploadZone.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.uploadZone.classList.add('drag-over');
        });

        this.elements.uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.uploadZone.classList.remove('drag-over');
        });

        this.elements.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.elements.uploadZone.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Change image button
        this.elements.changeImageBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // Preset size buttons
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const width = parseInt(btn.dataset.width);
                const height = parseInt(btn.dataset.height);
                this.state.targetWidth = width;
                this.state.targetHeight = height;
                this.elements.targetWidth.value = width;
                this.elements.targetHeight.value = height;
                
                this.elements.presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.updateGridInfo();
            });
        });

        // DPI buttons
        this.elements.dpiBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.dpi = parseInt(btn.dataset.dpi);
                this.elements.dpiBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateGridInfo();
            });
        });

        // Orientation buttons
        this.elements.orientationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.orientation = btn.dataset.orientation;
                this.elements.orientationBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateGridInfo();
            });
        });

        // Size inputs
        const updateSizeDebounced = Utils.debounce(() => this.updateGridInfo(), 300);
        
        this.elements.targetWidth.addEventListener('input', (e) => {
            this.state.targetWidth = parseInt(e.target.value) || 60;
            this.elements.presetBtns.forEach(b => b.classList.remove('active'));
            updateSizeDebounced();
        });

        this.elements.targetHeight.addEventListener('input', (e) => {
            this.state.targetHeight = parseInt(e.target.value) || 40;
            this.elements.presetBtns.forEach(b => b.classList.remove('active'));
            updateSizeDebounced();
        });

        // Overlap slider
        this.elements.overlapRange.addEventListener('input', (e) => {
            this.state.overlap = parseInt(e.target.value);
            this.elements.overlapValue.textContent = `${this.state.overlap}mm`;
            this.updateGridInfo();
        });

        // Algorithm select
        this.elements.algorithmSelect.addEventListener('change', (e) => {
            this.state.algorithm = e.target.value;
        });

        // Generate button
        this.elements.generateBtn.addEventListener('click', () => {
            this.generateGrid();
        });

        // Back button
        this.elements.backToEditor.addEventListener('click', () => {
            this.showSection('editor');
        });

        // Export buttons
        this.elements.exportPngBtn.addEventListener('click', () => {
            this.exportZip();
        });

        this.elements.exportPdfBtn.addEventListener('click', () => {
            this.exportPdf();
        });

        // Help modal
        this.elements.helpBtn.addEventListener('click', () => {
            this.elements.helpModal.classList.remove('hidden');
        });

        this.elements.closeHelpModal.addEventListener('click', () => {
            this.elements.helpModal.classList.add('hidden');
        });

        this.elements.helpModal.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) {
                this.elements.helpModal.classList.add('hidden');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.elements.helpModal.classList.add('hidden');
            }
        });
    }

    checkBrowserSupport() {
        const support = Utils.checkBrowserSupport();
        if (!support.allSupported) {
            console.warn('Some features may not be supported:', support.supported);
        }
    }

    async handleFileSelect(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, WebP, BMP)');
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            alert('File is too large. Maximum size is 50MB.');
            return;
        }

        try {
            this.state.originalFile = file;
            
            // Load and display image
            const image = await Utils.loadImageFromFile(file);
            this.state.originalImage = image;
            this.imageProcessor.setImage(image);

            // Update info badges
            this.elements.imageDimensions.textContent = Utils.formatDimensions(
                image.naturalWidth,
                image.naturalHeight
            );
            this.elements.imageSize.textContent = Utils.formatFileSize(file.size);

            // Update grid info
            this.updateGridInfo();

            // Show editor section FIRST so container has dimensions
            this.showSection('editor');

            // Update preview after section is visible
            // Use requestAnimationFrame to ensure layout is calculated
            requestAnimationFrame(() => {
                this.updatePreview();
            });

        } catch (error) {
            console.error('Error loading image:', error);
            alert('Failed to load image. Please try another file.');
        }
    }

    updatePreview() {
        if (!this.state.originalImage) return;

        const canvas = this.elements.previewCanvas;
        const container = this.elements.previewContainer;
        const ctx = canvas.getContext('2d');

        const img = this.state.originalImage;
        
        // Get container dimensions, with fallbacks if still 0
        let containerWidth = container.clientWidth;
        let containerHeight = container.clientHeight;
        
        // Fallback dimensions if container hasn't rendered yet
        if (containerWidth === 0 || containerHeight === 0) {
            containerWidth = 600;
            containerHeight = 400;
        }

        // Calculate scale to fit container while maintaining aspect ratio
        const scale = Math.min(
            containerWidth / img.naturalWidth,
            containerHeight / img.naturalHeight,
            1 // Don't upscale for preview
        );

        // Ensure minimum dimensions
        canvas.width = Math.max(Math.round(img.naturalWidth * scale), 100);
        canvas.height = Math.max(Math.round(img.naturalHeight * scale), 100);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    updateGridInfo() {
        if (!this.state.originalImage) {
            this.elements.gridCols.textContent = '-';
            this.elements.gridRows.textContent = '-';
            this.elements.totalPages.textContent = '-';
            this.elements.upscaleFactor.textContent = '-';
            return;
        }

        const targetWidthMm = Utils.cmToMm(this.state.targetWidth);
        const targetHeightMm = Utils.cmToMm(this.state.targetHeight);

        const gridConfig = Utils.calculateGridDimensions(
            targetWidthMm,
            targetHeightMm,
            this.state.dpi,
            this.state.orientation,
            this.state.overlap
        );

        const upscaleFactor = Utils.calculateUpscaleFactor(
            this.state.originalImage.naturalWidth,
            this.state.originalImage.naturalHeight,
            gridConfig.targetWidthPx,
            gridConfig.targetHeightPx
        );

        this.elements.gridCols.textContent = gridConfig.cols;
        this.elements.gridRows.textContent = gridConfig.rows;
        this.elements.totalPages.textContent = gridConfig.totalPages;
        this.elements.upscaleFactor.textContent = upscaleFactor.toFixed(1) + '×';

        // Store config for later use
        this.currentGridConfig = gridConfig;
    }

    showSection(section) {
        this.elements.uploadSection.classList.add('hidden');
        this.elements.editorSection.classList.add('hidden');
        this.elements.gridSection.classList.add('hidden');

        switch (section) {
            case 'upload':
                this.elements.uploadSection.classList.remove('hidden');
                break;
            case 'editor':
                this.elements.editorSection.classList.remove('hidden');
                break;
            case 'grid':
                this.elements.gridSection.classList.remove('hidden');
                break;
        }
    }

    showProgress(title, text) {
        this.elements.progressTitle.textContent = title;
        this.elements.progressText.textContent = text;
        this.elements.progressFill.style.width = '0%';
        this.elements.progressPercent.textContent = '0%';
        this.elements.progressModal.classList.remove('hidden');
    }

    updateProgress(percent) {
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressPercent.textContent = `${Math.round(percent)}%`;
    }

    hideProgress() {
        this.elements.progressModal.classList.add('hidden');
    }

    async generateGrid() {
        if (!this.state.originalImage || !this.currentGridConfig) {
            alert('Please load an image first');
            return;
        }

        try {
            this.showProgress('Processing Image', 'Upscaling your image for high-quality printing...');

            // Step 1: Upscale image
            const upscaledCanvas = await this.imageProcessor.upscale(
                this.currentGridConfig.targetWidthPx,
                this.currentGridConfig.targetHeightPx,
                this.state.algorithm,
                (progress) => this.updateProgress(progress * 0.6) // 60% for upscaling
            );

            this.elements.progressText.textContent = 'Splitting into A4 tiles...';

            // Step 2: Split into tiles
            const config = {
                ...this.currentGridConfig,
                addCropMarks: true
            };

            await this.gridSplitter.splitIntoTiles(
                upscaledCanvas,
                config,
                (progress) => this.updateProgress(60 + progress * 0.4) // 40% for splitting
            );

            // Step 3: Generate thumbnails
            const tilesWithThumbnails = this.gridSplitter.generateThumbnails(180);

            // Step 4: Render grid preview
            this.renderGridPreview(tilesWithThumbnails);

            // Update summary
            this.elements.gridSummary.textContent = 
                `${config.cols} × ${config.rows} = ${config.totalPages} pages`;
            this.elements.overlapGuide.textContent = `${this.state.overlap}mm`;

            // Get original image as data URL for assembly guide
            const origCanvas = document.createElement('canvas');
            origCanvas.width = this.state.originalImage.naturalWidth;
            origCanvas.height = this.state.originalImage.naturalHeight;
            const origCtx = origCanvas.getContext('2d');
            origCtx.drawImage(this.state.originalImage, 0, 0);
            const originalImageDataUrl = origCanvas.toDataURL('image/jpeg', 0.9);

            // Set up exporter with original image for assembly guide
            this.printExporter.setTiles(this.gridSplitter.getTiles(), config, originalImageDataUrl);

            this.hideProgress();
            this.showSection('grid');

        } catch (error) {
            console.error('Error generating grid:', error);
            this.hideProgress();
            alert('Failed to generate grid. Please try again.');
        }
    }

    renderGridPreview(tiles) {
        const wrapper = this.elements.gridWrapper;
        wrapper.innerHTML = '';

        const cols = this.currentGridConfig.cols;
        wrapper.style.gridTemplateColumns = `repeat(${cols}, 180px)`;

        tiles.forEach((tile, index) => {
            const card = document.createElement('div');
            card.className = 'tile-card';
            card.style.aspectRatio = `${tile.thumbWidth} / ${tile.thumbHeight}`;

            card.innerHTML = `
                <img src="${tile.thumbnail}" alt="Tile ${index + 1}" class="tile-image">
                <span class="tile-number">${index + 1}</span>
                <button class="tile-download" data-index="${index}" title="Download this tile">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
            `;

            // Add click handler for individual tile download
            const downloadBtn = card.querySelector('.tile-download');
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.printExporter.exportSingleTile(index, 'png');
            });

            wrapper.appendChild(card);
        });
    }

    async exportZip() {
        try {
            this.showProgress('Exporting ZIP', 'Creating downloadable package...');
            
            await this.printExporter.exportAsZip(
                (progress) => this.updateProgress(progress)
            );

            this.hideProgress();

        } catch (error) {
            console.error('Error exporting ZIP:', error);
            this.hideProgress();
            alert('Failed to export ZIP. Please try again.');
        }
    }

    async exportPdf() {
        try {
            this.showProgress('Exporting PDF', 'Creating multi-page PDF document...');
            
            await this.printExporter.exportAsPdf(
                (progress) => this.updateProgress(progress)
            );

            this.hideProgress();

        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.hideProgress();
            alert('Failed to export PDF. Please try again.');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BulletinBoardDesigner();
});
