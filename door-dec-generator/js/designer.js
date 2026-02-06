/**
 * Logic for rendering door dec designs on canvas
 */
class DoorDecDesigner {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // High DPI setup
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.width = rect.width;
        this.height = rect.height;
    }

    render(config, name = 'Resident Name') {
        const ctx = this.ctx;
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        ctx.clearRect(0, 0, this.width, this.height);
        
        // Scale factor (cm to pixels)
        // Assuming canvas width (e.g., 300px) represents roughly 15cm for preview
        const pxPerCm = this.width / 15; 
        const sizePx = (config.baseSize || 10) * pxPerCm;

        // 1. Draw Base Layer
        this.drawShape(ctx, cx, cy, sizePx, config.baseShape, config.baseColor);

        // 2. Draw Detail Layer
        if (config.layer2Type === 'shape') {
            const detailSize = sizePx * 0.7;
            this.drawShape(ctx, cx, cy, detailSize, config.detailShape, config.detailColor);
        } else if (config.layer2Type === 'image' && config.customImage) {
            const imgSize = sizePx * 0.6;
            ctx.save();
            this.clipShape(ctx, cx, cy, imgSize, config.baseShape); // Clip image to base shape
            ctx.drawImage(config.customImage, cx - imgSize/2, cy - imgSize/2, imgSize, imgSize);
            ctx.restore();
        }

        // 3. Draw Text Layer
        this.drawText(ctx, cx, cy, name, config, sizePx);
    }

    drawShape(ctx, x, y, size, shape, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const r = size / 2;

        if (shape === 'circle') {
            ctx.arc(x, y, r, 0, Math.PI * 2);
        } else if (shape === 'square') {
            ctx.rect(x - r, y - r, size, size);
        } else if (shape === 'hexagon') {
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = x + r * Math.cos(angle);
                const py = y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else if (shape === 'star') {
            const innerR = r * 0.4;
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI / 5) * i - Math.PI/2;
                const radius = i % 2 === 0 ? r : innerR;
                const px = x + radius * Math.cos(angle);
                const py = y + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.fill();
    }

    // Helper for clipping images
    clipShape(ctx, x, y, size, shape) {
        ctx.beginPath();
        const r = size / 2;
        
        if (shape === 'circle') {
            ctx.arc(x, y, r, 0, Math.PI * 2);
        } else if (shape === 'square') {
            ctx.rect(x - r, y - r, size, size);
        } else if (shape === 'hexagon') {
             for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                // Hexagon matches outer radius
                const px = x + r * Math.cos(angle);
                const py = y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else if (shape === 'star') {
             const innerR = r * 0.4;
            for (let i = 0; i < 10; i++) {
                const angle = (Math.PI / 5) * i - Math.PI/2;
                const radius = i % 2 === 0 ? r : innerR;
                const px = x + radius * Math.cos(angle);
                const py = y + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        
        ctx.clip();
    }

    drawText(ctx, x, y, text, config, baseSize) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Font setup
        let fontFamily = 'Inter, sans-serif';
        if (config.font === 'Serif') fontFamily = 'Georgia, serif';
        if (config.font === 'Cursive') fontFamily = 'Brush Script MT, cursive';
        ctx.font = `bold ${baseSize * 0.15}px ${fontFamily}`;

        // Width logic
        const textWidth = ctx.measureText(text).width;
        const padding = baseSize * 0.05;
        const bgHeight = baseSize * 0.2;
        const bgWidth = textWidth + (padding * 4);

        // White background pill (optional)
        if (config.textBg) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 4;
            
            // Rounded rect
            ctx.beginPath();
            if (config.baseShape === 'square') {
                ctx.rect(x - bgWidth/2, y - bgHeight/2, bgWidth, bgHeight);
            } else {
                 ctx.roundRect(x - bgWidth/2, y - bgHeight/2, bgWidth, bgHeight, 10);
            }
            ctx.fill();
            ctx.shadowColor = 'transparent';
        }

        ctx.fillStyle = config.textColor;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}
