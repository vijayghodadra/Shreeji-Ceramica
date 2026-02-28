import React, { useState, useEffect, useMemo } from 'react';
import type { SavedQuotation } from '../types';
import { getSavedQuotations, deleteQuotation, deleteHistoricalQuotations, syncQuotationsFromCloud } from '../utils/storage';
import { Search, User, FileText, Calendar, Trash2, ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface SavedQuotationsListProps {
    onOpenQuotation?: (quote: SavedQuotation) => void;
}

export const SavedQuotationsList: React.FC<SavedQuotationsListProps> = ({ onOpenQuotation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [quotations, setQuotations] = useState<SavedQuotation[]>(() => getSavedQuotations());
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        handleSync();
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const data = await syncQuotationsFromCloud();
            setQuotations(data);
        } catch (error) {
            console.error("Failed to sync quotations from cloud:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this quotation?')) {
            await deleteQuotation(id);
            const updated = getSavedQuotations();
            setQuotations(updated);
            if (selectedPhone) {
                const remainingQuotes = updated.filter(q => q.customer.phone === selectedPhone);
                if (remainingQuotes.length === 0) {
                    setSelectedPhone(null);
                }
            }
        }
    };

    const handleDeleteProfile = async (e: React.MouseEvent, phone: string) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this profile and all its quotations?")) {
            await deleteHistoricalQuotations(phone);
            const updated = getSavedQuotations();
            setQuotations(updated);
            if (selectedPhone === phone) {
                setSelectedPhone(null);
            }
        }
    };

    // Group quotations by customer phone number
    const groupedByCustomer = useMemo(() => {
        const groups: Record<string, SavedQuotation[]> = {};
        quotations.forEach(q => {
            const phone = q.customer.phone || 'Unknown';
            if (!groups[phone]) {
                groups[phone] = [];
            }
            groups[phone].push(q);
        });

        // Sort groups by most recent quotation
        for (const phone in groups) {
            groups[phone].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return groups;
    }, [quotations]);

    const filteredPhones = useMemo(() => {
        if (!searchTerm) return Object.keys(groupedByCustomer);
        const lowerQuery = searchTerm.toLowerCase();

        return Object.keys(groupedByCustomer).filter(phone => {
            if (phone.toLowerCase().includes(lowerQuery)) return true;

            const quotes = groupedByCustomer[phone];
            return quotes.some(q =>
                q.customer.customerName?.toLowerCase().includes(lowerQuery) ||
                q.customer.companyName?.toLowerCase().includes(lowerQuery)
            );
        });
    }, [groupedByCustomer, searchTerm]);

    if (selectedPhone) {
        const userQuotes = groupedByCustomer[selectedPhone] || [];
        const primaryCustomer = userQuotes[0]?.customer;

        return (
            <div className="liquid-glass-warm mt-6 animate-fade-in flex flex-col h-full p-6" style={{ minHeight: '600px' }}>
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                    <button
                        onClick={() => setSelectedPhone(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-muted" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-blue-500 flex items-center gap-2">
                            <User size={24} className="text-pink-500" />
                            {primaryCustomer?.customerName || 'Unknown User'}
                        </h2>
                        <div className="text-sm text-muted flex gap-4 mt-1">
                            <span>{selectedPhone !== 'Unknown' ? `📞 ${selectedPhone}` : ''}</span>
                            <span>{primaryCustomer?.companyName ? `🏢 ${primaryCustomer.companyName}` : ''}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-auto pr-2">
                    <h3 className="font-bold text-blue-500 mb-4">Saved Quotations ({userQuotes.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userQuotes.map(quote => (
                            <div
                                key={quote.id}
                                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                                onClick={() => onOpenQuotation && onOpenQuotation(quote)}
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full ${quote.brand === 'KOHLER' ? 'bg-black' : 'bg-blue-500'}`} />
                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <div>
                                        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
                                            {quote.brand} Quote
                                        </div>
                                        <div className="font-bold text-primary flex items-center gap-1">
                                            <Calendar size={14} className="text-muted" />
                                            {new Date(quote.createdAt).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-secondary">
                                            {formatCurrency(quote.totals.grandTotal)}
                                        </div>
                                        <div className="text-xs text-muted">
                                            Ref: SC-{quote.quoteNumber || 'NEW'}
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-2 mt-4 pt-3 border-t border-gray-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-sm text-primary font-medium" onClick={() => onOpenQuotation && onOpenQuotation(quote)}>View Details</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleDelete(quote.id, e)}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Quotation"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <ChevronRight size={16} className="text-primary" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="panel glass-panel mt-6 animate-fade-in flex flex-col h-full" style={{ minHeight: '600px' }}>
            <div className="flex justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="panel-title mb-0 flex-shrink-0 animate-fade-in flex items-center gap-2">
                        <FileText size={20} /> Saved Quotations
                    </h2>
                    <p className="text-muted text-sm">Manage and restore your saved quotations</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="btn btn-secondary flex items-center gap-2 text-xs"
                        style={{ padding: '0.4rem 0.8rem' }}
                    >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                    </button>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                            <Search size={16} />
                        </span>
                        <input
                            type="text"
                            className="input-field-warm w-64 pl-10"
                            placeholder="Search mobile/name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-auto pr-2">
                {filteredPhones.length === 0 ? (
                    <div className="p-8 text-center text-muted flex flex-col items-center justify-center h-full">
                        <User size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-bold">No profiles found</p>
                        <p className="text-sm mt-1">Try a different search term or create a new quotation.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredPhones.map(phone => {
                            const userQuotes = groupedByCustomer[phone];
                            const latestCustomer = userQuotes[0]?.customer;

                            return (
                                <div
                                    key={phone}
                                    className="bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-between hover:bg-secondary-50 cursor-pointer transition-colors shadow-sm"
                                    onClick={() => setSelectedPhone(phone)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-primary-light flex-shrink-0 border border-gray-100">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 group cursor-pointer">
                                                <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs">
                                                    {latestCustomer?.customerName?.charAt(0) || 'U'}
                                                </div>
                                                <h3 className="font-bold text-primary group-hover:text-secondary transition-colors truncate">
                                                    {latestCustomer?.customerName || 'Unknown User'}
                                                </h3>
                                            </div>
                                            {latestCustomer?.companyName && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-muted rounded-full font-normal ml-10">
                                                    {latestCustomer.companyName}
                                                </span>
                                            )}
                                            <div className="text-sm text-muted mt-1">
                                                {phone !== 'Unknown' ? phone : 'No Mobile Number'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-bold text-gold">
                                                {userQuotes.length} {userQuotes.length === 1 ? 'Quote' : 'Quotes'}
                                            </div>
                                            <div className="text-xs text-muted">
                                                Last: {new Date(userQuotes[0].createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => handleDeleteProfile(e, phone)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                title="Delete Profile"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <ChevronRight size={20} className="text-gray-300" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
