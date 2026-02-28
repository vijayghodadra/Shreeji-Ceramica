import React, { useState } from 'react';
import { Send, MessageCircle, Download, Eye, Save, Percent } from 'lucide-react';
import type { CustomerDetails, ProductDetails } from '../types';
import { generatePDF, getPDFFile } from '../utils/pdfGenerator';
import { formatCurrency, calculateQuoteTotals } from '../utils/calculations';
import { uploadPDF } from '../utils/supabase';

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
            const pdfEmoji = String.fromCodePoint(0x1F4C4);
            message += `\n\n${pdfEmoji} *View PDF Quotation:* \n${includePdfLink}`;
        }
        return message;
    };

    const handleWhatsApp = async () => {
        setIsSharing(true);
        try {
            const discValue = discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount;
            const cleanName = customer.customerName?.replace(/\s+/g, '_') || 'Draft';
            const fileName = `${cleanName}_Quotation.pdf`;
            const pdfFile = await getPDFFile(customer, products, discountMode, discValue, includeGST, gstPercentage);
            const publicUrl = await uploadPDF(pdfFile, fileName);
            const vanityUrl = window.location.origin + "/quotations/" + fileName;
            const messageText = generateMessageText(publicUrl ? vanityUrl : null);
            const rawPhone = customer.phone.replace(/\D/g, '');
            const phoneNum = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
            const encodedText = encodeURIComponent(messageText);
            const url = `https://wa.me/${phoneNum}?text=${encodedText}`;
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
        const body = encodeURIComponent(generateMessageText().replace(/\*/g, ''));
        window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
    };

    return (
        <div className="space-y-6">
            <div className="liquid-glass-warm p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2 uppercase tracking-tight">
                    <Percent size={16} className="text-secondary" /> Discount Configuration
                </h3>
                <div className="flex flex-wrap gap-6 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Discount Method</label>
                        <div className="liquid-pill-group">
                            {(['INDIVIDUAL', 'COMMON', 'GLOBAL'] as const).map(mode => (
                                <button
                                    key={mode}
                                    className={`liquid-pill-item ${discountMode === mode ? 'active' : ''}`}
                                    onClick={() => onDiscountModeChange(mode)}
                                >
                                    {mode === 'INDIVIDUAL' ? 'Item Wise' : mode === 'COMMON' ? 'Common %' : 'On Total'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {discountMode === 'COMMON' && (
                        <div className="flex flex-col gap-1 animate-reveal-up">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Bulk Discount %</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="input-field-warm w-full pr-12 text-center"
                                    value={commonDiscountPercentage}
                                    onChange={(e) => onCommonDiscountChange(Number(e.target.value))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/30 font-bold">%</span>
                            </div>
                        </div>
                    )}

                    {discountMode === 'GLOBAL' && (
                        <div className="flex flex-col gap-1 animate-reveal-up">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Flat Discount Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary">₹</span>
                                <input
                                    type="number"
                                    className="input-field-warm w-36 pl-8"
                                    value={globalDiscountAmount}
                                    onChange={(e) => onGlobalDiscountChange(Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-3 text-[10px] text-muted-foreground opacity-70 italic font-medium">
                    {discountMode === 'INDIVIDUAL' && 'Apply liquid-smooth discount percentages to each product independently.'}
                    {discountMode === 'COMMON' && 'Flow the same discount percentage across every single product.'}
                    {discountMode === 'GLOBAL' && 'Subtract a single flat amount from the entire quotation stream.'}
                </p>
            </div>

            <div className="action-panel desktop-action-panel flex gap-4 items-center flex-wrap">
                <button className="liquid-button liquid-secondary" onClick={onSaveQuote}>
                    <Save size={16} /> Save Quote
                </button>
                <button className="liquid-button liquid-secondary" onClick={onViewPDF}>
                    <Eye size={16} /> View PDF
                </button>
                <button className="liquid-button" onClick={handleGeneratePDF}>
                    <Download size={18} className="animate-bounce" /> Generate PDF
                </button>
                <button className="liquid-button liquid-secondary" onClick={handleEmail}>
                    <Send size={16} /> Email
                </button>
                <button
                    onClick={handleWhatsApp}
                    disabled={isSharing}
                    className={`liquid-button ${isSharing ? 'opacity-50 cursor-wait' : 'bg-green-500 shadow-green-200'}`}
                    style={!isSharing ? { background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow: '0 10px 20px rgba(37, 211, 102, 0.3)' } : {}}
                >
                    <MessageCircle size={18} className={isSharing ? 'animate-spin' : ''} />
                    {isSharing ? 'Liquidizing...' : 'WhatsApp'}
                </button>
            </div>

            <div className="mobile-action-bar liquid-glass !border-none !rounded-t-3xl shadow-2xl p-4">
                <button className="liquid-button liquid-secondary flex-grow p-2" onClick={onSaveQuote}>
                    <Save size={18} />
                </button>
                <button className="liquid-button liquid-secondary flex-grow p-2" onClick={onViewPDF}>
                    <Eye size={18} />
                </button>
                <button className="liquid-button flex-grow p-2" onClick={handleGeneratePDF}>
                    <Download size={18} />
                </button>
                <button className="liquid-button p-2" onClick={handleWhatsApp} style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
                    <MessageCircle size={20} />
                </button>
            </div>
        </div>
    );
};
