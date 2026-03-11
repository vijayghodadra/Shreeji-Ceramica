import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const workerPath = pathToFileURL(path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

const PDF_PATH = './public/Aquant Price List Vol 15. Feb 2026_Searchable.pdf';

const extractData = async () => {
    const dataBuffer = new Uint8Array(fs.readFileSync(PDF_PATH));
    const loadingTask = pdfjs.getDocument({ data: dataBuffer });
    const doc = await loadingTask.promise;

    let allProducts = [];

    // PRE-PASS: Find all sliced special finish images
    const imgDir = './public/catalog/aquant_images/';
    const slicedImages = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter(f => f.match(/^\d{4}_[A-Z]{2,3}\.jpg$/)) : [];
    const slicedCodes = new Set(slicedImages.map(f => f.split('_')[0]));

    const colorMap = {
        'BRG': 'Brushed Rose Gold',
        'BG': 'Brushed Gold',
        'GG': 'Graphite Grey',
        'MB': 'Matt Black',
        'RG': 'Rose Gold',
        'CP': 'Chrome',
        'G': 'Gold',
        'ORB': 'Oil Rubbed Bronze',
        'SS': 'Stainless Steel'
    };

    // Store descriptions discovered for each 4-digit base code
    const baseDescriptions = new Map();

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();

        let items = textContent.items.map(it => ({
            str: it.str.replace(/\u0000/g, ' ').trim(),
            x: it.transform[4],
            y: it.transform[5]
        })).filter(it => it.str.length > 0);

        const codes = items.filter(it => it.str.match(/^(?:[0-9]{3,6}(?:[\s\+\/\-]+[a-zA-Z0-9\+\/\-]{1,15})*(?:\s*-\s*[a-zA-Z\s]+)?|Wooden Seat Cover)$/))
            .filter(it => {
                const s = it.str;
                if (s.includes('Vol') || s.includes('Page') || s.includes('Size') || s.includes('MRP')) return false;
                if (s.match(/[0-9]{3} x [0-9]{3}/)) return false;
                if (s.match(/^[0-9\s]+mm$/i) || s.includes('/-')) return false;
                if (s.length > 50) return false;
                if (s.match(/^[0-9]+$/) && s.length < 3) return false;
                return true;
            });

        // First Pass on Page: Discover descriptions for base codes
        for (let codeItem of codes) {
            let code = codeItem.str;
            // For combo products (with +), use the full string as baseCode to avoid incorrect groupings
            const baseCodeMatch = code.match(/^(\d{4})/);
            let baseCode = baseCodeMatch ? baseCodeMatch[1] : code;
            if (code.includes('+')) baseCode = code.split(' ')[0] + '_combo';
            if (!baseCode) continue;

            let nameItems = items.filter(it => {
                const searchYSpreadLower = 40;
                const searchYSpreadUpper = 10;
                const isWithinY = it.y <= (codeItem.y + searchYSpreadUpper) && it.y > (codeItem.y - searchYSpreadLower);
                const isWithinX = it.x >= (codeItem.x - 40) && it.x < (codeItem.x + 100);
                if (!isWithinY || !isWithinX) return false;
                const otherCodesInBetween = codes.filter(c => 
                    c.str !== codeItem.str && c.x >= (codeItem.x - 40) && c.x < (codeItem.x + 100) &&
                    ((c.y < codeItem.y && c.y > it.y) || (c.y > codeItem.y && c.y < it.y))
                );
                return otherCodesInBetween.length === 0;
            });
            let priceItems = nameItems.filter(it => it.y <= codeItem.y + 4); 
            
            nameItems.sort((a, b) => b.y !== a.y ? b.y - a.y : a.x - b.x);
            let nameBlob = nameItems.filter(it => !codes.find(c => c.str === it.str && c !== codeItem)).map(it => it.str).join(' ');
            let priceBlob = priceItems.filter(it => !codes.find(c => c.str === it.str && c !== codeItem)).map(it => it.str).join(' ');
            
            let name = nameBlob.split(/\bMRP\b|\bSize\b|●/i)[0].trim();
            name = name.replace(/ARTISTIC WASH BASINS IN UNIQUE MATERIALS|Micro-Concrete Pedestal|Micro-Concrete Plate/gi, '').trim();
            // Clean up name: remove the product code and any color variant codes (e.g. 4041 BRG)
            // Use word boundaries \b to avoid partial word matching (e.g. Brass -> Bra)
            name = name.replace(/\b\d{4}\s+[A-Z]{2,3}\b/g, '').trim();
            name = name.replace(/\b\d{4}\b/g, '').trim();

            const colorPatterns = Object.entries(colorMap).flatMap(([k, v]) => [k, v]);
            // Sort patterns by length descending to match longer phrases first
            colorPatterns.sort((a, b) => b.length - a.length);

            for (const pattern of colorPatterns) {
                // Use word boundaries and only replace once or twice if needed, but carefully
                const pRegex = new RegExp('\\b(' + pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')\\b', 'gi');
                name = name.replace(pRegex, '').trim();
            }
            name = name.replace(/^[- ]+/, '').replace(/[- ]+$/, '').trim();
            name = name.replace(/\s+/g, ' ');

            if (name.length > 2) { // Minimal valid name
                if (!baseDescriptions.has(baseCode) || name.length > baseDescriptions.get(baseCode).name.length) {
                    let mrpMatch = priceBlob.match(/MRP\s*[:\s]*`?\s*([0-9,]+)/i);
                    let sizeMatch = nameBlob.match(/Size\s*[:\s]*([^●?]+?)(?=\s*MRP|\s*●|$)/i);
                    baseDescriptions.set(baseCode, { name, size: sizeMatch ? sizeMatch[1].trim() : "", rate: mrpMatch ? parseInt(mrpMatch[1].replace(/,/g, ''), 10) : 0 });
                }
            }
        }

        // Second Pass on Page: Process variants
        for (let codeItem of codes) {
            let code = codeItem.str;
            let inlineColor = "";

            if (code.includes(' - ')) {
                const parts = code.split(' - ');
                code = parts[0].trim();
                inlineColor = parts.slice(1).join(' - ').trim();
            }

            const baseCodeMatch = code.match(/^(\d{4})/);
            let baseCode = baseCodeMatch ? baseCodeMatch[1] : code;
            if (code.includes('+')) baseCode = code.split(' ')[0] + '_combo';

            let nameItems = items.filter(it => {
                const searchYSpreadLower = 100;
                const searchYSpreadUpper = 40;
                const isWithinY = it.y <= (codeItem.y + searchYSpreadUpper) && it.y > (codeItem.y - searchYSpreadLower);
                const isWithinX = it.x >= (codeItem.x - 40) && it.x < (codeItem.x + (code.includes('+') ? 140 : 100));
                if (!isWithinY || !isWithinX) return false;
                
                const otherCodesInBetween = codes.filter(c => 
                    c.str !== codeItem.str && c.x >= (codeItem.x - 40) && c.x < (codeItem.x + (code.includes('+') ? 140 : 100)) &&
                    ((c.y < codeItem.y && c.y > it.y) || (c.y > codeItem.y && c.y < it.y))
                );
                return otherCodesInBetween.length === 0;
            });
            let priceItems = nameItems.filter(it => it.y <= codeItem.y + 4);

            nameItems.sort((a, b) => b.y !== a.y ? b.y - a.y : a.x - b.x);
            let nameBlob = nameItems.filter(it => !codes.find(c => c.str === it.str && c !== codeItem)).map(it => it.str).join(' ');
            let priceBlob = priceItems.filter(it => !codes.find(c => c.str === it.str && c !== codeItem)).map(it => it.str).join(' ');

            let mrpMatch = priceBlob.match(/\bMRP\b\s*[:\s]*`?\s*([0-9,]+)/i);
            let sizeMatch = nameBlob.match(/\bSize\b\s*[:\s]*([^●?]+?)(?=\s*MRP|\s*●|$)/i);
            let name = nameBlob.split(/\bMRP\b|\bSize\b|●/i)[0].trim();
            name = name.replace(/ARTISTIC WASH BASINS IN UNIQUE MATERIALS|Micro-Concrete Pedestal|Micro-Concrete Plate/gi, '').trim();
            // Clean up name: remove the product code and any color variant codes (e.g. 4041 BRG)
            // Use word boundaries \b to avoid partial word matching (e.g. Brass -> Bra)
            name = name.replace(/\b\d{4}\s+[A-Z]{2,3}\b/g, '').trim();
            name = name.replace(/\b\d{4}\b/g, '').trim();

            const colorPatterns = Object.entries(colorMap).flatMap(([k, v]) => [k, v]);
            // Sort patterns by length descending to match longer phrases first
            colorPatterns.sort((a, b) => b.length - a.length);

            for (const pattern of colorPatterns) {
                // Use word boundaries and only replace once or twice if needed, but carefully
                const pRegex = new RegExp('\\b(' + pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')\\b', 'gi');
                name = name.replace(pRegex, '').trim();
            }
            name = name.replace(/^[- ]+/, '').replace(/[- ]+$/, '').trim();
            name = name.replace(/\s+/g, ' ');

            // Remove page headers/footers that might bleed into the name
            name = name.replace(/Vol\s*\d+\s*\|\s*Page\s*\d+/gi, '').trim();
            name = name.replace(/Aquant\s*Price\s*List/gi, '').trim();


            if (mrpMatch || baseDescriptions.has(baseCode)) {
                const rate = mrpMatch ? parseInt(mrpMatch[1].replace(/,/g, ''), 10) : (baseDescriptions.get(baseCode)?.rate || 0);
                const size = sizeMatch ? sizeMatch[1].trim() : (baseDescriptions.get(baseCode)?.size || "");

                let color = inlineColor;
                if (!color) {
                    const mrpIndex = nameBlob.search(/MRP/i);
                    if (mrpIndex !== -1) {
                        const afterMrp = nameBlob.substring(mrpIndex).replace(/MRP\s*[:\s]*`?\s*[0-9,/-]+/i, '').trim();
                        color = afterMrp.split(' ')[0] + (afterMrp.split(' ')[1] ? " " + afterMrp.split(' ')[1] : "");
                        if (color.match(/[0-9]/)) color = "";
                    }
                }

                const suffixMatch = code.match(/^\d{4}\s+([A-Z]{2,3})$/);
                const suffix = suffixMatch ? suffixMatch[1] : null;

                if (code.startsWith('1330')) {
                    const isCarrara = code.includes('CM') || color.toLowerCase().includes('marble');
                    const knobColorMatch = code.match(/1330\s*([A-Z]{2})/);
                    const knobSuffix = knobColorMatch ? knobColorMatch[1] : (isCarrara ? 'CM' : '');

                    const knobColorMap = {
                        'CI': 'Crystal Ice',
                        'GB': 'Glacier Blue',
                        'IR': 'Inferno Red',
                        'MT': 'Mystical Turquoise',
                        'GS': 'Graphite Smoke',
                        'AO': 'Amber Orange',
                        'CM': 'Carrara Marble'
                    };

                    let imgPath = `/catalog/aquant_images/1330_${knobSuffix}.jpg`;

                    const knobColorTotal = knobColorMap[knobSuffix] || colorMap[knobSuffix] || color;
                    const finalKnobName = isCarrara ? "Italian Stone Carrara Marble Knobs (set of 2)" : "Original Crystal Knobs Handmade In Italy (set of 2)";

                    allProducts.push({
                        productCode: `1330 ${knobSuffix}`,
                        productName: `1330 ${knobSuffix} - ${knobColorTotal} ${finalKnobName}`.trim(),
                        rate,
                        size,
                        color: knobColorTotal.trim().replace(/:/g, ''),
                        image: imgPath
                    });
                } else if (baseCode && slicedCodes.has(baseCode) && suffix) {
                    const fullColor = colorMap[suffix] || suffix;
                    const finalDesc = baseDescriptions.get(baseCode)?.name || name;

                    allProducts.push({
                        productCode: code,
                        productName: `${code} - ${fullColor} ${finalDesc}`.trim().replace(/\s+/g, ' '),
                        rate,
                        size,
                        color: fullColor,
                        image: `/catalog/aquant_images/${baseCode}_${suffix}.jpg`
                    });
                } else {
                    allProducts.push({
                        productCode: code,
                        productName: name || (baseDescriptions.get(baseCode)?.name || ""),
                        rate,
                        size: size || (baseDescriptions.get(baseCode)?.size || ""),
                        color: color.trim().replace(/:/g, ''),
                        image: `/catalog/aquant_images/${code.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
                    });
                }
            }
        }
    }

    const unique = new Map();
    for (const p of allProducts) {
        if (!unique.has(p.productCode)) unique.set(p.productCode, p);
    }
    const final = Array.from(unique.values()).map((p, i) => ({ id: String(i + 1), ...p }));

    final.push({ id: (final.length + 1).toString(), productCode: '1870 W - Seat', productName: '1870 W - Seat Extra Intelligent Toilet Seat for 1870 W', rate: 140000, size: '', color: 'White', image: '/catalog/aquant_images/1870_W_Seat.jpg' });
    final.push({ id: (final.length + 2).toString(), productCode: '1870 W - Doorbell', productName: '1870 W - Doorbell Extra Doorbell Remote for 1870 W', rate: 9500, size: '', color: '', image: '/catalog/aquant_images/1870_W_Doorbell.jpg' });
    final.push({ id: (final.length + 3).toString(), productCode: '1870 W - Remote', productName: '1870 W - Remote Extra Intelligent Toilet Remote for 1870 W', rate: 7500, size: '', color: '', image: '/catalog/aquant_images/1870_W_Remote.jpg' });

    final.sort((a, b) => a.productCode.localeCompare(b.productCode));
    fs.writeFileSync('./src/data/aquant_products.json', JSON.stringify(final, null, 2));
    console.log(`Extracted ${final.length} Aquant products.`);
};

extractData().catch(console.error);
