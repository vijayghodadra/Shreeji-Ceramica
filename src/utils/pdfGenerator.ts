import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CustomerDetails, ProductDetails, QuoteCalculations } from '../types';
import { calculateQuoteTotals, formatCurrencySimple } from './calculations';

const fetchImageAsBase64 = async (path: string): Promise<string | null> => {
    try {
        const response = await fetch(path);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error(`Failed to load ${path} for PDF`, err);
        return null;
    }
};

const fetchLogoAsBase64 = () => fetchImageAsBase64('/logo.png');


/**
 * Stamps a diagonal semi-transparent SHREEJI CERAMICA watermark on every page,
 * with a faint logo centred on each page.
 */
const addWatermarkToAllPages = (
    doc: jsPDF,
    logoDataUrl: string | null
): void => {
    const totalPages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const cx = pageW / 2;
    const cy = pageH / 2;

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // ── Faint diagonal text watermark ───────────────────────────────
        doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
        doc.setFontSize(38);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 54, 93);
        doc.text('SHREEJI CERAMICA', cx, cy - 18, { align: 'center', angle: 45 });
        doc.setFontSize(16);
        doc.text('CONFIDENTIAL', cx, cy + 10, { align: 'center', angle: 45 });

        // ── Faint logo centred behind content ───────────────────────────
        if (logoDataUrl) {
            try {
                // Draw logo very faintly in the centre
                const logoW = 55;
                const logoH = 30;
                doc.addImage(logoDataUrl, 'PNG', cx - logoW / 2, cy - logoH / 2 - 18, logoW, logoH);
            } catch (_) { /* ignore logo errors */ }
        }

        // Reset opacity back to fully opaque for the next elements
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
};

/**
 * Internal helper to prepare the jsPDF document instance
 */
const preparePDFDoc = async (
    customer: CustomerDetails,
    products: ProductDetails[],
    discountMode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL',
    discountValue: number,
    includeGST: boolean,
    gstPercentage: number = 18,
    quoteNumber?: number,
    enableWatermark: boolean = true,
    preparedBy: string = ''
): Promise<jsPDF> => {
    // Encryption: only applied when watermark/branding is enabled
    const doc = enableWatermark
        ? new jsPDF({
            encryption: {
                userPassword: '',
                ownerPassword: 'SC@SecureDoc#2026',
                userPermissions: ['print', 'print-high']
            }
        } as any)
        : new jsPDF();
    const totals = calculateQuoteTotals(products, discountMode, discountValue, includeGST, gstPercentage);

    // Theme Colors
    const primaryColor: [number, number, number] = [26, 54, 93];
    const accentColor: [number, number, number] = [203, 162, 88];
    const textColor: [number, number, number] = [45, 55, 72];

    // Load all logos in parallel (brand logos always fetched; SC logo only when branding enabled)
    const [logoDataUrl, kohlerLogo, aquantLogo, plumberLogo] = await Promise.all([
        enableWatermark ? fetchLogoAsBase64() : Promise.resolve(null),
        fetchImageAsBase64('/kohler_logo.png'),
        fetchImageAsBase64('/aquant_logo_bg.png'),
        fetchImageAsBase64('/plumber_logo.png'),
    ]);

    // Setup Sections — pass branding flag so header knows what to show
    const headerBottom = setupHeader(
        doc, primaryColor, accentColor, textColor,
        logoDataUrl, quoteNumber, enableWatermark,
        kohlerLogo, aquantLogo, plumberLogo, preparedBy
    );
    const billingBottom = setupBillTo(doc, customer, primaryColor, textColor, headerBottom + 10);

    // Group products by room
    const roomMap: Record<string, ProductDetails[]> = {};
    for (const p of products) {
        const key = p.room?.trim() || 'General';
        if (!roomMap[key]) roomMap[key] = [];
        roomMap[key].push(p);
    }
    const rooms = Object.keys(roomMap);
    const hasMultipleRooms = rooms.length > 1 || (rooms.length === 1 && rooms[0] !== 'General');

    let currentY = billingBottom + 10;
    const roomSubtotals: { room: string; subtotal: number }[] = [];

    if (hasMultipleRooms) {
        // Render each room as a separate section
        for (const room of rooms) {
            const roomProducts = roomMap[room];
            const roomSubtotal = roomProducts.reduce((s, p) => s + (p.rate * p.quantity - p.discountAmount), 0);
            roomSubtotals.push({ room, subtotal: roomSubtotal });
            currentY = await setupProductTableForRoom(doc, roomProducts, room, primaryColor, accentColor, textColor, currentY);
            currentY += 4;
        }
        // Summary of all rooms table
        currentY = setupRoomSummaryTable(doc, roomSubtotals, totals, includeGST, gstPercentage, primaryColor, accentColor, textColor, currentY + 4);
    } else {
        // Single group — render normally without room header
        currentY = await setupProductTable(doc, products, primaryColor, textColor, currentY);
    }

    const totalsBottom = setupTotalsTable(doc, totals, includeGST, primaryColor, accentColor, textColor, currentY + 5);
    // Terms & signatory only shown when branding is enabled
    if (enableWatermark) {
        setupTerms(doc, totalsBottom + 15, primaryColor, textColor);
    }

    // Stamp watermark on every page AFTER all content is rendered (only if enabled)
    if (enableWatermark) {
        addWatermarkToAllPages(doc, logoDataUrl);
    }

    return doc;
};


