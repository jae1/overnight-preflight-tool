/**
 * Color Analyzer Utility
 * Samples pixels from the artwork canvas to determine:
 * 1. Luminance at the Union Bug's placement to auto-recommend black or white.
 * 2. Dominant colors in the artwork to build a matching theme palette.
 */

/**
 * Analyzes the average luminance of a background area on a canvas.
 * 
 * @param {HTMLCanvasElement} canvas - The artwork canvas
 * @param {number} x - Left coordinate (in canvas pixels)
 * @param {number} y - Top coordinate (in canvas pixels)
 * @param {number} width - Width of the area (in canvas pixels)
 * @param {number} height - Height of the area (in canvas pixels)
 * @returns {{isDark: boolean, avgLuminance: number}} Luminance analysis
 */
export function analyzeBackgroundLuminance(canvas, x, y, width, height) {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { isDark: false, avgLuminance: 255 };

    // Clamp coordinates to canvas boundaries
    const startX = Math.max(0, Math.min(x, canvas.width - 1));
    const startY = Math.max(0, Math.min(y, canvas.height - 1));
    const sampleW = Math.max(1, Math.min(width, canvas.width - startX));
    const sampleH = Math.max(1, Math.min(height, canvas.height - startY));

    // Get pixel data
    const imgData = ctx.getImageData(startX, startY, sampleW, sampleH);
    const data = imgData.data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    // Sample pixels (step by 2 to improve speed on larger areas)
    for (let i = 0; i < data.length; i += 8) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }

    if (count === 0) return { isDark: false, avgLuminance: 255 };

    const rAvg = rSum / count;
    const gAvg = gSum / count;
    const bAvg = bSum / count;

    // Standard perceived luminance formula (ITU-R BT.601)
    const avgLuminance = 0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg;

    // A luminance of < 130 is generally dark background (needs white text)
    // 130 to 255 is light background (needs black text)
    return {
      isDark: avgLuminance < 135,
      avgLuminance
    };
  } catch (error) {
    console.error('Error analyzing background luminance:', error);
    return { isDark: false, avgLuminance: 255 };
  }
}

/**
 * Extracts a palette of dominant colors from a canvas.
 * Samples a grid across the canvas (or specifically the bottom area)
 * and groups similar colors.
 * 
 * @param {HTMLCanvasElement} canvas - The artwork canvas
 * @param {boolean} bottomOnly - If true, only samples from the bottom 30% of the canvas
 * @returns {string[]} Array of Hex color strings (5 unique colors)
 */
export function extractDominantColors(canvas, bottomOnly = true) {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return ['#000000', '#ffffff'];

    const heightStart = bottomOnly ? Math.floor(canvas.height * 0.7) : 0;
    const sampleHeight = canvas.height - heightStart;
    
    // Sample on a grid to get representative pixels
    const gridCols = 15;
    const gridRows = 10;
    const colors = [];

    const cellWidth = canvas.width / gridCols;
    const cellHeight = sampleHeight / gridRows;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const x = Math.floor(c * cellWidth + cellWidth / 2);
        const y = Math.floor(heightStart + r * cellHeight + cellHeight / 2);
        
        if (x >= canvas.width || y >= canvas.height) continue;

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const alpha = pixel[3];

        // Skip transparent/semi-transparent pixels
        if (alpha < 200) continue;

        const rgb = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2]
        };

        colors.push(rgb);
      }
    }

    if (colors.length === 0) {
      return ['#000000', '#ffffff', '#a855f7', '#14b8a6', '#ef4444'];
    }

    // Convert colors to hex and cluster them simply by checking distance
    const hexColors = colors.map(c => rgbToHex(c.r, c.g, c.b));
    
    // Count color frequencies
    const colorCounts = {};
    hexColors.forEach(hex => {
      // Group extremely similar colors by rounding down hex values
      const roundedHex = roundColor(hex);
      colorCounts[roundedHex] = (colorCounts[roundedHex] || 0) + 1;
    });

    // Sort by count descending
    const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);

    // Filter out very close grays, whites, and blacks to make it more colorful
    // But keep at least a solid black and white in the recommendations
    const palette = [];
    
    // Always include standard dark/light options
    palette.push('#000000');
    palette.push('#ffffff');

    for (const color of sortedColors) {
      if (palette.length >= 6) break;
      
      // Avoid adding black or white again
      if (color === '#000000' || color === '#ffffff' || color === '#111111' || color === '#eeeeee') continue;
      
      // Ensure color is sufficiently different from already added ones
      const isUnique = palette.every(p => colorDiff(p, color) > 40);
      if (isUnique) {
        palette.push(color);
      }
    }

    // Fill remaining spots if we didn't find enough unique colors
    const fallbacks = ['#a855f7', '#14b8a6', '#ef4444', '#f59e0b', '#3b82f6'];
    while (palette.length < 5 && fallbacks.length > 0) {
      const fb = fallbacks.shift();
      if (!palette.includes(fb)) palette.push(fb);
    }

    return palette.slice(0, 5); // Return top 5
  } catch (error) {
    console.error('Error extracting dominant colors:', error);
    return ['#000000', '#ffffff', '#a855f7', '#14b8a6', '#ef4444'];
  }
}

// Utility: RGB to Hex
function rgbToHex(r, g, b) {
  const toHex = c => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Utility: Simple color similarity rounding to group similar hues
function roundColor(hex) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  
  // Round to nearest 32
  const roundVal = c => Math.min(255, Math.round(c / 32) * 32);
  
  return rgbToHex(roundVal(r), roundVal(g), roundVal(b));
}

// Utility: Euclidean color distance
function colorDiff(hex1, hex2) {
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);

  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);

  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}
