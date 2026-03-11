const { loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const dir = './public/catalog/aquant_images';

async function checkAll() {
    const files = fs.readdirSync(dir).filter(f => f.startsWith('1330_'));
    for (const file of files) {
        const img = await loadImage(path.join(dir, file));
        console.log(`${file}: ${img.width}x${img.height}`);
    }
}

checkAll();
