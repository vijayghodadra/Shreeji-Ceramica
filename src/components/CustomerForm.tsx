import React, { useState, useEffect } from 'react';
import type { CustomerDetails } from '../types';
import { getCustomerHistory, saveCustomerToHistory } from '../utils/storage';
import { User, Building2, Mail, Phone, MapPin, Calculator, Percent, FileText } from 'lucide-react';

interface CustomerFormProps {
    customer: CustomerDetails;
    onChange: (field: keyof CustomerDetails, value: string) => void;
    includeGST: boolean;
    onIncludeGSTChange: (include: boolean) => void;
    gstPercentage: number;
    onGstPercentageChange: (percentage: number) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
    customer, onChange, includeGST, onIncludeGSTChange, gstPercentage, onGstPercentageChange
}) => {
    const [history, setHistory] = useState<CustomerDetails[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        setHistory(getCustomerHistory());
    }, []);

    const handleSelectSuggestion = (suggestion: CustomerDetails) => {
        onChange('customerName', suggestion.customerName);
        onChange('companyName', suggestion.companyName);
        onChange('email', suggestion.email);
        onChange('phone', suggestion.phone);
        onChange('address', suggestion.address);
        setShowSuggestions(false);
    };

    const handleBlur = () => {
        // Delay hiding to allow click on suggestion
        setTimeout(() => {
            setShowSuggestions(false);
            // Save valid customers to history on blur
            if (customer.customerName || customer.companyName) {
                saveCustomerToHistory(customer);
                setHistory(getCustomerHistory());
            }
        }, 200);
    };

    return (
        <div className="panel glass-panel animate-fade-in relative">
            <h2 className="panel-title">Client Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="input-group relative z-20">
                    <label className="input-label flex items-center gap-2"><User size={12} /> Client Name *</label>
                    <input
                        type="text"
                        className="input-field"
                        value={customer.customerName}
                        onChange={(e) => {
                            onChange('customerName', e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={handleBlur}
                        placeholder="Search/Enter name"
                    />
                    {showSuggestions && history.length > 0 && (
                        <div className="suggestions-dropdown">
                            {history.filter(h => h.customerName.toLowerCase().includes(customer.customerName.toLowerCase())).map((h, i) => (
                                <div
                                    key={i}
                                    className="suggestion-item"
                                    onClick={() => handleSelectSuggestion(h)}
                                >
                                    <div className="suggestion-name">{h.customerName}</div>
                                    <div className="suggestion-meta">{h.phone} - {h.companyName}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="input-group relative z-10">
                    <label className="input-label flex items-center gap-2"><Building2 size={12} /> Company</label>
                    <input
                        type="text"
                        className="input-field"
                        value={customer.companyName}
                        onChange={(e) => onChange('companyName', e.target.value)}
                        onBlur={handleBlur}
                        placeholder="Company Name"
                    />
                </div>

                <div className="input-group relative z-10">
                    <label className="input-label flex items-center gap-2"><Phone size={12} /> Phone *</label>
                    <input
                        type="tel"
                        className="input-field"
                        value={customer.phone}
                        onChange={(e) => onChange('phone', e.target.value)}
                        onBlur={handleBlur}
                        placeholder="+91"
                    />
                </div>

                <div className="input-group relative z-10">
                    <label className="input-label flex items-center gap-2"><Mail size={12} /> Email Address</label>
                    <input
                        type="email"
                        className="input-field"
                        value={customer.email}
                        onChange={(e) => onChange('email', e.target.value)}
                        onBlur={handleBlur}
                        placeholder="client@mail.com"
                    />
                </div>

                <div className="input-group relative z-10 md:col-span-2">
                    <label className="input-label flex items-center gap-2"><MapPin size={12} /> Billing Address</label>
                    <input
                        type="text"
                        className="input-field"
                        value={customer.address}
                        onChange={(e) => onChange('address', e.target.value)}
                        onBlur={handleBlur}
                        placeholder="Enter full address"
                    />
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={includeGST}
                        onChange={(e) => onIncludeGSTChange(e.target.checked)}
                        className="w-4 h-4 text-primary rounded focus:ring-primary border-gray-300 pointer-events-auto"
                    />
                    <span className="text-sm font-medium text-primary flex items-center gap-1">
                        <Calculator size={14} className="text-muted" /> Apply GST to Quotation
                    </span>
                </label>

                {includeGST && (
                    <>
                        <div className="flex items-center gap-2 animate-fade-in relative z-10">
                            <label className="text-sm text-muted">GST Percentage:</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="input-field py-1 px-2 w-20 text-right pr-6"
                                    value={gstPercentage}
                                    onChange={(e) => onGstPercentageChange(Number(e.target.value) || 0)}
                                    min="0"
                                    max="100"
                                />
                                <Percent size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 animate-fade-in relative z-10 ml-auto">
                            <label className="text-sm text-muted flex items-center gap-1">
                                <FileText size={12} /> GSTIN Number:
                            </label>
                            <input
                                type="text"
                                className="input-field py-1 px-3 w-48 uppercase"
                                value={customer.gstNumber || ''}
                                onChange={(e) => onChange('gstNumber', e.target.value.toUpperCase())}
                                placeholder="Enter 15-digit GSTIN"
                                maxLength={15}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
