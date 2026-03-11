const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const DIR = './public/catalog/aquant_images';

async function processBlock(sourceImage, leftCode, rightCode) {
    const rawPath = path.join(DIR, sourceImage);
    if (!fs.existsSync(rawPath)) {
        console.error("Missing:", rawPath);
        return;
    }
    const img = await loadImage(rawPath);
    console.log(`Processing ${sourceImage}: ${img.width}x${img.height}`);

    // The images contain two knob pairs, left and right.
    const splitX = Math.floor(img.width / 2);

    // Left
    if (leftCode) {
        const cLeft = createCanvas(splitX, img.height);
        const ctxL = cLeft.getContext('2d');
        ctxL.drawImage(img, 0, 0, splitX, img.height, 0, 0, splitX, img.height);
        fs.writeFileSync(path.join(DIR, `1330_${leftCode}.jpg`), cLeft.toBuffer('image/jpeg'));
        console.log(`Saved 1330_${leftCode}.jpg`);
    }

    // Right
    if (rightCode) {
        const wRight = img.width - splitX;
        const cRight = createCanvas(wRight, img.height);
        const ctxR = cRight.getContext('2d');
        ctxR.drawImage(img, splitX, 0, wRight, img.height, 0, 0, wRight, img.height);
        fs.writeFileSync(path.join(DIR, `1330_${rightCode}.jpg`), cRight.toBuffer('image/jpeg'));
        console.log(`Saved 1330_${rightCode}.jpg`);
    }
}

async function main() {
    // Top block: CI (left), GB (right)
    await processBlock('1330_CI.jpg', 'CI', 'GB');

    // Middle block: IR (left), MT (right)
    await processBlock('1330_IR.jpg', 'IR', 'MT');

    // Bottom block: GS (left), AO (right)
    await processBlock('1330_GS.jpg', 'GS', 'AO');

    console.log("Done cropping.");
}

main().catch(console.error);
