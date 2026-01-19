/**
 * Print Exporter
 * Handles export functionality for tiles - ZIP, PDF, and individual images
 */

class PrintExporter {
    constructor() {
        this.tiles = [];
        this.config = null;
        this.originalImageDataUrl = null;
    }

    /**
     * Set tiles to export
     * @param {Array} tiles - Array of tile objects with canvas property
     * @param {Object} config - Grid configuration
     * @param {string} originalImageDataUrl - Data URL of original image for assembly guide
     */
    setTiles(tiles, config, originalImageDataUrl = null) {
        this.tiles = tiles;
        this.config = config;
        this.originalImageDataUrl = originalImageDataUrl;
    }

    /**
     * Export all tiles as a ZIP file
     * @param {function} progressCallback - Progress callback (0-100)
     */
    async exportAsZip(progressCallback = null) {
        if (!this.tiles.length) {
            throw new Error('No tiles to export');
        }

        const zip = new JSZip();
        const folder = zip.folder('bulletin-board-tiles');
        
        // Add assembly guide
        folder.file('assembly-guide.txt', this.generateAssemblyGuide());
        
        // Add each tile
        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            const blob = await Utils.canvasToBlob(tile.canvas, 'image/png');
            const filename = `tile-${String(tile.row + 1).padStart(2, '0')}-${String(tile.col + 1).padStart(2, '0')}.png`;
            folder.file(filename, blob);
            
            if (progressCallback) {
                progressCallback(Math.round(((i + 1) / this.tiles.length) * 80));
            }
        }
        
        if (progressCallback) progressCallback(85);
        
        // Generate ZIP file as base64
        const content = await zip.generateAsync({ 
            type: 'base64',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            if (progressCallback) {
                progressCallback(85 + Math.round(metadata.percent * 0.15));
            }
        });
        
        // Download using data URL for file:// protocol compatibility
        const filename = `bulletin-board-${this.config.cols}x${this.config.rows}-tiles.zip`;
        const dataUrl = 'data:application/zip;base64,' + content;
        Utils.forceDownload(dataUrl, filename);
        
