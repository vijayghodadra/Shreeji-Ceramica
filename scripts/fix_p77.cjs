const fs = require('fs');

const FIXES = [
    { code: '1837 CB', name: '1837 CB - Crocodile Leather Black', price: 44500, size: '490 x 370 x 370 mm', imgUrl: '1837_CB_fixed.jpg', srcImg: 'img_12_x160_y628.jpg' },
    { code: '7068 CB', name: '7068 CB - Crocodile Leather Black', price: 16500, size: '500 x 400 x 140 mm', imgUrl: '7068_CB_fixed.jpg', srcImg: 'img_12_x160_y628.jpg' }, // fallback for missing basin

    { code: '1733 SM', name: '1733 SM - Statuario Glossy Finish', price: 15500, size: '600 x 370 x 145 mm', imgUrl: '1733_SM_fixed.jpg', srcImg: 'img_4_x16_y445.jpg' },
    { code: '1837 SM', name: '1837 SM - Statuario Glossy Finish', price: 32500, size: '490 x 370 x 370 mm', imgUrl: '1837_SM_fixed.jpg', srcImg: 'img_10_x160_y444.jpg' },
    { code: '1733 BM', name: '1733 BM - Marquina Glossy Finish', price: 15500, size: '600 x 370 x 145 mm', imgUrl: '1733_BM_fixed.jpg', srcImg: 'img_1_x303_y441.jpg' },
    { code: '1837 BM', name: '1837 BM - Marquina Glossy Finish', price: 32500, size: '490 x 370 x 370 mm', imgUrl: '1837_BM_fixed.jpg', srcImg: 'img_7_x447_y446.jpg' },

    { code: '7067 SM', name: '7067 SM - Statuario Glossy Finish', price: 14500, size: '615 x 360 x 110 mm', imgUrl: '7067_SM_fixed.jpg', srcImg: 'img_3_x17_y274.jpg' },
    { code: '1831 SM', name: '1831 SM - Statuario Glossy Finish', price: 32500, size: '515 x 360 x 360 mm', imgUrl: '1831_SM_fixed.jpg', srcImg: 'img_9_x160_y252.jpg' },
    { code: '7067 BM', name: '7067 BM - Marquina Glossy Finish', price: 14500, size: '615 x 360 x 110 mm', imgUrl: '7067_BM_fixed.jpg', srcImg: 'img_0_x303_y274.jpg' },
    { code: '1831 BM', name: '1831 BM - Marquina Glossy Finish', price: 32500, size: '515 x 360 x 360 mm', imgUrl: '1831_BM_fixed.jpg', srcImg: 'img_6_x446_y252.jpg' },

    { code: '1902 SM', name: '1902 SM - Statuario Matt Finish', price: 14000, size: '550 x 400 x 140 mm', imgUrl: '1902_SM_fixed.jpg', srcImg: 'img_5_x17_y52.jpg' },
    { code: '1936 SM', name: '1936 SM - Statuario Matt Finish', price: 14000, size: '525 x 410 x 160 mm', imgUrl: '1936_SM_fixed.jpg', srcImg: 'img_11_x160_y61.jpg' },
    { code: '1902 BM', name: '1902 BM - Marquina Matt Finish', price: 14000, size: '550 x 400 x 140 mm', imgUrl: '1902_BM_fixed.jpg', srcImg: 'img_2_x303_y52.jpg' },
    { code: '1936 BM', name: '1936 BM - Marquina Matt Finish', price: 14000, size: '525 x 410 x 160 mm', imgUrl: '1936_BM_fixed.jpg', srcImg: 'img_8_x446_y61.jpg' }
];

const dataPath = './src/data/aquant_products.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const ts = Date.now();

for (const fix of FIXES) {
    try {
        fs.copyFileSync(`./public/catalog/debug_p77/${fix.srcImg}`, `./public/catalog/aquant_images/${fix.imgUrl}`);
    } catch (e) {
        console.log("Could not copy:", fix.srcImg);
    }

    const prod = data.find(p => p.productCode === fix.code);
    if (prod) {
        prod.productName = fix.name;
        prod.rate = fix.price;
        prod.size = `Size : ${fix.size}`;
        prod.image = `/catalog/aquant_images/${fix.imgUrl}?v=${ts}`;
        console.log(`Fixed ${fix.code}`);
    } else {
        console.log(`Could not find product ${fix.code}`);
    }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Update complete!');
