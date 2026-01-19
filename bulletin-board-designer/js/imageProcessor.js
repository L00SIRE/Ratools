/**
 * Image Processor
 * Handles image upscaling with various algorithms
 */

class ImageProcessor {
    constructor() {
        this.originalImage = null;
        this.processedCanvas = null;
    }

    /**
     * Set the source image
     * @param {HTMLImageElement} image 
     */
    setImage(image) {
        this.originalImage = image;
        this.processedCanvas = null;
    }

    /**
     * Get original image dimensions
     */
    getOriginalDimensions() {
        if (!this.originalImage) return null;
        return {
            width: this.originalImage.naturalWidth,
            height: this.originalImage.naturalHeight
        };
    }

    /**
     * Upscale image using specified algorithm
     * @param {number} targetWidth 
     * @param {number} targetHeight 
     * @param {string} algorithm - 'bilinear', 'bicubic', or 'lanczos'
     * @param {function} progressCallback - Optional progress callback
     * @returns {Promise<HTMLCanvasElement>}
     */
    async upscale(targetWidth, targetHeight, algorithm = 'lanczos', progressCallback = null) {
        if (!this.originalImage) {
            throw new Error('No image loaded');
        }

        const srcWidth = this.originalImage.naturalWidth;
        const srcHeight = this.originalImage.naturalHeight;

        // Calculate aspect-ratio preserving dimensions
        const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
        const newWidth = Math.round(srcWidth * scale);
        const newHeight = Math.round(srcHeight * scale);

        if (progressCallback) progressCallback(0);

        // Create source canvas
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = srcWidth;
        srcCanvas.height = srcHeight;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(this.originalImage, 0, 0);

        if (progressCallback) progressCallback(10);

        // Choose upscaling method based on algorithm
        let result;
        switch (algorithm) {
            case 'bilinear':
                result = await this.upscaleBilinear(srcCanvas, newWidth, newHeight, progressCallback);
                break;
            case 'bicubic':
                result = await this.upscaleBicubic(srcCanvas, newWidth, newHeight, progressCallback);
                break;
            case 'lanczos':
            default:
                result = await this.upscaleLanczos(srcCanvas, newWidth, newHeight, progressCallback);
                break;
        }

        this.processedCanvas = result;
        
        if (progressCallback) progressCallback(100);
        
        return result;
    }

    /**
     * Simple bilinear upscaling using browser's built-in scaling
     */
    async upscaleBilinear(srcCanvas, targetWidth, targetHeight, progressCallback) {
        const destCanvas = document.createElement('canvas');
        destCanvas.width = targetWidth;
        destCanvas.height = targetHeight;
        const destCtx = destCanvas.getContext('2d');
        
        // Use high-quality image smoothing
        destCtx.imageSmoothingEnabled = true;
        destCtx.imageSmoothingQuality = 'high';
        destCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);
        
        if (progressCallback) progressCallback(90);
        
