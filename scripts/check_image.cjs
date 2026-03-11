const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const imgPath = './public/catalog/aquant_images/1330_CM.jpg';

async function checkImage() {
    if (!fs.existsSync(imgPath)) {
        console.log("Image not found");
        return;
    }
    const img = await loadImage(imgPath);
    console.log(`Image width: ${img.width}, height: ${img.height}`);
}

checkImage();
