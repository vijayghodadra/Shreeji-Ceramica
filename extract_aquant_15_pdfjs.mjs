import * as pdfjs from 'pdfjs-dist';
import fs from 'fs';

// PDF.js worker is required
// import 'pdfjs-dist/build/pdf.worker.entry.js'; // This is for browser
// For node, we might need to set the worker manually or use a specific entry point

async function extractText() {
    const pdfPath = './public/Aquant Price List Vol 15. Feb 2026_Searchable.pdf';
    const data = new Uint8Array(fs.readFileSync(pdfPath));

    const loadingTask = pdfjs.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true
    });

    const pdfDocument = await loadingTask.promise;
    console.log(`Number of pages: ${pdfDocument.numPages}`);

    let fullText = '';
    // Extract first 50 pages for analysis
    const maxPages = Math.min(pdfDocument.numPages, 50);

    for (let i = 1; i <= maxPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `\n--- PAGE ${i} ---\n` + pageText;
        console.log(`Extracted page ${i}`);
    }

    fs.writeFileSync('./aquant_15_text_sample.txt', fullText);
    console.log('Saved sample text to aquant_15_text_sample.txt');
}

extractText().catch(console.error);
