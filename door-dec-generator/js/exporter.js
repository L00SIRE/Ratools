/**
 * Logic for generating print-ready PDFs
 */
class DoorDecExporter {
    constructor() {
        this.jsPDF = window.jspdf.jsPDF;
    }

    // Convert hex color to RGB array
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [99, 102, 241]; // Default to indigo if parse fails
    }

    async generatePDF(names, config, designerData) {
        const doc = new this.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const startY = 15;

        // Calculate layout
        const itemSizeMm = (config.baseSize || 10) * 10; // cm to mm
        const gap = 5;
        const cols = Math.floor((pageWidth - margin * 2) / (itemSizeMm + gap));
        const rows = Math.floor((pageHeight - margin * 2) / (itemSizeMm + gap));
        
        const itemsPerPage = cols * rows || 1; // Ensure at least 1

        if (config.exportMode === 'separated') {
            await this.generateSeparatedPDF(doc, names, config, {cols, rows, itemSizeMm, gap, margin, startY, itemsPerPage});
        } else {
            await this.generateCombinedPDF(doc, names, config, {cols, rows, itemSizeMm, gap, margin, startY, itemsPerPage}, designerData);
        }

        const date = new Date().toISOString().slice(0, 10);
        doc.save(`DoorDecs_${date}.pdf`);
    }

    // Mode 1: Combined (Everything on one tag)
    async generateCombinedPDF(doc, names, config, layout, designerData) {
        let currentItem = 0;
        
        // Setup canvas for offline rendering
        const canvas = document.createElement('canvas');
        // Fixed size for consistent rendering
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.width = '400px';
        canvas.style.height = '400px';
        
        // Create designer with the properly sized canvas
        const ctx = canvas.getContext('2d');
        
        for (let i = 0; i < names.length; i++) {
            if (i > 0 && i % layout.itemsPerPage === 0) {
                doc.addPage();
                currentItem = 0;
            }

            const col = currentItem % layout.cols;
            const row = Math.floor(currentItem / layout.cols);
            const x = layout.margin + col * (layout.itemSizeMm + layout.gap);
            const y = layout.startY + row * (layout.itemSizeMm + layout.gap);

            // Clear and render to canvas
            ctx.clearRect(0, 0, 400, 400);
            this.renderToCanvas(ctx, 200, 200, 160, config, names[i]);
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            doc.addImage(imgData, 'PNG', x, y, layout.itemSizeMm, layout.itemSizeMm);
            
            // Add cut guide
            doc.setDrawColor(200);
            doc.setLineWidth(0.1);
            doc.setLineDashPattern([2, 2], 0);
            this.drawShape(doc, x + layout.itemSizeMm/2, y + layout.itemSizeMm/2, layout.itemSizeMm, config.baseShape, 'S');

            currentItem++;
        }
    }

    renderToCanvas(ctx, cx, cy, size, config, name) {
        const r = size / 2;
        
        // Draw base shape
        ctx.fillStyle = config.baseColor;
        ctx.beginPath();
        if (config.baseShape === 'circle') {
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        } else if (config.baseShape === 'square') {
            ctx.rect(cx - r, cy - r, size, size);
        } else if (config.baseShape === 'hexagon') {
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else if (config.baseShape === 'star') {
            const innerR = r * 0.4;
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI / 5) * i - Math.PI / 2;
                const radius = i % 2 === 0 ? r : innerR;
                const px = cx + radius * Math.cos(angle);
                const py = cy + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.fill();
        
        // Draw name
        ctx.fillStyle = config.textColor || '#000000';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (config.textBg) {
            const textWidth = ctx.measureText(name).width;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(cx - textWidth/2 - 10, cy - 15, textWidth + 20, 30);
            ctx.fillStyle = config.textColor || '#000000';
        }
        ctx.fillText(name, cx, cy);
    }

    // Mode 2: Separated Layers
    async generateSeparatedPDF(doc, names, config, layout) {
        doc.setFontSize(16);
        doc.text("LAYER 1: Base Shapes", 105, 10, { align: 'center' });
        
        const rgb = this.hexToRgb(config.baseColor);
        
        let currentItem = 0;
        for (let i = 0; i < names.length; i++) {
            if (i > 0 && i % layout.itemsPerPage === 0) {
                doc.addPage();
                currentItem = 0;
                doc.text("LAYER 1: Base Shapes", 105, 10, { align: 'center' });
            }

            const col = currentItem % layout.cols;
            const row = Math.floor(currentItem / layout.cols);
            const x = layout.margin + col * (layout.itemSizeMm + layout.gap);
            const y = layout.startY + row * (layout.itemSizeMm + layout.gap);

            if (config.fillSeparated) {
                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
                this.drawShape(doc, x + layout.itemSizeMm/2, y + layout.itemSizeMm/2, layout.itemSizeMm, config.baseShape, 'F');
            } else {
                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                this.drawShape(doc, x + layout.itemSizeMm/2, y + layout.itemSizeMm/2, layout.itemSizeMm, config.baseShape, 'S');
            }
            
            currentItem++;
        }

        // PART 2: Names
        doc.addPage();
        doc.text("LAYER 2: Names", 105, 10, { align: 'center' });
        
        currentItem = 0;
        for (let i = 0; i < names.length; i++) {
            if (i > 0 && i % layout.itemsPerPage === 0) {
                doc.addPage();
                currentItem = 0;
                doc.text("LAYER 2: Names", 105, 10, { align: 'center' });
            }

            const col = currentItem % layout.cols;
            const row = Math.floor(currentItem / layout.cols);
            const x = layout.margin + col * (layout.itemSizeMm + layout.gap);
            const y = layout.startY + row * (layout.itemSizeMm + layout.gap);
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            const cx = x + layout.itemSizeMm/2;
            const cy = y + layout.itemSizeMm/2;
            
            doc.text(names[i], cx, cy, { align: 'center' });
            
            // Cut guide
            doc.setDrawColor(200);
            doc.setLineWidth(0.1);
            const labelSize = layout.itemSizeMm * 0.7;
            const labelShape = config.baseShape === 'square' ? 'square' : 'circle';
            this.drawShape(doc, cx, cy, labelSize, labelShape, 'S');

            currentItem++;
        }
    }
    
    drawShape(doc, cx, cy, size, shape, style = 'S') {
        const r = size / 2;
        if (shape === 'circle') {
            doc.circle(cx, cy, r, style);
        } else if (shape === 'square') {
            doc.rect(cx - r, cy - r, size, size, style);
        } else if (shape === 'hexagon') {
            // Draw hexagon path
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
            }
            doc.polygon(points, style);
        } else if (shape === 'star') {
            // Draw star path
            const points = [];
            const innerR = r * 0.4;
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI / 5) * i - Math.PI / 2;
                const radius = i % 2 === 0 ? r : innerR;
                points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
            }
            doc.polygon(points, style);
        } else {
            doc.circle(cx, cy, r, style);
        }
    }
}

