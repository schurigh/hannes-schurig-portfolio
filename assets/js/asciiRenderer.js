/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Live ASCII Portrait Generator
 * Converts photo/avatar to high-fidelity ASCII art with true
 * monospace grid alignment, aspect compensation and contrast curve
 * ============================================================
 */

export class AsciiRenderer {
  constructor() {
    // High-fidelity perceptual luminance ramp: 10 smooth steps from empty to solid
    this.ramp = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];
  }

  // Convert image to ASCII string - crops to visible bounding box and handles transparency
  async convertImage(imageUrl, targetWidth = 58) {
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
        // Monospace glyphs (Consolas / Courier) have width/height ratio ~0.52 at line-height 1
        const aspectCompensation = 0.52;
        const targetHeight = Math.round(targetWidth * (cropH / cropW) * aspectCompensation);

        const offscreen = document.createElement('canvas');
        offscreen.width = targetWidth;
        offscreen.height = targetHeight;
        const ctx = offscreen.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        // Draw ONLY the visible cropped area into the scaled canvas
        ctx.drawImage(img, minX, minY, cropW, cropH, 0, 0, targetWidth, targetHeight);
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const pixels = imgData.data;

        // Step 3: Analyze luminance range for dynamic contrast normalization
        let minLum = 255;
        let maxLum = 0;
        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const a = pixels[idx + 3];
            if (a >= 35) {
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              if (lum < minLum) minLum = lum;
              if (lum > maxLum) maxLum = lum;
            }
          }
        }
        if (maxLum <= minLum) {
          minLum = 0;
          maxLum = 255;
        }

        // Step 4: Generate ASCII art respecting transparency and facial contrast
        const ramp = this.ramp;
        const rampMax = ramp.length - 1;
        let asciiOutput = '';

        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const a = pixels[idx + 3];

            // If transparent, render empty space
            if (a < 35) {
              asciiOutput += ' ';
              continue;
            }

            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];

            // Perceptual luminance calculation
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Normalized contrast stretch with subtle gamma curve for crisp facial detail
            let norm = (lum - minLum) / (maxLum - minLum);
            norm = Math.pow(Math.max(0, Math.min(1, norm)), 1.15);

            const charIdx = Math.floor(norm * rampMax);
            asciiOutput += ramp[Math.max(0, Math.min(charIdx, rampMax))];
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
