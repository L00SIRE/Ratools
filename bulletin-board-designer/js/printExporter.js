/**
 * Print Exporter
 * Handles export functionality for tiles - ZIP, PDF, and individual images
 */

class PrintExporter {
    constructor() {
        this.tiles = [];
        this.config = null;
    }

    /**
     * Set tiles to export
     * @param {Array} tiles - Array of tile objects with canvas property
     * @param {Object} config - Grid configuration
     */
    setTiles(tiles, config) {
        this.tiles = tiles;
        this.config = config;
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
            
            // Add image to fill the page
            pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
            
            // Add page number (small, in corner)
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(
                `Page ${i + 1} of ${this.tiles.length} | Position: Row ${tile.row + 1}, Col ${tile.col + 1}`,
                5,
                pageHeight - 3
            );
            
            if (progressCallback) {
                progressCallback(Math.round(((i + 1) / this.tiles.length) * 90));
            }
            
            await Utils.sleep(0);
        }
        
        // Add assembly guide as last page
        pdf.addPage('a4', 'portrait');
        this.addAssemblyGuidePage(pdf);
        
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
     * Add assembly guide page to PDF
     */
    addAssemblyGuidePage(pdf) {
        const { cols, rows, totalPages } = this.config;
        const overlapMm = this.config.overlapPx ? Utils.pixelsToMm(this.config.overlapPx, 300) : 0;
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Title
        pdf.setFontSize(18);
        pdf.setTextColor(88, 80, 236);  
        pdf.text('Assembly Guide', pageWidth / 2, 20, { align: 'center' });
        
        // Grid info
        pdf.setFontSize(12);
        pdf.setTextColor(60);
        pdf.text(`Grid: ${cols} columns × ${rows} rows = ${totalPages} pages`, pageWidth / 2, 30, { align: 'center' });
        pdf.text(`Overlap: ${Math.round(overlapMm)}mm`, pageWidth / 2, 38, { align: 'center' });
        
        // Draw grid diagram
        const diagramWidth = Math.min(pageWidth - 40, 150);
        const cellWidth = diagramWidth / cols;
        const cellHeight = cellWidth * 1.4; // A4 ratio
        const diagramHeight = cellHeight * rows;
        const startX = (pageWidth - diagramWidth) / 2;
        const startY = 50;
        
        pdf.setDrawColor(200);
        pdf.setFillColor(245, 243, 255);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * cellWidth;
                const y = startY + row * cellHeight;
                const pageNum = row * cols + col + 1;
                
                pdf.rect(x, y, cellWidth, cellHeight, 'FD');
                
                pdf.setFontSize(10);
                pdf.setTextColor(88, 80, 236);
                pdf.text(String(pageNum), x + cellWidth / 2, y + cellHeight / 2 + 3, { align: 'center' });
            }
        }
        
        // Instructions
        const instructionsY = startY + diagramHeight + 20;
        pdf.setFontSize(11);
        pdf.setTextColor(60);
        
        const instructions = [
            '1. Print all pages at 100% scale',
            '2. Cut along the outer edges',
            `3. Overlap adjacent pages by ${Math.round(overlapMm)}mm`,
            '4. Use tape or glue on overlap areas',
            '5. Start from top-left, work right then down'
        ];
        
        instructions.forEach((text, i) => {
            pdf.text(text, 20, instructionsY + i * 8);
        });
        
        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text('Generated by RA Tools - Bulletin Board Designer', pageWidth / 2, pageHeight - 10, { align: 'center' });
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
