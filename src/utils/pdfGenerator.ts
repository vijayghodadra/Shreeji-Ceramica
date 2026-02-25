import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CustomerDetails, ProductDetails, QuoteCalculations } from '../types';
import { calculateQuoteTotals, formatCurrencySimple } from './calculations';

const fetchLogoAsBase64 = async (): Promise<string | null> => {
    try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.error("Failed to load logo for PDF", err);
        return null;
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
    quoteNumber?: number
): Promise<jsPDF> => {
    const doc = new jsPDF();
    const totals = calculateQuoteTotals(products, discountMode, discountValue, includeGST, gstPercentage);

    // High-End Theme Colors
    const primaryColor: [number, number, number] = [26, 54, 93]; // Deep Blue
    const accentColor: [number, number, number] = [203, 162, 88]; // Gold
    const textColor: [number, number, number] = [45, 55, 72]; // Dark Gray

    const logoDataUrl = await fetchLogoAsBase64();

    // Setup Sections
    const headerBottom = setupHeader(doc, primaryColor, accentColor, textColor, logoDataUrl, quoteNumber);
    const billingBottom = setupBillTo(doc, customer, primaryColor, textColor, headerBottom + 10);
    const tableBottom = await setupProductTable(doc, products, primaryColor, textColor, billingBottom + 10);
    const totalsBottom = setupTotalsTable(doc, totals, includeGST, primaryColor, accentColor, textColor, tableBottom + 5);
    setupTerms(doc, totalsBottom + 15, primaryColor, textColor);

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
    quoteNumber?: number
) => {
    const doc = await preparePDFDoc(customer, products, discountMode, discountValue, includeGST, gstPercentage, quoteNumber);
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
    quoteNumber?: number
): Promise<string> => {
    const doc = await preparePDFDoc(customer, products, discountMode, discountValue, includeGST, gstPercentage, quoteNumber);
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
    quoteNumber?: number
): Promise<File> => {
    const doc = await preparePDFDoc(customer, products, discountMode, discountValue, includeGST, gstPercentage, quoteNumber);
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
    quoteNumber?: number
): number => {
    let startX = 14;

    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', 14, 14, 45, 25);
            startX = 64;
        } catch (e) {
            console.error("Failed to add image", e);
        }
    }

    doc.setFontSize(logoDataUrl ? 22 : 24);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text('SHREEJI CERAMICA', startX, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.text('Premium Tiles & Bathware Showroom', startX, 28);
    doc.text('123 Business Road, Corporate Hub', startX, 34);
    doc.text('City, State - 123456', startX, 40);
    doc.text('Phone: +91 9876543210 | Email: info@shreejiceramica.com', startX, 46);

    doc.setFontSize(16);
    doc.setTextColor(...accentColor);
    doc.text('QUOTATION', 196, 22, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Date: ${today}`, 196, 30, { align: 'right' });
    doc.text(`Ref: SC-${quoteNumber || 'NEW'}`, 196, 36, { align: 'right' });

    return 46;
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
        `${p.productName} \n(Code: ${p.productCode})`,
        p.size || '-',
        p.color || '-',
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
        head: [['#', 'IMG', 'Item Details', 'Size', 'Color', 'Qty', 'Rate', 'Disc %', 'Amount ']],
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
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'center', cellWidth: 15 },
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
