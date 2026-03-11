const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

async function cropImages() {
    const rawPath = './public/catalog/aquant_images/1330_CI.jpg';
    if (!fs.existsSync(rawPath)) {
        console.error("Source image not found");
        return;
    }

    const img = await loadImage(rawPath);

    // Create Crystal Knobs image
    // The total width is 749. The crystal knobs take up the left ~600px. The marble is on the right.
    const splitX = 580; // approximate split point

    const crystalCanvas = createCanvas(splitX, img.height);
    const ctxCrystal = crystalCanvas.getContext('2d');
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    ctxCrystal.drawImage(img, 0, 0, splitX, img.height, 0, 0, splitX, img.height);
    fs.writeFileSync('./public/catalog/aquant_images/crystal_knobs.jpg', crystalCanvas.toBuffer('image/jpeg'));
    console.log("Saved crystal_knobs.jpg");

    const marbleWidth = img.width - splitX;
    const marbleCanvas = createCanvas(marbleWidth, img.height);
    const ctxMarble = marbleCanvas.getContext('2d');
    ctxMarble.drawImage(img, splitX, 0, marbleWidth, img.height, 0, 0, marbleWidth, img.height);
    fs.writeFileSync('./public/catalog/aquant_images/marble_knobs.jpg', marbleCanvas.toBuffer('image/jpeg'));
    console.log("Saved marble_knobs.jpg");
}

cropImages();