/**
 * Generates and downloads the PDF
 */
export const generatePDF = async (
    customer: CustomerDetails,
    products: ProductDetails[],
    discountMode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL',
    discountValue: number,
    includeGST: boolean,
    gstPercentage: number = 18,
    quoteNumber?: number,
    enableWatermark: boolean = true,
    preparedBy: string = ''
) => {
    const doc = await preparePDFDoc(customer, products, discountMode, discountValue, includeGST, gstPercentage, quoteNumber, enableWatermark, preparedBy);
    const fileName = `Quotation_Shreeji_Ceramica_${customer.customerName?.replace(/\s+/g, '_') || Date.now()}.pdf`;
    doc.save(fileName);
};

/**
 * Generates a blob URL for PDF preview
 */
export const getPDFBlobUrl = async (
    customer: CustomerDetails,
    products: ProductDetails[],
    discountMode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL',
    discountValue: number,
    includeGST: boolean,
    gstPercentage: number = 18,
    quoteNumber?: number,
    enableWatermark: boolean = true,
    preparedBy: string = ''
): Promise<string> => {
    const doc = await preparePDFDoc(customer, products, discountMode, discountValue, includeGST, gstPercentage, quoteNumber, enableWatermark, preparedBy);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
};

/**
 * Returns a File object for sharing via Web Share API
 */
export const getPDFFile = async (
    customer: CustomerDetails,
    products: ProductDetails[],
    discountMode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL',
    discountValue: number,
    includeGST: boolean,
    gstPercentage: number = 18,
    quoteNumber?: number,
    enableWatermark: boolean = true,
    preparedBy: string = ''
): Promise<File> => {
    const doc = await preparePDFDoc(customer, products, discountMode, discountValue, includeGST, gstPercentage, quoteNumber, enableWatermark, preparedBy);
    const blob = doc.output('blob');
    const fileName = `Quotation_Shreeji_Ceramica_${customer.customerName?.replace(/\s+/g, '_') || Date.now()}.pdf`;
    return new File([blob], fileName, { type: 'application/pdf' });
};

// --- Private Helper Functions ---

