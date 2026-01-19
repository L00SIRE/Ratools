/**
 * Grid Splitter
 * Splits upscaled images into A4-sized tiles with overlap support
 */

class GridSplitter {
    constructor() {
        this.tiles = [];
        this.config = null;
    }

    /**
     * Split an image canvas into tiles
     * @param {HTMLCanvasElement} canvas - The upscaled image canvas
     * @param {Object} config - Grid configuration
     * @returns {Promise<Array>} Array of tile canvases with metadata
     */
    async splitIntoTiles(canvas, config, progressCallback = null) {
        this.config = config;
        this.tiles = [];

        const {
            cols,
            rows,
            a4WidthPx,
            a4HeightPx,
            overlapPx,
            effectiveWidthPx,
            effectiveHeightPx
        } = config;

        const sourceWidth = canvas.width;
        const sourceHeight = canvas.height;

        // Calculate the actual tile content size (what portion of source each tile covers)
        const tileContentWidth = sourceWidth / cols;
        const tileContentHeight = sourceHeight / rows;

        // Calculate overlap in source pixels
        const overlapSourceX = (overlapPx * tileContentWidth) / a4WidthPx;
        const overlapSourceY = (overlapPx * tileContentHeight) / a4HeightPx;

        let tileIndex = 0;
        const totalTiles = rows * cols;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate source region with overlap
                let srcX = col * tileContentWidth - (col > 0 ? overlapSourceX : 0);
                let srcY = row * tileContentHeight - (row > 0 ? overlapSourceY : 0);
                let srcWidth = tileContentWidth + (col > 0 ? overlapSourceX : 0) + (col < cols - 1 ? overlapSourceX : 0);
                let srcHeight = tileContentHeight + (row > 0 ? overlapSourceY : 0) + (row < rows - 1 ? overlapSourceY : 0);

                // Clamp to canvas bounds
                srcX = Math.max(0, srcX);
                srcY = Math.max(0, srcY);
                srcWidth = Math.min(srcWidth, sourceWidth - srcX);
                srcHeight = Math.min(srcHeight, sourceHeight - srcY);

                // Create tile canvas at A4 dimensions
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = a4WidthPx;
                tileCanvas.height = a4HeightPx;
                const tileCtx = tileCanvas.getContext('2d');

                // Fill with white background (for printing)
                tileCtx.fillStyle = '#ffffff';
                tileCtx.fillRect(0, 0, a4WidthPx, a4HeightPx);

                // Enable high-quality rendering
                tileCtx.imageSmoothingEnabled = true;
                tileCtx.imageSmoothingQuality = 'high';

                // Draw the source region onto the tile
                tileCtx.drawImage(
                    canvas,
                    srcX, srcY, srcWidth, srcHeight,
                    0, 0, a4WidthPx, a4HeightPx
                );

                // Add crop marks if enabled
                if (config.addCropMarks) {
                    this.addCropMarks(tileCtx, a4WidthPx, a4HeightPx, overlapPx);
                }

                // Store tile with metadata
                this.tiles.push({
                    canvas: tileCanvas,
                    row,
                    col,
                    index: tileIndex,
                    position: `${row + 1}-${col + 1}`,
                    label: `Page ${tileIndex + 1}`,
                    hasLeftOverlap: col > 0,
                    hasTopOverlap: row > 0,
                    hasRightOverlap: col < cols - 1,
                    hasBottomOverlap: row < rows - 1
                });

                tileIndex++;

                if (progressCallback) {
                    progressCallback(Math.round((tileIndex / totalTiles) * 100));
                }

                // Allow UI to update
                await Utils.sleep(0);
            }
        }

        return this.tiles;
    }

    /**
     * Add crop marks to a tile context
     */
    addCropMarks(ctx, width, height, overlapPx) {
        const markLength = 20;
        const markOffset = 5;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([5, 5]);

        // Draw overlap guides
        if (overlapPx > 0) {
            // Top overlap line
            ctx.beginPath();
            ctx.moveTo(0, overlapPx);
            ctx.lineTo(width, overlapPx);
            ctx.stroke();

            // Bottom overlap line
            ctx.beginPath();
            ctx.moveTo(0, height - overlapPx);
            ctx.lineTo(width, height - overlapPx);
            ctx.stroke();

            // Left overlap line
            ctx.beginPath();
            ctx.moveTo(overlapPx, 0);
            ctx.lineTo(overlapPx, height);
            ctx.stroke();

            // Right overlap line
            ctx.beginPath();
            ctx.moveTo(width - overlapPx, 0);
            ctx.lineTo(width - overlapPx, height);
            ctx.stroke();
        }

        // Corner crop marks
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(0, markLength);
        ctx.lineTo(0, 0);
        ctx.lineTo(markLength, 0);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(width - markLength, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, markLength);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(0, height - markLength);
        ctx.lineTo(0, height);
        ctx.lineTo(markLength, height);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(width - markLength, height);
        ctx.lineTo(width, height);
        ctx.lineTo(width, height - markLength);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Generate preview thumbnails for each tile
     * @param {number} maxSize - Maximum dimension for thumbnails
     * @returns {Array} Array of thumbnail data URLs
     */
    generateThumbnails(maxSize = 200) {
        return this.tiles.map(tile => {
            const canvas = tile.canvas;
            const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
            
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = Math.round(canvas.width * scale);
            thumbCanvas.height = Math.round(canvas.height * scale);
            
            const ctx = thumbCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            
            return {
                ...tile,
                thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.8),
                thumbWidth: thumbCanvas.width,
                thumbHeight: thumbCanvas.height
            };
        });
    }

    /**
     * Get a specific tile by index
     */
    getTile(index) {
        return this.tiles[index] || null;
    }

    /**
     * Get all tiles
     */
    getTiles() {
        return this.tiles;
    }

    /**
     * Get grid configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Reset splitter
     */
    reset() {
        this.tiles = [];
        this.config = null;
    }
}

// Export
window.GridSplitter = GridSplitter;