        if (progressCallback) progressCallback(100);
    }

    /**
     * Export all tiles as a multi-page PDF
     * @param {function} progressCallback - Progress callback (0-100)
     */
    async exportAsPdf(progressCallback = null) {
        if (!this.tiles.length) {
            throw new Error('No tiles to export');
        }

        const { jsPDF } = window.jspdf;
        
        // Determine PDF orientation based on first tile (all should be same)
        const firstTile = this.tiles[0];
        const isLandscape = firstTile.canvas.width > firstTile.canvas.height;
        const orientation = isLandscape ? 'landscape' : 'portrait';
        
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < this.tiles.length; i++) {
            const tile = this.tiles[i];
            
            if (i > 0) {
                pdf.addPage('a4', orientation);
            }
            
            // Convert canvas to data URL
            const dataUrl = tile.canvas.toDataURL('image/jpeg', 0.92);
            
            // Add image to fill the page - no page numbers for clean prints
            pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
            
            if (progressCallback) {
                progressCallback(Math.round(((i + 1) / this.tiles.length) * 90));
            }
            
            await Utils.sleep(0);
        }
        
        // Add assembly guide as last page with original image reference
        pdf.addPage('a4', 'portrait');
        this.addAssemblyGuidePage(pdf, this.originalImageDataUrl);
        
        if (progressCallback) progressCallback(95);
        
        // Save PDF using data URL for file:// protocol compatibility
        const filename = `bulletin-board-${this.config.cols}x${this.config.rows}-pages.pdf`;
        const pdfDataUrl = pdf.output('dataurlstring');
        Utils.forceDownload(pdfDataUrl, filename);
        
        if (progressCallback) progressCallback(100);
    }

    /**
     * Export a single tile
     * @param {number} index - Tile index
     * @param {string} format - 'png' or 'jpeg'
     */
    async exportSingleTile(index, format = 'png') {
        const tile = this.tiles[index];
        if (!tile) {
            throw new Error('Tile not found');
        }
        
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'png' ? 1 : 0.92;
        
        const blob = await Utils.canvasToBlob(tile.canvas, mimeType, quality);
        const filename = `tile-${String(tile.row + 1).padStart(2, '0')}-${String(tile.col + 1).padStart(2, '0')}.${format}`;
        Utils.downloadBlob(blob, filename);
    }

    /**
     * Generate assembly guide text
     */
    generateAssemblyGuide() {
        if (!this.config) return '';
        
        const { cols, rows, totalPages } = this.config;
        const overlapMm = this.config.overlapPx ? Utils.pixelsToMm(this.config.overlapPx, 300) : 0;
        
        let guide = `BULLETIN BOARD ASSEMBLY GUIDE
=============================

Grid Layout: ${cols} columns × ${rows} rows = ${totalPages} total pages

`;

        if (overlapMm > 0) {
            guide += `Overlap: ${Math.round(overlapMm)}mm on each shared edge

IMPORTANT: Each page has a ${Math.round(overlapMm)}mm overlap with adjacent pages.
When assembling, align the overlap areas for a seamless result.

`;
        }

        guide += `ASSEMBLY ORDER:
--------------
Start from the top-left corner and work your way right, then down.

`;

        for (let row = 0; row < rows; row++) {
            guide += `Row ${row + 1}: `;
            for (let col = 0; col < cols; col++) {
                const pageNum = row * cols + col + 1;
                guide += `[Page ${pageNum}]`;
                if (col < cols - 1) guide += ' → ';
            }
            guide += '\n';
            if (row < rows - 1) {
                guide += '         ↓\n';
            }
        }

        guide += `
TIPS:
-----
1. Print all pages at 100% scale (no "fit to page")
2. Use a ruler and cutting mat for precise cuts
3. Overlap pages by ${Math.round(overlapMm)}mm when joining
4. Use double-sided tape or glue stick on the overlap areas
5. Work on a flat surface for best results

Generated by RA Tools - Bulletin Board Designer
`;

        return guide;
    }

    /**
     * Add assembly guide page to PDF with original image and numbered grid
     */
    addAssemblyGuidePage(pdf, originalImageDataUrl) {
        const { cols, rows, totalPages } = this.config;
        const overlapMm = this.config.overlapPx ? Utils.pixelsToMm(this.config.overlapPx, 300) : 0;
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Title
        pdf.setFontSize(16);
        pdf.setTextColor(50, 50, 50);  
        pdf.text('Assembly Guide', pageWidth / 2, 15, { align: 'center' });
        
        // Grid info
        pdf.setFontSize(10);
        pdf.setTextColor(80);
        pdf.text(`${cols} columns × ${rows} rows = ${totalPages} pages | Overlap: ${Math.round(overlapMm)}mm`, pageWidth / 2, 23, { align: 'center' });
        
        // Calculate image area - make it as large as possible
        const margin = 15;
        const imageAreaWidth = pageWidth - (margin * 2);
        const imageAreaHeight = pageHeight - 80; // Leave room for title and instructions
        const imageStartY = 30;
        
        // If we have the original image, show it with grid overlay
        if (originalImageDataUrl) {
            // Draw the original image
            pdf.addImage(originalImageDataUrl, 'JPEG', margin, imageStartY, imageAreaWidth, imageAreaHeight);
            
            // Draw grid overlay with page numbers
            const cellWidth = imageAreaWidth / cols;
            const cellHeight = imageAreaHeight / rows;
            
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.5);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = margin + col * cellWidth;
                    const y = imageStartY + row * cellHeight;
                    const pageNum = row * cols + col + 1;
                    
                    // Draw cell border
                    pdf.rect(x, y, cellWidth, cellHeight, 'S');
                    
                    // Draw page number in a white circle
                    const centerX = x + cellWidth / 2;
                    const centerY = y + cellHeight / 2;
                    const circleRadius = Math.min(cellWidth, cellHeight) * 0.15;
                    
                    // White circle background
                    pdf.setFillColor(255, 255, 255);
                    pdf.circle(centerX, centerY, circleRadius, 'F');
                    
                    // Black border
                    pdf.setDrawColor(0, 0, 0);
                    pdf.circle(centerX, centerY, circleRadius, 'S');
                    
                    // Page number
                    pdf.setFontSize(Math.min(12, circleRadius * 1.5));
                    pdf.setTextColor(0, 0, 0);
                    pdf.text(String(pageNum), centerX, centerY + 1.5, { align: 'center' });
                }
            }
        } else {
            // Fallback: Draw simple grid diagram without original image
            const diagramWidth = Math.min(imageAreaWidth, 160);
            const cellWidth = diagramWidth / cols;
            const cellHeight = cellWidth * 0.7;
            const diagramHeight = cellHeight * rows;
            const startX = (pageWidth - diagramWidth) / 2;
            const startY = imageStartY + 20;
            
            pdf.setDrawColor(100);
            pdf.setFillColor(240, 240, 240);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = startX + col * cellWidth;
                    const y = startY + row * cellHeight;
                    const pageNum = row * cols + col + 1;
                    
                    pdf.rect(x, y, cellWidth, cellHeight, 'FD');
                    
                    pdf.setFontSize(12);
                    pdf.setTextColor(50, 50, 50);
                    pdf.text(String(pageNum), x + cellWidth / 2, y + cellHeight / 2 + 3, { align: 'center' });
                }
            }
        }
        
        // Instructions at bottom
        const instructionsY = pageHeight - 35;
        pdf.setFontSize(9);
        pdf.setTextColor(60);
        
        pdf.text('Instructions:', margin, instructionsY);
        pdf.setFontSize(8);
        pdf.text('1. Print all pages at 100% scale (no "fit to page")', margin, instructionsY + 6);
        pdf.text(`2. Overlap adjacent edges by ${Math.round(overlapMm)}mm when assembling`, margin, instructionsY + 12);
        pdf.text('3. Start from tile #1 (top-left) and work right, then down', margin, instructionsY + 18);
    }

    /**
     * Reset exporter
     */
    reset() {
        this.tiles = [];
        this.config = null;
    }
}

// Export
window.PrintExporter = PrintExporter;