const setupHeader = (
    doc: jsPDF,
    primaryColor: [number, number, number],
    accentColor: [number, number, number],
    textColor: [number, number, number],
    logoDataUrl: string | null,
    quoteNumber?: number,
    enableBranding: boolean = true,
    kohlerLogo: string | null = null,
    aquantLogo: string | null = null,
    plumberLogo: string | null = null,
    preparedBy: string = ''
): number => {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    if (!enableBranding) {
        // ── WATERMARK OFF: show Business Proposal / Ref / Date at top ────
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(203, 162, 88); // accentColor
        doc.text('BUSINESS PROPOSAL', 14, 18);



        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(45, 55, 72); // textColor
        doc.text(`Ref: SC-${quoteNumber || 'NEW'}   |   Date: ${today}`, 14, 25);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(14, 30, 196, 30);
        return 30;
    }

    // ── WATERMARK ON: full branded header (logos + SC company) ──────────

    // ── LAYOUT ZONES ────────────────────────────────────────────────────
    const LEFT_ZONE_END = 93;
    const RIGHT_ZONE_END = 196;
    const HEADER_Y = 8;
    const LOGO_ROW_H = 18;
    const LOGO_CENTER_Y = HEADER_Y + LOGO_ROW_H / 2;


    // ── LEFT: 3 brand logos evenly distributed in 79mm ──────────────────
    // Each logo box: (79 - 2 gaps of 4) / 3 = 23.7mm → use 22mm each, 4.5mm gap
    const BRAND_W = 22;
    const BRAND_H = 13;
    const BRAND_GAP = 4;

    const brands = [
        { src: kohlerLogo, x: 14 },
        { src: aquantLogo, x: 14 + BRAND_W + BRAND_GAP },
        { src: plumberLogo, x: 14 + (BRAND_W + BRAND_GAP) * 2 },
    ];
    // Last brand ends at: 14 + 22*3 + 4*2 = 14 + 66 + 8 = 88 — within LEFT_ZONE_END ✓

    for (const brand of brands) {
        if (brand.src) {
            try {
                // Draw brand logo centred vertically in LOGO_ROW_H
                const imgY = HEADER_Y + (LOGO_ROW_H - BRAND_H) / 2;
                doc.addImage(brand.src, 'PNG', brand.x, imgY, BRAND_W, BRAND_H);
            } catch { /* skip if image fails */ }
        }
    }

    // Thin vertical separator between zones
    doc.setDrawColor(210, 215, 220);
    doc.setLineWidth(0.3);
    doc.line(LEFT_ZONE_END + 1, HEADER_Y, LEFT_ZONE_END + 1, HEADER_Y + LOGO_ROW_H);

    // ── RIGHT: SC Logo (far right) + Company name/details ───────────────
    const SC_LOGO_W = 28, SC_LOGO_H = 17;
    const scLogoX = RIGHT_ZONE_END - SC_LOGO_W;  // x = 168

    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', scLogoX, HEADER_Y - 1, SC_LOGO_W, SC_LOGO_H);
        } catch { /* skip */ }
    }

    // Text right-bound is just left of the SC logo (or page right if no logo)
    const TEXT_RIGHT = logoDataUrl ? scLogoX - 3 : RIGHT_ZONE_END;  // 165 or 196

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('SHREEJI CERAMICA', TEXT_RIGHT, LOGO_CENTER_Y - 4, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text('Premium Tiles & Bathware Showroom', TEXT_RIGHT, LOGO_CENTER_Y + 1, { align: 'right' });
    doc.text('123 Business Road | City, State - 123456', TEXT_RIGHT, LOGO_CENTER_Y + 6, { align: 'right' });
    doc.text('+91 9876543210 | info@shreejiceramica.com', TEXT_RIGHT, LOGO_CENTER_Y + 11, { align: 'right' });

    // ── GRAY DIVIDER LINE ────────────────────────────────────────────────
    const dividerY = HEADER_Y + LOGO_ROW_H + 4;
    doc.setDrawColor(170, 185, 200);
    doc.setLineWidth(0.5);
    doc.line(14, dividerY, 196, dividerY);

    // ── BELOW DIVIDER: Ref / Date / Prepared By (right) ─────────────────
    const titleY = dividerY + 7;
    const belowY = dividerY + 13;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text('BUSINESS QUOTATION', 14, titleY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text(`Ref: SC-${quoteNumber || 'NEW'}   |   Date: ${today}`, 14, belowY);

    if (preparedBy) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(`Prepared By: ${preparedBy}`, 196, belowY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
    }

    return belowY + 6;
};



const setupBillTo = (
    doc: jsPDF,
    customer: CustomerDetails,
    primaryColor: [number, number, number],
    textColor: [number, number, number],
    startY: number
): number => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, startY, 196, startY);

    const contentY = startY + 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text('BILL TO:', 14, contentY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    let yPos = contentY + 6;
    if (customer.customerName) { doc.text(customer.customerName, 14, yPos); yPos += 6; }
    if (customer.companyName) { doc.text(customer.companyName, 14, yPos); yPos += 6; }
    if (customer.address) { doc.text(customer.address, 14, yPos); yPos += 6; }
    if (customer.phone) { doc.text(`Phone: ${customer.phone}`, 14, yPos); yPos += 6; }
    if (customer.email) { doc.text(`Email: ${customer.email}`, 14, yPos); yPos += 6; }
    if (customer.gstNumber) {
        doc.setFont("helvetica", "bold");
        doc.text(`GST No: ${customer.gstNumber.toUpperCase()}`, 14, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 6;
    }

    return yPos;
};

const setupProductTable = async (
    doc: jsPDF,
    products: ProductDetails[],
    primaryColor: [number, number, number],
    textColor: [number, number, number],
    startY: number
): Promise<number> => {
    const tableData = products.map((p, index) => [
        (index + 1).toString(),
        '', // Image Placeholder
        p.color ? `${p.productName}\nColor: ${p.color}` : (p.productName || '-'),
        p.productCode || '-',
        p.size || '-',
        p.quantity.toString(),
        formatCurrencySimple(p.rate),
        `${p.discountPercentage}%`,
        formatCurrencySimple(p.finalAmount)
    ]);

    // Pre-load images
    const imagePromises = products.map(p => {
        const imgSrc = p.image || p.productImage;
        if (!imgSrc) return Promise.resolve(null);
        return new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = imgSrc;
        });
    });

    const loadedImages = await Promise.all(imagePromises);

    autoTable(doc, {
        startY: startY,
        head: [['#', 'IMG', 'Item Details', 'SKU', 'Size', 'Qty', 'Rate', 'Disc %', 'Amount ']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2,
            textColor: textColor,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 20, halign: 'center' }, // Image Column
            2: { cellWidth: 50, halign: 'left' },
            3: { halign: 'center', cellWidth: 15 }, // SKU
            4: { halign: 'center', cellWidth: 15 }, // Size
            5: { halign: 'center', cellWidth: 10 },
            6: { halign: 'right', cellWidth: 22 },
            7: { halign: 'center', cellWidth: 12 },
            8: { halign: 'right', fontStyle: 'bold', cellWidth: 22 }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const rowIndex = data.row.index;
                const img = loadedImages[rowIndex];
                if (img) {
                    const padding = 2;
                    const cellHeight = data.cell.height - padding * 2;
                    const cellWidth = data.cell.width - padding * 2;

                    // Maintain aspect ratio
                    const imgRatio = img.width / img.height;
                    const cellRatio = cellWidth / cellHeight;

                    let drawWidth = cellWidth;
                    let drawHeight = cellHeight;

                    if (imgRatio > cellRatio) {
                        drawHeight = cellWidth / imgRatio;
                    } else {
                        drawWidth = cellHeight * imgRatio;
                    }

                    const x = data.cell.x + (data.cell.width - drawWidth) / 2;
                    const y = data.cell.y + (data.cell.height - drawHeight) / 2;

                    doc.addImage(img, 'PNG', x, y, drawWidth, drawHeight);
                }
            }
        },
        rowPageBreak: 'avoid',
        bodyStyles: { minCellHeight: 20 } // Ensure enough height for image
    });

    return (doc as any).lastAutoTable.finalY;
};

