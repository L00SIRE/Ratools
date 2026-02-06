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

                // Fill with background color (matches bulletin board)
                tileCtx.fillStyle = config.bgColor || '#ffffff';
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

                // Store tile metadata first
                const tileData = {
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
                };

                // Add enhanced overlap guides if enabled
                if (config.addCropMarks) {
                    this.addOverlapGuides(tileCtx, a4WidthPx, a4HeightPx, overlapPx, tileData);
                }

                // Store tile with metadata
                this.tiles.push(tileData);

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
     * Add enhanced overlap guides for easier cutting and assembly
     * Uses professional print industry standards:
     * - RIGHT tiles overlap LEFT tiles (right edge of left tile is glue zone)
     * - BOTTOM tiles overlap TOP tiles (bottom edge of top tile is glue zone)
     * - Clear distinction between CUT zones and GLUE zones
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Tile width in pixels
     * @param {number} height - Tile height in pixels
     * @param {number} overlapPx - Overlap size in pixels
     * @param {Object} tile - Tile metadata with overlap info
     */
    addOverlapGuides(ctx, width, height, overlapPx, tile) {
        if (overlapPx <= 0) return;

        ctx.save();

        // Professional overlap algorithm:
        // - Tiles on LEFT and TOP edges: their RIGHT/BOTTOM edges are GLUE zones (will be covered)
        // - Tiles on RIGHT and BOTTOM edges: their LEFT/TOP edges need to be CUT (they go on top)
        
        // 1. Draw gradient glue zones (only on edges that will be covered)
        this.drawGlueZones(ctx, width, height, overlapPx, tile);

        // 2. Draw cut lines (only on edges that need trimming)
        this.drawCutLines(ctx, width, height, overlapPx, tile);

        // 3. Draw cross-hair registration marks for precise alignment
        this.drawRegistrationMarks(ctx, width, height, overlapPx, tile);

        // 4. Draw numbered alignment points
        this.drawAlignmentPoints(ctx, width, height, overlapPx, tile);

        // 5. Draw corner crop marks
        this.drawCornerMarks(ctx, width, height);

        ctx.restore();
    }

    /**
     * Draw gradient glue zones - ONLY on edges that will be COVERED after assembly
     * Right edge = glue zone (right neighbor covers this)
     * Bottom edge = glue zone (bottom neighbor covers this)
     * 
     * Left/Top edges: NO MARKINGS - these stay visible after assembly
     */
    drawGlueZones(ctx, width, height, overlapPx, tile) {
        // RIGHT edge is a glue zone - will be covered by tile to the right
        if (tile.hasRightOverlap) {
            // Subtle gradient (will be hidden)
            const gradientRight = ctx.createLinearGradient(width - overlapPx, 0, width, 0);
            gradientRight.addColorStop(0, 'rgba(65, 105, 225, 0.0)');
            gradientRight.addColorStop(0.3, 'rgba(65, 105, 225, 0.08)');
            gradientRight.addColorStop(1, 'rgba(65, 105, 225, 0.18)');
            ctx.fillStyle = gradientRight;
            ctx.fillRect(width - overlapPx, 0, overlapPx, height);
            
            // "GLUE" label (will be hidden when assembled)
            ctx.save();
            ctx.translate(width - overlapPx / 2, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = 'rgba(30, 60, 150, 0.5)';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▼ GLUE HERE ▼', 0, 4);
            ctx.restore();
        }

        // BOTTOM edge is a glue zone - will be covered by tile below
        if (tile.hasBottomOverlap) {
            const gradientBottom = ctx.createLinearGradient(0, height - overlapPx, 0, height);
            gradientBottom.addColorStop(0, 'rgba(65, 105, 225, 0.0)');
            gradientBottom.addColorStop(0.3, 'rgba(65, 105, 225, 0.08)');
            gradientBottom.addColorStop(1, 'rgba(65, 105, 225, 0.18)');
            ctx.fillStyle = gradientBottom;
            ctx.fillRect(0, height - overlapPx, width, overlapPx);
            
            // "GLUE" label (will be hidden when assembled)
            ctx.fillStyle = 'rgba(30, 60, 150, 0.5)';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▼ GLUE HERE ▼', width / 2, height - overlapPx / 2 + 4);
        }

        // LEFT and TOP edges: NO MARKINGS - these go ON TOP and stay visible!
    }

    /**
     * No cut lines needed - tiles just overlap without cutting
     * All guides are on edges that get covered (right/bottom)
     */
    drawCutLines(ctx, width, height, overlapPx, tile) {
        // No cut lines - the overlap system doesn't require cutting
        // Left/top edges go ON TOP and must stay clean
        // Right/bottom edges get covered so their guides are hidden
    }



    /**
     * Draw professional cross-hair registration marks for precise alignment
     * ONLY on edges that get COVERED (right/bottom) - not on visible edges
     */
    drawRegistrationMarks(ctx, width, height, overlapPx, tile) {
        const markSize = 12;
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        // Helper function to draw cross-hair
        const drawCrossHair = (x, y) => {
            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(x - markSize, y);
            ctx.lineTo(x + markSize, y);
            ctx.stroke();
            
            // Vertical line
            ctx.beginPath();
            ctx.moveTo(x, y - markSize);
            ctx.lineTo(x, y + markSize);
            ctx.stroke();
            
            // Center circle
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.stroke();
        };

        // Registration marks ONLY on RIGHT edge (will be covered by next tile)
        if (tile.hasRightOverlap) {
            drawCrossHair(width - overlapPx / 2, overlapPx + 30);
            drawCrossHair(width - overlapPx / 2, height / 2);
            drawCrossHair(width - overlapPx / 2, height - overlapPx - 30);
        }

        // Registration marks ONLY on BOTTOM edge (will be covered by tile below)
        if (tile.hasBottomOverlap) {
            drawCrossHair(overlapPx + 30, height - overlapPx / 2);
            drawCrossHair(width / 2, height - overlapPx / 2);
            drawCrossHair(width - overlapPx - 30, height - overlapPx / 2);
        }

        // LEFT and TOP edges: NO MARKS - these stay visible!
    }

    /**
     * Draw numbered alignment points ONLY on covered edges (right/bottom)
     * These will be hidden when the next tile is placed on top
     */
    drawAlignmentPoints(ctx, width, height, overlapPx, tile) {
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Right edge alignment points (will be covered - safe to mark)
        if (tile.hasRightOverlap) {
            let pointNum = 1;
            [overlapPx + 60, height / 2, height - overlapPx - 60].forEach(y => {
                const x = width - overlapPx / 2;
                
                ctx.fillStyle = 'rgba(65, 105, 225, 0.8)';
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.fillText(pointNum.toString(), x, y);
                pointNum++;
            });
        }

        // Bottom edge alignment points (will be covered - safe to mark)
        if (tile.hasBottomOverlap) {
            let pointNum = 1;
            [overlapPx + 60, width / 2, width - overlapPx - 60].forEach(x => {
                const y = height - overlapPx / 2;
                
                ctx.fillStyle = 'rgba(65, 105, 225, 0.8)';
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.fillText(pointNum.toString(), x, y);
                pointNum++;
            });
        }

        // LEFT and TOP edges: NO MARKS - these stay visible in final assembly!
    }

    /**
     * Draw corner crop marks
     */
    drawCornerMarks(ctx, width, height) {
        const markLength = 20;

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
