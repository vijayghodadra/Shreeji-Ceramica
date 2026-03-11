import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createCanvas, ImageData } from '@napi-rs/canvas';

const workerPath = pathToFileURL(path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

const PDF_PATH = './public/Aquant Price List Vol 15. Feb 2026_Searchable.pdf';

const extractPage = async () => {
    const dataBuffer = new Uint8Array(fs.readFileSync(PDF_PATH));
    const loadingTask = pdfjs.getDocument({ data: dataBuffer });
    const doc = await loadingTask.promise;
    const page = await doc.getPage(4);
    const opList = await page.getOperatorList();

    let transformStack = [[1, 0, 0, 1, 0, 0]];
    let currentTransform = [1, 0, 0, 1, 0, 0];
    let imgIdx = 0;

    const multiply = (m1, m2) => [
        m1[0] * m2[0] + m1[1] * m2[2], m1[0] * m2[1] + m1[1] * m2[3],
        m1[2] * m2[0] + m1[3] * m2[2], m1[2] * m2[1] + m1[3] * m2[3],
        m1[4] * m2[0] + m1[5] * m2[2] + m2[4], m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
    ];

    const outDir = './public/catalog/debug_p4';
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        const args = opList.argsArray[i];

        if (fn === pdfjs.OPS.save) transformStack.push([...currentTransform]);
        else if (fn === pdfjs.OPS.restore) currentTransform = transformStack.pop();
        else if (fn === pdfjs.OPS.transform) currentTransform = multiply(currentTransform, args);
        else if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject) {
            const w = Math.abs(currentTransform[0]);
            const h = Math.abs(currentTransform[3]);
            if (w > 15 && h > 15) {
                try {
                    const imgData = await page.objs.get(args[0]);
                    if (!imgData || !imgData.data) continue;

                    const canvas = createCanvas(imgData.width, imgData.height);
                    const ctx = canvas.getContext('2d');

                    let rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
                    const numPixels = imgData.width * imgData.height;

                    if (imgData.data.length === numPixels * 3) {
                        for (let p = 0, d = 0; p < imgData.data.length; p += 3, d += 4) {
                            rgba[d] = imgData.data[p]; rgba[d + 1] = imgData.data[p + 1]; rgba[d + 2] = imgData.data[p + 2]; rgba[d + 3] = 255;
                        }
                    } else if (imgData.data.length === numPixels * 4) {
                        rgba = new Uint8ClampedArray(imgData.data.buffer);
                    } else continue;

                    ctx.putImageData(new ImageData(rgba, imgData.width, imgData.height), 0, 0);
                    fs.writeFileSync(`${outDir}/img_${imgIdx}_x${Math.round(currentTransform[4])}_y${Math.round(currentTransform[5])}.jpg`, canvas.toBuffer('image/jpeg'));
                    imgIdx++;
                } catch (e) { }
            }
        }
    }
    console.log(`Saved ${imgIdx} images.`);
};
extractPage().catch(console.error);
