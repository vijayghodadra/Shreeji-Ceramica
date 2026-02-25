import { Send, MessageCircle, Download, Eye, Save } from 'lucide-react';
import type { CustomerDetails, ProductDetails } from '../types';
import { generatePDF, getPDFFile } from '../utils/pdfGenerator';
import { formatCurrency, calculateQuoteTotals } from '../utils/calculations';
import { uploadPDF } from '../utils/supabase';
import { useState } from 'react';

interface ActionPanelProps {
    customer: CustomerDetails;
    products: ProductDetails[];
    includeGST: boolean;
    gstPercentage?: number;
    discountMode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL';
    onDiscountModeChange: (mode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL') => void;
    commonDiscountPercentage: number;
    onCommonDiscountChange: (val: number) => void;
    globalDiscountAmount: number;
    onGlobalDiscountChange: (val: number) => void;
    onViewPDF: () => void;
    onSaveQuote: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
    customer,
    products,
    includeGST,
    gstPercentage = 18,
    discountMode,
    onDiscountModeChange,
    commonDiscountPercentage,
    onCommonDiscountChange,
    globalDiscountAmount,
    onGlobalDiscountChange,
    onViewPDF,
    onSaveQuote
}) => {
    const [isSharing, setIsSharing] = useState(false);

    const handleGeneratePDF = async () => {
        const discValue = discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount;
        await generatePDF(customer, products, discountMode, discValue, includeGST, gstPercentage);
    };

    const generateMessageText = (includePdfLink: string | null = null) => {
        if (!customer.customerName) return '';
        const discValue = discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount;
        const totals = calculateQuoteTotals(products, discountMode, discValue, includeGST, gstPercentage);
        let message = `*Quotation from Shreeji Ceramica*\n\nHello ${customer.customerName},\n\nPlease find the quotation for your recent inquiry.\n\n*Total Amount: ${formatCurrency(totals.grandTotal)}*\n\nThank you for choosing Shreeji Ceramica!`;
        if (includePdfLink) {
            // Using String.fromCodePoint for the Document emoji to avoid file encoding corruption
            const pdfEmoji = String.fromCodePoint(0x1F4C4);
            message += `\n\n${pdfEmoji} *View PDF Quotation:* \n${includePdfLink}`;
        }
        return message;
    };

    const handleWhatsApp = async () => {
        setIsSharing(true);
        try {
            const discValue = discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount;

            // 1. Prepare PDF
            const cleanName = customer.customerName?.replace(/\s+/g, '_') || 'Draft';
            const fileName = `${cleanName}_Quotation.pdf`;
            const pdfFile = await getPDFFile(customer, products, discountMode, discValue, includeGST, gstPercentage);

            // 2. Upload to Supabase for the PDF hosting
            const publicUrl = await uploadPDF(pdfFile, fileName);

            // 3. Construct the Production Vanity URL
            // This will look like https://shreejiceramica.com/quotations/ClientName.pdf when deployed
            // For now on your local computer, it will look like http://localhost:5173/quotations/ClientName.pdf
            const vanityUrl = window.location.origin + "/quotations/" + fileName;

            // 4. Construct Message using the Vanity URL
            // We use the clean Vanity URL as requested. Note: WhatsApp preview cards require the domain to be publicly accessible.
            const messageText = generateMessageText(publicUrl ? vanityUrl : null);

            // 4. Construct WhatsApp Redirection
            const rawPhone = customer.phone.replace(/\D/g, '');
            const phoneNum = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
            const encodedText = encodeURIComponent(messageText);

            // Use wa.me for the most reliable direct opening + text pre-fill
            const url = `https://wa.me/${phoneNum}?text=${encodedText}`;

            // 6. Direct One-Click Redirect
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error sharing to WhatsApp:', error);
            const text = generateMessageText();
            let rawPhone = customer.phone.replace(/\D/g, '');
            if (rawPhone.length === 10) rawPhone = '91' + rawPhone;
            window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`, '_blank');
        } finally {
            setIsSharing(false);
        }
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(`Quotation from Shreeji Ceramica`);
        const body = encodeURIComponent(generateMessageText().replace(/\*/g, '')); // Plain text for email
        window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="space-y-4">
            {/* Discount Control Section */}
            <div className="panel glass-panel mt-4 p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                    <Save size={16} className="text-secondary" /> Discount Configuration
                </h3>

                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted uppercase">Discount Method</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                            {(['INDIVIDUAL', 'COMMON', 'GLOBAL'] as const).map(mode => (
                                <button
                                    key={mode}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${discountMode === mode
                                        ? 'bg-white shadow-sm text-primary font-bold'
                                        : 'text-muted hover:text-primary'
                                        }`}
                                    onClick={() => onDiscountModeChange(mode)}
                                >
                                    {mode === 'INDIVIDUAL' ? 'Item Wise' : mode === 'COMMON' ? 'Common %' : 'On Total'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {discountMode === 'COMMON' && (
                        <div className="flex flex-col gap-1 animate-fade-in">
                            <label className="text-[10px] font-bold text-muted uppercase">Bulk Discount %</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="input-field w-24 pr-6"
                                    value={commonDiscountPercentage}
                                    onChange={(e) => onCommonDiscountChange(Number(e.target.value))}
                                    placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                            </div>
                        </div>
                    )}

                    {discountMode === 'GLOBAL' && (
                        <div className="flex flex-col gap-1 animate-fade-in">
                            <label className="text-[10px] font-bold text-muted uppercase">Flat Discount Amount</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
                                <input
                                    type="number"
                                    className="input-field w-32 pl-5"
                                    value={globalDiscountAmount}
                                    onChange={(e) => onGlobalDiscountChange(Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-2 text-[10px] text-muted italic">
                    {discountMode === 'INDIVIDUAL' && 'Apply different discount percentages to each product in the table.'}
                    {discountMode === 'COMMON' && 'Applies the same discount percentage to every product in the list.'}
                    {discountMode === 'GLOBAL' && 'Deducts a single flat amount from the final quotation subtotal.'}
                </p>
            </div>

            {/* Desktop View */}
            <div className="action-panel desktop-action-panel flex gap-2 items-center flex-wrap">
                <button className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }} onClick={onSaveQuote}>
                    <Save size={16} /> Save Quote
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', backgroundColor: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0' }} onClick={onViewPDF}>
                    <Eye size={16} /> View PDF
                </button>
                <button className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }} onClick={handleGeneratePDF}>
                    <Download size={16} /> Generate PDF
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem' }} onClick={handleEmail}>
                    <Send size={16} /> Email
                </button>
                <button
                    onClick={handleWhatsApp}
                    disabled={isSharing}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 ${isSharing ? 'bg-gray-400 cursor-wait' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                    <MessageCircle size={18} className={isSharing ? 'animate-spin' : ''} />
                    {isSharing ? 'Preparing PDF...' : 'WhatsApp'}
                </button>
            </div>

            {/* Mobile Sticky Bar */}
            <div className="mobile-action-bar">
                <button className="btn btn-secondary flex-grow" onClick={onSaveQuote}>
                    <Save size={18} /> <span className="text-xs">Save</span>
                </button>
                <button className="btn btn-secondary flex-grow" onClick={onViewPDF}>
                    <Eye size={18} /> <span className="text-xs">Preview</span>
                </button>
                <button className="btn btn-primary flex-grow" onClick={handleGeneratePDF}>
                    <Download size={18} /> <span className="text-xs">PDF</span>
                </button>
                <button className="btn btn-accent p-3" onClick={handleWhatsApp}>
                    <MessageCircle size={20} />
                </button>
            </div>
        </div>
    );
};
