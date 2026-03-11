const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function sliceKnobs() {
    const rawPath = path.join(__dirname, '../public/catalog/aquant_images/crystal_knobs.jpg');
    if (!fs.existsSync(rawPath)) {
        console.error("Source image not found at", rawPath);
        return;
    }

    const img = await loadImage(rawPath);
    console.log(`Original image: ${img.width}x${img.height}`);

    // The image has 3 columns. We split it into 3 equal pieces.
    const cols = 3;
    const pieceWidth = Math.floor(img.width / cols);

    for (let i = 0; i < cols; i++) {
        const canvas = createCanvas(pieceWidth, img.height);
        const ctx = canvas.getContext('2d');

        // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
        ctx.drawImage(img, i * pieceWidth, 0, pieceWidth, img.height, 0, 0, pieceWidth, img.height);

        const outName = `crystal_knobs_${i + 1}.jpg`;
        const outPath = path.join(__dirname, `../public/catalog/aquant_images/${outName}`);
        fs.writeFileSync(outPath, canvas.toBuffer('image/jpeg'));
        console.log(`Saved ${outName} (${pieceWidth}x${img.height})`);
    }
}

sliceKnobs().catch(console.error);
