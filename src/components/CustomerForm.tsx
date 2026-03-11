import React, { useState, useEffect } from 'react';
import { User, Percent, UserCheck, Sparkles, Database } from 'lucide-react';
import type { CustomerDetails } from '../types';
import { getCustomerHistory } from '../utils/storage';

const PREPARED_BY_OPTIONS = [
    { label: '— Select —', value: '' },
    { label: 'Harsh Bhai — +91 82385 21277', value: 'Harsh Bhai — +91 82385 21277' },
    { label: 'Karan Bhai — +91 82009 17069', value: 'Karan Bhai — +91 82009 17069' },
    { label: 'Kunal Bhai — +91 98987 13167', value: 'Kunal Bhai — +91 98987 13167' },
];

interface CustomerFormProps {
    customer: CustomerDetails;
    onChange: (field: keyof CustomerDetails, value: string) => void;
    includeGST: boolean;
    onIncludeGSTChange: (value: boolean) => void;
    gstPercentage: number;
    onGstPercentageChange: (value: number) => void;
    preparedBy: string;
    onPreparedByChange: (val: string) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
    customer,
    onChange,
    includeGST,
    onIncludeGSTChange,
    gstPercentage,
    onGstPercentageChange,
    preparedBy,
    onPreparedByChange,
}) => {
    const [history, setHistory] = useState<CustomerDetails[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [aiAutofilled, setAiAutofilled] = useState(false);

    useEffect(() => {
        setHistory(getCustomerHistory());
    }, []);

    const handlePhoneChange = (val: string) => {
        onChange('phone', val);
        setShowSuggestions(true);

        // Check for exact match to auto-fill (AI Feature)
        const exactMatch = history.find(h => h.phone === val);
        if (exactMatch) {
            handleSelectCustomer(exactMatch);
        }
    };

    const handleSelectCustomer = (selected: CustomerDetails) => {
        if (selected.customerName && selected.customerName !== customer.customerName) onChange('customerName', selected.customerName);
        if (selected.email && selected.email !== customer.email) onChange('email', selected.email);
        if (selected.address && selected.address !== customer.address) onChange('address', selected.address);
        // We use customerName for Company / Name, but if there's a company name field, update it too
        if ((selected as any).companyName && (selected as any).companyName !== (customer as any).companyName) onChange('companyName' as keyof CustomerDetails, (selected as any).companyName);
        if ((selected as any).gstNumber && (selected as any).gstNumber !== (customer as any).gstNumber) onChange('gstNumber' as keyof CustomerDetails, (selected as any).gstNumber);

        onChange('phone', selected.phone);
        setShowSuggestions(false);
        setAiAutofilled(true);
        setTimeout(() => setAiAutofilled(false), 3000);
    };

    const filteredHistory = history.filter(h => h.phone.includes(customer.phone) && h.phone !== customer.phone).slice(0, 5);

    return (
        <div className="liquid-glass-warm p-8 animate-reveal-up relative overflow-visible">
            {aiAutofilled && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 animate-fade-in shadow-lg z-50">
                    <Sparkles size={14} className="animate-pulse" />
                    AI Auto-filled from History
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 className="panel-title flex-shrink-0" style={{ margin: 0 }}><User size={20} className="text-secondary" /> Client Information</h2>
                {/* Prepared By Dropdown */}
                <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                    <UserCheck size={16} className="text-secondary flex-shrink-0" />
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider flex-shrink-0" style={{ whiteSpace: 'nowrap' }}>Prepared By</label>
                    <select
                        className="input-field-warm flex-grow sm:flex-grow-0"
                        style={{ padding: '4px 12px', fontSize: '13px', fontWeight: 600, minWidth: '150px' }}
                        value={preparedBy}
                        onChange={(e) => onPreparedByChange(e.target.value)}
                    >
                        {PREPARED_BY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative" style={{ zIndex: 20 }}>
                <div className="flex flex-col gap-1 relative" style={{ zIndex: 10 }}>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Client Name / Business</label>
                    <input
                        type="text"
                        className={`input-field-warm w-full transition-all duration-300 ${aiAutofilled ? 'ring-2 ring-purple-300 bg-purple-50' : ''}`}
                        placeholder="e.g. John Doe / Skyline Architects"
                        value={customer.customerName}
                        onChange={(e) => onChange('customerName', e.target.value)}
                    />
                </div>


                <div className="flex flex-col gap-1 relative" style={{ zIndex: 50 }}>
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Phone Number</label>
                        {customer.phone && history.some(h => h.phone === customer.phone) && !aiAutofilled && (
                            <span className="text-[9px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <Database size={10} /> Saved Client
                            </span>
                        )}
                    </div>
                    <input
                        type="text"
                        className={`input-field-warm w-full pl-3 ${showSuggestions ? 'ring-2 ring-purple-300' : ''}`}
                        placeholder="+91 XXXXX XXXXX"
                        value={customer.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    />

                    {showSuggestions && customer.phone.length > 2 && filteredHistory.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-y-auto w-full" style={{ minWidth: '100%', maxHeight: '12rem', zIndex: 9999, backgroundColor: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(16px)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)', border: '1px solid #e9d5ff' }}>
                            <div className="p-2 text-[10px] font-bold uppercase flex items-center gap-1" style={{ backgroundColor: 'rgba(250, 245, 255, 0.95)', color: '#7e22ce', borderBottom: '1px solid #e9d5ff' }}>
                                <Sparkles size={10} /> TEJASKP AI Client Suggestions
                            </div>
                            {filteredHistory.map((h, i) => (
                                <div
                                    key={i}
                                    className="p-3 cursor-pointer flex flex-col transition-colors duration-200"
                                    style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectCustomer(h);
                                    }}
                                >
                                    <div className="font-bold text-sm" style={{ color: '#0071e3' }}>{h.phone}</div>
                                    <div className="text-xs truncate flex items-center justify-between mt-1">
                                        <span className="font-medium" style={{ color: '#374151' }}>{h.customerName}</span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>Auto-fill</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 relative" style={{ zIndex: 10 }}>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Email Address</label>
                    <input
                        type="email"
                        className={`input-field-warm w-full transition-all duration-300 ${aiAutofilled ? 'ring-2 ring-purple-300 bg-purple-50' : ''}`}
                        placeholder="client@example.com"
                        value={customer.email}
                        onChange={(e) => onChange('email', e.target.value)}
                    />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1 relative" style={{ zIndex: 5 }}>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">Project Site / Address</label>
                    <textarea
                        className={`input-field-warm w-full resize-y transition-all duration-300 ${aiAutofilled ? 'ring-2 ring-purple-300 bg-purple-50' : ''}`}
                        rows={1}
                        placeholder="Enter full site address..."
                        value={customer.address}
                        onChange={(e) => onChange('address', e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-black/5 flex flex-wrap items-center justify-between gap-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={includeGST}
                            onChange={(e) => onIncludeGSTChange(e.target.checked)}
                        />
                        <div className={`w-12 h-6 rounded-full transition-all duration-300 ${includeGST ? 'bg-secondary' : 'bg-gray-200'}`}>
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${includeGST ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                    <span className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">Apply GST Compliance</span>
                </label>

                {includeGST && (
                    <div className="flex items-center gap-6 animate-reveal-up ml-auto">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-muted uppercase">GST %</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="input-field-warm py-1 px-3 w-24 pr-8 text-center font-bold text-primary"
                                    value={gstPercentage}
                                    onChange={(e) => onGstPercentageChange(Number(e.target.value) || 0)}
                                    min="0"
                                    max="100"
                                />
                                <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
