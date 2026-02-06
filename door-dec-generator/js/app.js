/**
 * Main Application Logic for Door Dec Generator
 */
document.addEventListener('DOMContentLoaded', () => {
    // Canvas & Modules
    const canvas = document.getElementById('previewCanvas');
    const designer = new DoorDecDesigner(canvas);
    const exporter = new DoorDecExporter();

    // State
    const state = {
        baseShape: 'circle',
        baseSize: 10,
        baseColor: '#6366f1',
        
        layer2Type: 'none',
        detailShape: 'circle',
        detailColor: '#ffffff',
        customImage: null,
        
        font: 'Inter',
        textColor: '#0f172a',
        textBg: true,
        
        names: ['Resident Name'],
        exportMode: 'combined'
    };

    // UI Elements
    const els = {
        baseShapeBtns: document.querySelectorAll('#baseShapeSelector .shape-btn'),
        baseSize: document.getElementById('baseSize'),
        baseColor: document.getElementById('baseColor'),
        
        layer2Type: document.getElementById('layer2Type'),
        layer2ShapeControls: document.getElementById('layer2ShapeControls'),
        layer2ImageControls: document.getElementById('layer2ImageControls'),
        detailShapeBtns: document.querySelectorAll('#detailShapeSelector .shape-btn'),
        detailColor: document.getElementById('detailColor'),
        uploadImageBtn: document.getElementById('uploadImageBtn'),
        imageInput: document.getElementById('imageInput'),
        
        fontSelect: document.getElementById('fontSelect'),
        textColor: document.getElementById('textColor'),
        textBgCheck: document.getElementById('textBgCheck'),
        
        nameInput: document.getElementById('nameInput'),
        nameCount: document.getElementById('nameCount'),
        previewNameLabel: document.getElementById('previewNameLabel'),
        
        exportRadios: document.getElementsByName('exportMode'),
        generateBtn: document.getElementById('generateBtn')
    };

    // --- Event Listeners ---

    // Base Layer
    els.baseShapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.baseShapeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.baseShape = btn.dataset.shape;
            updatePreview();
        });
    });

    els.baseSize.addEventListener('input', (e) => {
        state.baseSize = parseInt(e.target.value) || 10;
        updatePreview(); // Size change doesn't dramatically affect preview scaling, but good to trigger
    });

    els.baseColor.addEventListener('input', (e) => {
        state.baseColor = e.target.value;
        updatePreview();
    });

    // Layer 2
    els.layer2Type.addEventListener('change', (e) => {
        state.layer2Type = e.target.value;
        els.layer2ShapeControls.classList.add('hidden');
        els.layer2ImageControls.classList.add('hidden');
        
        if (state.layer2Type === 'shape') {
            els.layer2ShapeControls.classList.remove('hidden');
        } else if (state.layer2Type === 'image') {
            els.layer2ImageControls.classList.remove('hidden');
        }
        updatePreview();
    });

    els.detailShapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.detailShapeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.detailShape = btn.dataset.shape;
            updatePreview();
        });
    });

    els.detailColor.addEventListener('input', (e) => {
        state.detailColor = e.target.value;
        updatePreview();
    });

    els.uploadImageBtn.addEventListener('click', () => els.imageInput.click());
    els.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    state.customImage = img;
                    updatePreview();
                    els.uploadImageBtn.textContent = 'Change Image';
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Text Layer
    els.fontSelect.addEventListener('change', (e) => {
        state.font = e.target.value;
        updatePreview();
    });

    els.textColor.addEventListener('input', (e) => {
        state.textColor = e.target.value;
        updatePreview();
    });

    els.textBgCheck.addEventListener('change', (e) => {
        state.textBg = e.target.checked;
        updatePreview();
    });

    // Names
    els.nameInput.addEventListener('input', (e) => {
        const text = e.target.value;
        // Split by newline and filter empty lines
        const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        
        state.names = names.length > 0 ? names : ['Resident Name'];
        els.nameCount.textContent = `${state.names.length} names`;
        
        // Use first name for preview
        els.previewNameLabel.textContent = names.length > 1 
            ? `Preview: ${state.names[0]} (+${state.names.length-1} others)` 
            : state.names[0];
            
        updatePreview();
    });

    // Export
    Array.from(els.exportRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.exportMode = e.target.value;
        });
    });


    // --- Smart Pencil Setup ---
    const drawCanvas = document.getElementById('drawCanvas');
    const hintText = document.getElementById('hintText');
    const drawModeToggle = document.getElementById('drawModeToggle');
    
    // Sync canvas size
    function resizeDrawCanvas() {
        const rect = canvas.getBoundingClientRect();
        drawCanvas.width = rect.width;
        drawCanvas.height = rect.height;
    }
    
    const smartPencil = new SmartPencil(drawCanvas, (shape) => {
        // Auto-select the detected shape
        console.log('Detected Shape:', shape);
        
        // Find button with this shape
        const targetBtn = Array.from(els.baseShapeBtns).find(b => b.dataset.shape === shape);
        if (targetBtn) {
            targetBtn.click();
            // Flash feedback
            hintText.innerHTML = `✨ Magic! Detected a <b>${shape}</b>`;
            setTimeout(() => hintText.innerHTML = '💡 Tip: Draw another shape or toggle off!', 2000);
        }
    });

    drawModeToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        smartPencil.setEnabled(enabled);
        drawCanvas.classList.toggle('active', enabled);
        
        if (enabled) {
            resizeDrawCanvas();
            hintText.textContent = '✏️ Draw a rough shape (circle, square, star) on the preview!';
        } else {
            hintText.textContent = '💡 Tip: Layer different colored paper for a professional look!';
        }
    });
    
    // Handle window resize for overlay
    window.addEventListener('resize', () => {
        if (drawModeToggle.checked) resizeDrawCanvas();
    });

    els.generateBtn.addEventListener('click', async () => {
        const originalText = els.generateBtn.innerHTML;
        els.generateBtn.innerHTML = 'Generating...';
        els.generateBtn.disabled = true;
        
        // Get fill option for separated mode
        const fillSeparated = document.getElementById('fillSeparated')?.checked || false;
        state.fillSeparated = fillSeparated;
        
        try {
            await exporter.generatePDF(state.names, state, designer);
        } catch (err) {
            console.error(err);
            alert('Error generating PDF');
        } finally {
            els.generateBtn.innerHTML = originalText;
            els.generateBtn.disabled = false;
        }
    });

    // Initial Render
    function updatePreview() {
        // Use the first name in the list for preview
        const previewName = (state.names && state.names.length > 0 && state.names[0] !== 'Resident Name') 
            ? state.names[0] 
            : 'Resident Name';
            
        designer.render(state, previewName);
    }
    
    // Start with a render
    updatePreview();
});