/**
 * Renders a product table section prefixed with a bold room-name header row.
 */
const setupProductTableForRoom = async (
    doc: jsPDF,
    products: ProductDetails[],
    roomName: string,
    primaryColor: [number, number, number],
    accentColor: [number, number, number],
    textColor: [number, number, number],
    startY: number
): Promise<number> => {
    if (startY > 240) {
        doc.addPage();
        startY = 15;
    }

    const tableData = products.map((p, index) => [
        (index + 1).toString(),
        '', // Image placeholder
        p.color ? `${p.productName}\nColor: ${p.color}` : (p.productName || '-'),
        p.productCode || '-',
        p.size || '-',
        p.quantity.toString(),
        formatCurrencySimple(p.rate),
        `${p.discountPercentage}%`,
        formatCurrencySimple(p.rate * p.quantity - p.discountAmount)
    ]);

    const roomSubtotal = products.reduce((s, p) => s + (p.rate * p.quantity - p.discountAmount), 0);

    // Pre-load images
    const loadedImages = await Promise.all(
        products.map(p => {
            const imgSrc = p.image || p.productImage;
            if (!imgSrc) return Promise.resolve(null);
            return new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = imgSrc;
            });
        })
    );

    autoTable(doc, {
        startY,
        head: [
            [{ content: roomName.toUpperCase(), colSpan: 9, styles: { halign: 'center', fillColor: primaryColor, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', fontSize: 10 } }],
            ['#', 'IMG', 'Item Details', 'SKU', 'Size', 'Qty', 'Rate', 'Disc %', 'Amount']
        ],
        body: [
            ...tableData,
            [
                { content: 'TOTAL', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] as [number, number, number], textColor: primaryColor } },
                { content: formatCurrencySimple(roomSubtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] as [number, number, number], textColor: accentColor } }
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 250] as [number, number, number], textColor: primaryColor, fontStyle: 'bold', halign: 'center' },
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, textColor, lineColor: [226, 232, 240], lineWidth: 0.1, valign: 'middle' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 50, halign: 'left' },
            3: { halign: 'center', cellWidth: 15 }, // SKU
            4: { halign: 'center', cellWidth: 15 }, // Size
            5: { halign: 'center', cellWidth: 10 },
            6: { halign: 'right', cellWidth: 22 },
            7: { halign: 'center', cellWidth: 12 },
            8: { halign: 'right', fontStyle: 'bold', cellWidth: 22 }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const rowIndex = data.row.index;
                if (rowIndex >= loadedImages.length) return;
                const img = loadedImages[rowIndex];
                if (img) {
                    const padding = 2;
                    const cellH = data.cell.height - padding * 2;
                    const cellW = data.cell.width - padding * 2;
                    const ratio = img.width / img.height;
                    const cellRatio = cellW / cellH;
                    let dW = cellW;
                    let dH = cellH;
                    if (ratio > cellRatio) dH = cellW / ratio;
                    else dW = cellH * ratio;
                    const x = data.cell.x + (data.cell.width - dW) / 2;
                    const y = data.cell.y + (data.cell.height - dH) / 2;
                    doc.addImage(img, 'PNG', x, y, dW, dH);
                }
            }
        },
        rowPageBreak: 'avoid',
        bodyStyles: { minCellHeight: 20 }
    });

    return (doc as any).lastAutoTable.finalY;
};

