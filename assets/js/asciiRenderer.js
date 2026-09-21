/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Live ASCII Portrait Generator
 * Converts portrait.jpg to ASCII art with randomness/jitter
 * ============================================================
 */

export class AsciiRenderer {
  constructor() {
    this.charSets = [
      [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
      [' ', ',', '.', '~', '!', '?', '$', '#', '%', '&'],
      [' ', '`', '^', '"', ';', '|', '(', '8', '&', '#']
    ];
  }

  // Convert image to ASCII string - crops to visible bounding box and handles transparency
  async convertImage(imageUrl, targetWidth = 64) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        // Step 1: Detect visible bounding box (alpha > 25)
        const tempCanvas = document.createElement('canvas');
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        tempCanvas.width = origW;
        tempCanvas.height = origH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        const fullData = tempCtx.getImageData(0, 0, origW, origH);
        const fullPixels = fullData.data;

        let minX = origW, maxX = 0;
        let minY = origH, maxY = 0;
        let hasVisible = false;

        for (let y = 0; y < origH; y++) {
          for (let x = 0; x < origW; x++) {
            const alpha = fullPixels[(y * origW + x) * 4 + 3];
            if (alpha > 25) {
              hasVisible = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!hasVisible) {
          minX = 0; minY = 0;
          maxX = origW - 1;
          maxY = origH - 1;
        }

        const cropW = Math.max(1, maxX - minX + 1);
        const cropH = Math.max(1, maxY - minY + 1);

        // Step 2: Scale visible part to target dimensions
        // Compensate for font aspect ratio (~0.50 for monospace)
        const targetHeight = Math.round(targetWidth * (cropH / cropW) * 0.50);

        const offscreen = document.createElement('canvas');
        offscreen.width = targetWidth;
        offscreen.height = targetHeight;
        const ctx = offscreen.getContext('2d');
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        // Draw ONLY the visible cropped area into the scaled canvas
        ctx.drawImage(img, minX, minY, cropW, cropH, 0, 0, targetWidth, targetHeight);
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const pixels = imgData.data;

        // Step 3: Pick character set with subtle variation
        const setIndex = Math.floor(Math.random() * this.charSets.length);
        const chars = [...this.charSets[setIndex]];
        if (Math.random() > 0.5) {
          const a = Math.floor(Math.random() * chars.length);
          const b = Math.floor(Math.random() * chars.length);
          [chars[a], chars[b]] = [chars[b], chars[a]];
        }

        // Step 4: Generate ASCII art respecting transparency
        let asciiOutput = '';
        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];

            // If transparent, render empty space
            if (a < 35) {
              asciiOutput += ' ';
              continue;
            }

            // Perceptual luminance calculation
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const charIdx = Math.floor((brightness / 255) * (chars.length - 1));
            asciiOutput += chars[Math.max(0, Math.min(charIdx, chars.length - 1))];
          }
          asciiOutput += '\n';
        }

        resolve(asciiOutput);
      };

      img.onerror = () => {
        resolve('[ERROR: PORTRAIT IMAGE BUFFER UNAVAILABLE]');
      };

      img.src = imageUrl;
    });
  }
}

export const asciiRenderer = new AsciiRenderer();
