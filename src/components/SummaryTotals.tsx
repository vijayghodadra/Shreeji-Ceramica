import React from 'react';
import type { QuoteCalculations } from '../types';
import { formatCurrency } from '../utils/calculations';
import { Calculator } from 'lucide-react';

interface SummaryTotalsProps {
    totals: QuoteCalculations;
    includeGST: boolean;
    gstPercentage: number;
}

export const SummaryTotals: React.FC<SummaryTotalsProps> = ({
    totals,
    includeGST,
    gstPercentage
}) => {
    return (
        <div className="liquid-glass-warm p-8 animate-reveal-up" style={{
            animationDelay: '0.3s'
        }}>
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 border-b border-black/10 pb-4 uppercase tracking-tighter">
                <Calculator size={20} className="animate-pulse text-secondary" /> Quotation Summary
            </h2>

            <div className="space-y-3">
                <div className="flex justify-between items-center opacity-90">
                    <span className="text-sm font-medium">Gross Subtotal</span>
                    <span className="text-lg font-bold">{formatCurrency(totals.grossSubtotal)}</span>
                </div>

                <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Total Savings</span>
                        <span className="text-xs bg-white text-primary px-2 py-0.5 rounded-full font-bold mt-1 self-start">
                            {totals.effectiveDiscountPercentage.toFixed(1)}% OFF
                        </span>
                    </div>
                    <span className="text-lg font-bold text-white">
                        -{formatCurrency(totals.totalItemDiscountAmount + totals.globalDiscountAmount)}
                    </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-sm">Net Taxable Amount</span>
                    <span className="font-bold">{formatCurrency(totals.taxableAmount)}</span>
                </div>

                <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl">
                    <span className="text-xs font-semibold">Include GST ({gstPercentage}%)</span>
                    <span className="text-xs font-bold">{includeGST ? 'Enabled' : 'Disabled'}</span>
                </div>

                {includeGST && (
                    <div className="grid grid-cols-2 gap-2 mt-2 bg-black/10 p-3 rounded-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold opacity-60">CGST ({gstPercentage / 2}%)</span>
                            <span className="text-sm font-bold">{formatCurrency(totals.cgstAmount)}</span>
                        </div>
                        <div className="flex flex-col border-l border-white/10 pl-3">
                            <span className="text-[10px] uppercase font-bold opacity-60">SGST ({gstPercentage / 2}%)</span>
                            <span className="text-sm font-bold">{formatCurrency(totals.sgstAmount)}</span>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t-2 border-white/20">
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Final Total</span>
                        <span className="text-3xl font-black">{formatCurrency(totals.grandTotal)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
