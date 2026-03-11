import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createCanvas, ImageData } from '@napi-rs/canvas';

const workerPath = pathToFileURL(path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

const PDF_PATH = './public/Aquant Price List Vol 15. Feb 2026_Searchable.pdf';
const OUT_DIR = './public/catalog/aquant_images';
const JSON_PATH = './src/data/aquant_products.json';

const extractImages = async () => {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const dataBuffer = new Uint8Array(fs.readFileSync(PDF_PATH));
    const loadingTask = pdfjs.getDocument({ data: dataBuffer });
    const doc = await loadingTask.promise;

    let products = [];
    if (fs.existsSync(JSON_PATH)) {
        products = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    }

    if (products.length === 0) {
        console.error("No products found in JSON. Run data extraction first.");
        return;
    }

    const multiply = (m1, m2) => {
        return [
            m1[0] * m2[0] + m1[1] * m2[2],
            m1[0] * m2[1] + m1[1] * m2[3],
            m1[2] * m2[0] + m1[3] * m2[2],
            m1[2] * m2[1] + m1[3] * m2[3],
            m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
            m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
        ];
    };

    let totalSaved = 0;

    for (let pNum = 1; pNum <= doc.numPages; pNum++) {
        const page = await doc.getPage(pNum);
        const opList = await page.getOperatorList();

        // Find all text items on this page
        const textContent = await page.getTextContent();
        let texts = textContent.items.map(it => ({
            str: it.str.replace(/\u0000/g, ' ').trim(),
            x: it.transform[4],
            y: it.transform[5]
        })).filter(it => it.str.length > 0);

        // Map which products from our list are on this page and their locations
        let productsOnPage = [];
        for (let t of texts) {
            let searchStr = t.str;
            if (searchStr.includes(' - ')) {
                searchStr = searchStr.split(' - ')[0].trim();
            }
            const match = products.find(p => p.productCode === searchStr || p.productCode === t.str);
            if (match) {
                productsOnPage.push({ code: match.productCode, x: t.x, y: t.y });
                // if (match.productCode.includes('2041')) console.log(`Found text for ${match.productCode} on page ${pNum} at ${t.x}, ${t.y}`);
            }
        }

        if (productsOnPage.length === 0) continue;

        // Find all image locations on this page
        let transformStack = [[1, 0, 0, 1, 0, 0]];
        let currentTransform = [1, 0, 0, 1, 0, 0];
        let imagesOnPage = [];

        for (let i = 0; i < opList.fnArray.length; i++) {
            const fn = opList.fnArray[i];
            const args = opList.argsArray[i];

            if (fn === pdfjs.OPS.save) {
                transformStack.push([...currentTransform]);
            } else if (fn === pdfjs.OPS.restore) {
                currentTransform = transformStack.pop() || [1, 0, 0, 1, 0, 0];
            } else if (fn === pdfjs.OPS.transform) {
                currentTransform = multiply(currentTransform, args);
            } else if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
                const w = Math.abs(currentTransform[0]);
                const h = Math.abs(currentTransform[3]);
                // Filter out tiny images/icons and massive background textures
                if (w > 40 && h > 40 && w < 220 && h < 220) {
                    imagesOnPage.push({
                        id: args[0],
                        x: currentTransform[4],
                        y: currentTransform[5],
                        w, h
                    });
                }
            }
        }

        for (let prod of productsOnPage) {
            let closestImg = null;
            let minScore = Infinity;

            for (let img of imagesOnPage) {
                // Aquant images are usually ABOVE or to the RIGHT of the code
                // or the code is below the image.
                let dX = Math.abs(img.x - prod.x);
                let dY = Math.abs(img.y - prod.y);

                // Allow a larger search area
                if (dX < 300 && dY < 500) {
                    let score = dX + dY;
                    if (score < minScore) {
                        minScore = score;
                        closestImg = img;
                    }
                }
            }

            if (closestImg) {
                try {
                    let imgData;
                    try {
                        imgData = await page.objs.get(closestImg.id);
                    } catch (err) {
                        if (err.message.includes("isn't resolved yet")) {
                            imgData = await new Promise((resolve) => {
                                page.objs.get(closestImg.id, resolve);
                            });
                        } else {
                            throw err;
                        }
                    }
                    if (!imgData || !imgData.data) continue;

                    const canvas = createCanvas(imgData.width, imgData.height);
                    const ctx = canvas.getContext('2d');

                    let rgba;
                    const numPixels = imgData.width * imgData.height;

                    if (imgData.data.length === numPixels * 3) {
                        rgba = new Uint8ClampedArray(numPixels * 4);
                        for (let p = 0, d = 0; p < imgData.data.length; p += 3, d += 4) {
                            rgba[d] = imgData.data[p];
                            rgba[d + 1] = imgData.data[p + 1];
                            rgba[d + 2] = imgData.data[p + 2];
                            rgba[d + 3] = 255;
                        }
                    } else if (imgData.data.length === numPixels * 4) {
                        rgba = new Uint8ClampedArray(imgData.data.buffer);
                    } else if (imgData.data.length === numPixels) {
                        rgba = new Uint8ClampedArray(numPixels * 4);
                        for (let p = 0, d = 0; p < imgData.data.length; p++, d += 4) {
                            rgba[d] = imgData.data[p];
                            rgba[d + 1] = imgData.data[p];
                            rgba[d + 2] = imgData.data[p];
                            rgba[d + 3] = 255;
                        }
                    } else continue;

                    const idata = new ImageData(rgba, imgData.width, imgData.height);
                    ctx.putImageData(idata, 0, 0);

                    const safeName = prod.code.replace(/[^a-zA-Z0-9]/g, '_');
                    const imgPath = path.join(OUT_DIR, `${safeName}.jpg`);
                    fs.writeFileSync(imgPath, canvas.toBuffer('image/jpeg'));

                    const p = products.find(pt => pt.productCode === prod.code);
                    if (p) p.image = `/catalog/aquant_images/${safeName}.jpg`;

                    totalSaved++;
                    // console.log(`Saved image for ${prod.code}`);
                } catch (e) {
                    console.error(`Error saving image for ${prod.code}: ${e.message}`);
                }
            } else {
                if (prod.code.includes('2041')) console.log(`No images found close enough for ${prod.code}`);
            }
        }
    }

    fs.writeFileSync(JSON_PATH, JSON.stringify(products, null, 2));
    console.log(`Total images saved: ${totalSaved}`);
};

extractImages().catch(console.error);