/**
 * Renders a full-width "Summary of All Rooms" table.
 */
const setupRoomSummaryTable = (
    doc: jsPDF,
    roomSubtotals: { room: string; subtotal: number }[],
    totals: QuoteCalculations,
    includeGST: boolean,
    gstPercentage: number,
    primaryColor: [number, number, number],
    accentColor: [number, number, number],
    textColor: [number, number, number],
    startY: number
): number => {
    if (startY > 230) {
        doc.addPage();
        startY = 15;
    }

    const rows: any[][] = roomSubtotals.map(({ room, subtotal }) => [
        room.toUpperCase(),
        formatCurrencySimple(subtotal)
    ]);

    if (includeGST) {
        rows.push([`GST (${gstPercentage}%)`, formatCurrencySimple(totals.totalGstAmount)]);
    }

    rows.push([
        { content: 'FINAL AMOUNT', styles: { fontStyle: 'bold', textColor: primaryColor } },
        { content: formatCurrencySimple(totals.grandTotal), styles: { fontStyle: 'bold', textColor: accentColor } }
    ]);

    autoTable(doc, {
        startY,
        head: [[{ content: 'SUMMARY OF ALL BATH ROOM', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: primaryColor, textColor: [255, 255, 255] as [number, number, number], fontSize: 11 } }]],
        body: rows,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, textColor, lineColor: [226, 232, 240], lineWidth: 0.1 },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 }
        },
    });

    return (doc as any).lastAutoTable.finalY;
};

const setupTotalsTable = (
    doc: jsPDF,
    totals: QuoteCalculations,
    includeGST: boolean,
    primaryColor: [number, number, number],
    accentColor: [number, number, number],
    textColor: [number, number, number],
    startY: number
): number => {
    const summaryTableData = [
        ['Gross Subtotal', formatCurrencySimple(totals.grossSubtotal)],
        [`Discount (${totals.effectiveDiscountPercentage.toFixed(1)}%)`, `-${formatCurrencySimple(totals.totalItemDiscountAmount + totals.globalDiscountAmount)}`],
        ['Net Taxable Amount', formatCurrencySimple(totals.taxableAmount)],
        ['CGST (9%)', includeGST ? formatCurrencySimple(totals.cgstAmount) : '-'],
        ['SGST (9%)', includeGST ? formatCurrencySimple(totals.sgstAmount) : '-'],
        ['GRAND TOTAL', formatCurrencySimple(totals.grandTotal)]
    ];

    autoTable(doc, {
        startY: startY,
        body: summaryTableData,
        theme: 'grid',
        margin: { left: 120 },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 3,
            textColor: textColor,
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { halign: 'right', fontStyle: 'normal' },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
        },
        didParseCell: (data) => {
            if (data.row.index === summaryTableData.length - 1) {
                data.cell.styles.textColor = primaryColor;
                data.cell.styles.fontSize = 12;
                if (data.column.index === 1) data.cell.styles.textColor = accentColor;
            }
        }
    });

    return (doc as any).lastAutoTable.finalY;
};

const setupTerms = (
    doc: jsPDF,
    startY: number,
    primaryColor: [number, number, number],
    textColor: [number, number, number]
) => {
    if (startY > 230) {
        doc.addPage();
        startY = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text('Terms & Conditions:', 14, startY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    const terms = [
        '1. Quotation is valid for 15 days from the issued date.',
        '2. 100% advance payment required along with the purchase order.',
        '3. Goods once sold will not be taken back or exchanged.',
        '4. Subject to local jurisdiction only.'
    ];

    terms.forEach((term, idx) => {
        doc.text(term, 14, startY + 8 + (idx * 5));
    });

    const signatureY = startY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text('For Shreeji Ceramica', 196, signatureY, { align: 'right' });
    doc.text('Authorized Signatory', 196, signatureY + 25, { align: 'right' });
};
