/**
 * Utility Functions
 * Helper functions for the Bulletin Board Designer
 */

// A4 Paper Constants (in mm)
const A4 = {
    WIDTH_MM: 210,
    HEIGHT_MM: 297,
    WIDTH_PORTRAIT_MM: 210,
    HEIGHT_PORTRAIT_MM: 297,
    WIDTH_LANDSCAPE_MM: 297,
    HEIGHT_LANDSCAPE_MM: 210
};

// Convert mm to pixels at given DPI
function mmToPixels(mm, dpi) {
    return Math.round((mm / 25.4) * dpi);
}

// Convert pixels to mm at given DPI
function pixelsToMm(pixels, dpi) {
    return (pixels * 25.4) / dpi;
}

// Convert cm to mm
function cmToMm(cm) {
    return cm * 10;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format dimensions
function formatDimensions(width, height) {
    return `${width} × ${height} px`;
}

// Calculate grid dimensions
function calculateGridDimensions(targetWidthMm, targetHeightMm, dpi, orientation, overlapMm) {
    // Get A4 dimensions based on orientation
    const a4Width = orientation === 'portrait' ? A4.WIDTH_PORTRAIT_MM : A4.WIDTH_LANDSCAPE_MM;
    const a4Height = orientation === 'portrait' ? A4.HEIGHT_PORTRAIT_MM : A4.HEIGHT_LANDSCAPE_MM;
    
    // Effective printable area (accounting for overlap)
    const effectiveWidth = a4Width - overlapMm;
    const effectiveHeight = a4Height - overlapMm;
    
    // Calculate number of columns and rows needed
    const cols = Math.ceil(targetWidthMm / effectiveWidth);
    const rows = Math.ceil(targetHeightMm / effectiveHeight);
    
    // Calculate actual dimensions in pixels
    const a4WidthPx = mmToPixels(a4Width, dpi);
    const a4HeightPx = mmToPixels(a4Height, dpi);
    const overlapPx = mmToPixels(overlapMm, dpi);
    
    // Target dimensions in pixels (what the upscaled image should be)
    const targetWidthPx = mmToPixels(targetWidthMm, dpi);
    const targetHeightPx = mmToPixels(targetHeightMm, dpi);
    
    return {
        cols,
        rows,
        totalPages: cols * rows,
        a4WidthPx,
        a4HeightPx,
        overlapPx,
        targetWidthPx,
        targetHeightPx,
        effectiveWidthPx: a4WidthPx - overlapPx,
        effectiveHeightPx: a4HeightPx - overlapPx
    };
}

// Calculate required upscale factor
function calculateUpscaleFactor(originalWidth, originalHeight, targetWidthPx, targetHeightPx) {
    const scaleX = targetWidthPx / originalWidth;
    const scaleY = targetHeightPx / originalHeight;
    return Math.max(scaleX, scaleY);
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Sleep/delay function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Load image from file
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Load image from URL
function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
    });
}

// Convert canvas to blob
function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality);
    });
}

// Download blob as file - uses data URL for file:// protocol compatibility
function downloadBlob(blob, filename) {
    // Convert blob to data URL for reliable downloads
    const reader = new FileReader();
    reader.onload = function() {
        const dataUrl = reader.result;
        forceDownload(dataUrl, filename);
    };
    reader.readAsDataURL(blob);
}

// Force download with proper filename - works with file:// protocol
function forceDownload(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    
    // For Safari and older browsers
    a.setAttribute('target', '_blank');
    
    document.body.appendChild(a);
    
    // Use setTimeout to ensure the download attribute takes effect
    setTimeout(() => {
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);
    }, 0);
}

// Generate unique ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Check if browser supports required features
function checkBrowserSupport() {
    const supported = {
        canvas: !!document.createElement('canvas').getContext,
        fileReader: !!window.FileReader,
        blob: !!window.Blob,
        url: !!window.URL,
        dragDrop: 'draggable' in document.createElement('div')
    };
    
    const allSupported = Object.values(supported).every(v => v);
    
    return {
        supported,
        allSupported
    };
}

// Export utilities
window.Utils = {
    A4,
    mmToPixels,
    pixelsToMm,
    cmToMm,
    formatFileSize,
    formatDimensions,
    calculateGridDimensions,
    calculateUpscaleFactor,
    clamp,
    debounce,
    sleep,
    loadImageFromFile,
    loadImageFromUrl,
    canvasToBlob,
    downloadBlob,
    forceDownload,
    generateId,
    checkBrowserSupport
};