        return destCanvas;
    }

    /**
     * Bicubic upscaling - multi-step approach for better quality
     */
    async upscaleBicubic(srcCanvas, targetWidth, targetHeight, progressCallback) {
        let currentCanvas = srcCanvas;
        let currentWidth = srcCanvas.width;
        let currentHeight = srcCanvas.height;
        
        const steps = [];
        let w = currentWidth;
        let h = currentHeight;
        
        // Plan upscaling steps (2x at a time for better quality)
        while (w < targetWidth || h < targetHeight) {
            w = Math.min(w * 2, targetWidth);
            h = Math.min(h * 2, targetHeight);
            steps.push({ width: w, height: h });
        }
        
        // Make sure final step reaches target
        if (steps.length === 0 || steps[steps.length - 1].width !== targetWidth || steps[steps.length - 1].height !== targetHeight) {
            steps.push({ width: targetWidth, height: targetHeight });
        }
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const destCanvas = document.createElement('canvas');
            destCanvas.width = step.width;
            destCanvas.height = step.height;
            const destCtx = destCanvas.getContext('2d');
            
            destCtx.imageSmoothingEnabled = true;
            destCtx.imageSmoothingQuality = 'high';
            destCtx.drawImage(currentCanvas, 0, 0, step.width, step.height);
            
            currentCanvas = destCanvas;
            
            if (progressCallback) {
                progressCallback(10 + (80 * (i + 1) / steps.length));
            }
            
            // Allow UI to update
            await Utils.sleep(0);
        }
        
        return currentCanvas;
    }

    /**
     * Lanczos resampling - highest quality upscaling
     * Uses a simplified approach that still produces excellent results
     */
    async upscaleLanczos(srcCanvas, targetWidth, targetHeight, progressCallback) {
        // For very large upscales, use stepped approach with Lanczos-like filtering
        const scale = targetWidth / srcCanvas.width;
        
        if (scale <= 2) {
            // Single step with high quality
            return this.lanczosResample(srcCanvas, targetWidth, targetHeight, progressCallback);
        } else {
            // Multi-step for extreme upscales
            let currentCanvas = srcCanvas;
            let currentScale = 1;
            const targetScale = scale;
            let stepNum = 0;
            const totalSteps = Math.ceil(Math.log2(scale));
            
            while (currentScale < targetScale) {
                const nextScale = Math.min(currentScale * 2, targetScale);
                const nextWidth = Math.round(srcCanvas.width * nextScale);
                const nextHeight = Math.round(srcCanvas.height * nextScale);
                
                currentCanvas = await this.lanczosResample(currentCanvas, nextWidth, nextHeight);
                currentScale = nextScale;
                stepNum++;
                
                if (progressCallback) {
                    progressCallback(10 + (80 * stepNum / totalSteps));
                }
                
                await Utils.sleep(0);
            }
            
            return currentCanvas;
        }
    }

    /**
     * Lanczos resampling implementation
     */
    async lanczosResample(srcCanvas, targetWidth, targetHeight, progressCallback) {
        const destCanvas = document.createElement('canvas');
        destCanvas.width = targetWidth;
        destCanvas.height = targetHeight;
        const destCtx = destCanvas.getContext('2d');
        
        // Get source image data
        const srcCtx = srcCanvas.getContext('2d');
        const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
        const destData = destCtx.createImageData(targetWidth, targetHeight);
        
        const srcWidth = srcCanvas.width;
        const srcHeight = srcCanvas.height;
        const scaleX = srcWidth / targetWidth;
        const scaleY = srcHeight / targetHeight;
        
        // Lanczos kernel function
        const lanczos = (x, a = 3) => {
            if (x === 0) return 1;
            if (x < -a || x > a) return 0;
            const pix = Math.PI * x;
            return (a * Math.sin(pix) * Math.sin(pix / a)) / (pix * pix);
        };
        
        const filterSize = 3;
        
        // Process in chunks to allow UI updates
        const chunkSize = Math.ceil(targetHeight / 10);
        
        for (let startY = 0; startY < targetHeight; startY += chunkSize) {
            const endY = Math.min(startY + chunkSize, targetHeight);
            
            for (let y = startY; y < endY; y++) {
                for (let x = 0; x < targetWidth; x++) {
                    const srcX = x * scaleX;
                    const srcY = y * scaleY;
                    
                    let r = 0, g = 0, b = 0, a = 0;
                    let weightSum = 0;
                    
                    const minX = Math.max(0, Math.floor(srcX) - filterSize);
                    const maxX = Math.min(srcWidth - 1, Math.ceil(srcX) + filterSize);
                    const minY = Math.max(0, Math.floor(srcY) - filterSize);
                    const maxY = Math.min(srcHeight - 1, Math.ceil(srcY) + filterSize);
                    
                    for (let sy = minY; sy <= maxY; sy++) {
                        for (let sx = minX; sx <= maxX; sx++) {
                            const weight = lanczos(srcX - sx) * lanczos(srcY - sy);
                            const idx = (sy * srcWidth + sx) * 4;
                            
                            r += srcData.data[idx] * weight;
                            g += srcData.data[idx + 1] * weight;
                            b += srcData.data[idx + 2] * weight;
                            a += srcData.data[idx + 3] * weight;
                            weightSum += weight;
                        }
                    }
                    
                    const destIdx = (y * targetWidth + x) * 4;
                    destData.data[destIdx] = Utils.clamp(Math.round(r / weightSum), 0, 255);
                    destData.data[destIdx + 1] = Utils.clamp(Math.round(g / weightSum), 0, 255);
                    destData.data[destIdx + 2] = Utils.clamp(Math.round(b / weightSum), 0, 255);
                    destData.data[destIdx + 3] = Utils.clamp(Math.round(a / weightSum), 0, 255);
                }
            }
            
            if (progressCallback) {
                progressCallback(10 + (80 * endY / targetHeight));
            }
            
            await Utils.sleep(0);
        }
        
        destCtx.putImageData(destData, 0, 0);
        return destCanvas;
    }

    /**
     * Get the processed canvas
     */
    getProcessedCanvas() {
        return this.processedCanvas;
    }

    /**
     * Reset processor
     */
    reset() {
        this.originalImage = null;
        this.processedCanvas = null;
    }
}

// Export
window.ImageProcessor = ImageProcessor;
