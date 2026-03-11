import React, { useState, useEffect, useMemo } from 'react';
import type { SavedQuotation } from '../types';
import { getSavedQuotations, deleteQuotation, deleteHistoricalQuotations, syncQuotationsFromCloud, updateQuotationStatus } from '../utils/storage';
import { Search, User, FileText, Calendar, Trash2, ArrowLeft, RefreshCw, ChevronRight, Sparkles, Users, TrendingUp, UserCheck } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface SavedQuotationsListProps {
    onOpenQuotation?: (quote: SavedQuotation) => void;
}

export const SavedQuotationsList: React.FC<SavedQuotationsListProps> = ({ onOpenQuotation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
    const [selectedPreparer, setSelectedPreparer] = useState<string | null>(null);
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

    const handleStatusChange = async (id: string, status: 'CREATED' | 'PREPARED' | 'FINALIZED', e: React.MouseEvent) => {
        e.stopPropagation();
        await updateQuotationStatus(id, status);
        const updated = getSavedQuotations();
        setQuotations(updated);
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
        let result = Object.keys(groupedByCustomer);

        if (selectedPreparer) {
            result = result.filter(phone => {
                const quotes = groupedByCustomer[phone];
                return quotes.some(q => {
                    const preparer = (q as any).preparedBy || 'Unassigned';
                    return preparer === selectedPreparer;
                });
            });
        }

        if (searchTerm) {
            const lowerQuery = searchTerm.toLowerCase();
            result = result.filter(phone => {
                if (phone.toLowerCase().includes(lowerQuery)) return true;

                const quotes = groupedByCustomer[phone];
                return quotes.some(q =>
                    q.customer.customerName?.toLowerCase().includes(lowerQuery) ||
                    q.customer.companyName?.toLowerCase().includes(lowerQuery)
                );
            });
        }

        return result;
    }, [groupedByCustomer, searchTerm, selectedPreparer]);

    // Calculate Analytics
    const analytics = useMemo(() => {
        let totalQuotes = 0;
        let totalValue = 0;
        const preparerStats: Record<string, { created: number; prepared: number; finalized: number; value: number; total: number }> = {
            'Harsh Bhai — +91 82385 21277': { created: 0, prepared: 0, finalized: 0, value: 0, total: 0 },
            'Karan Bhai — +91 82009 17069': { created: 0, prepared: 0, finalized: 0, value: 0, total: 0 },
            'Kunal Bhai — +91 98987 13167': { created: 0, prepared: 0, finalized: 0, value: 0, total: 0 },
        };

        quotations.forEach(q => {
            totalQuotes++;
            totalValue += q.totals.grandTotal || 0;

            const preparer = q.preparedBy || 'Unassigned';
            if (!preparerStats[preparer]) preparerStats[preparer] = { created: 0, prepared: 0, finalized: 0, value: 0, total: 0 };

            preparerStats[preparer].total++;
            preparerStats[preparer].value += q.totals.grandTotal || 0;

            if (q.status === 'FINALIZED') {
                preparerStats[preparer].finalized++;
            } else if (q.status === 'PREPARED') {
                preparerStats[preparer].prepared++;
            } else {
                preparerStats[preparer].created++;
            }
        });

        // Convert to array and sort by value/total count
        const sortedPreparers = Object.entries(preparerStats).map(([name, stats]) => ({
            name,
            ...stats
        })).sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            return b.value - a.value;
        });

        return {
            totalQuotes,
            totalValue,
            uniqueClients: Object.keys(groupedByCustomer).length,
            preparerStats: sortedPreparers
        };
    }, [quotations, groupedByCustomer]);

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
                                <div className="pl-2 mt-4 pt-3 border-t border-gray-50 flex flex-col gap-2">
                                    <div className="flex w-full items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex bg-gray-100/80 rounded-md p-1 gap-1">
                                            <button
                                                onClick={(e) => handleStatusChange(quote.id, 'CREATED', e)}
                                                className={`text-[9px] px-2 py-1 rounded transition-colors font-bold uppercase tracking-wider ${(!quote.status || quote.status === 'CREATED') ? 'bg-white text-gray-700 shadow border border-gray-200/50' : 'text-gray-400 hover:text-gray-600'}`}
                                            >Created</button>
                                            <button
                                                onClick={(e) => handleStatusChange(quote.id, 'PREPARED', e)}
                                                className={`text-[9px] px-2 py-1 rounded transition-colors font-bold uppercase tracking-wider ${quote.status === 'PREPARED' ? 'bg-blue-500 text-white shadow border border-blue-600/50' : 'text-gray-400 hover:text-gray-600'}`}
                                            >Prepared</button>
                                            <button
                                                onClick={(e) => handleStatusChange(quote.id, 'FINALIZED', e)}
                                                className={`text-[9px] px-2 py-1 rounded transition-colors font-bold uppercase tracking-wider ${quote.status === 'FINALIZED' ? 'bg-emerald-500 text-white shadow border border-emerald-600/50' : 'text-gray-400 hover:text-gray-600'}`}
                                            >Finalized</button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                        <span className="text-sm text-primary font-medium hover:underline" onClick={() => onOpenQuotation && onOpenQuotation(quote)}>View Details</span>
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

            {/* TEJASKP AI Analytics Panel */}
            {quotations.length > 0 && !searchTerm && !selectedPreparer && (
                <div className="mb-6 p-6 rounded-xl shadow-sm reveal-on-scroll" style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.5)', borderLeft: '4px solid #a855f7' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold font-black text-gray-800 tracking-tight flex items-center gap-2">
                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                                <Sparkles size={18} />
                            </div>
                            TEJASKP AI Analytics
                            <span className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold ml-2" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>Smart Insights</span>
                        </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div className="p-4 flex items-center gap-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className="p-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}><FileText size={20} /></div>
                            <div>
                                <div className="text-2xl font-black" style={{ color: '#1e3a8a' }}>{analytics.totalQuotes}</div>
                                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Total Quotes</div>
                            </div>
                        </div>
                        <div className="p-4 flex items-center gap-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className="p-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}><Users size={20} /></div>
                            <div>
                                <div className="text-2xl font-black" style={{ color: '#1e3a8a' }}>{analytics.uniqueClients}</div>
                                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Unique Clients</div>
                            </div>
                        </div>
                        <div className="p-4 flex items-center gap-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className="p-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}><TrendingUp size={20} /></div>
                            <div>
                                <div className="text-xl font-black" style={{ color: '#1e3a8a' }}>{formatCurrency(analytics.totalValue)}</div>
                                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Est. Pipeline Value</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 rounded-xl shadow-inner" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div className="text-sm font-black mb-4 flex items-center justify-between pb-3" style={{ color: '#1e40af', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                                    <UserCheck size={16} />
                                </div>
                                TEJASKP AI Team Performance Analysis
                            </div>
                            {selectedPreparer && (
                                <button
                                    onClick={() => setSelectedPreparer(null)}
                                    className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors flex items-center gap-1"
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {analytics.preparerStats.map((stat, idx) => {
                                const isSelected = selectedPreparer === stat.name;
                                return (
                                    <div
                                        key={stat.name}
                                        onClick={() => setSelectedPreparer(isSelected ? null : stat.name)}
                                        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 scale-[1.01]' : ''}`}
                                        style={{ backgroundColor: isSelected ? '#eff6ff' : '#ffffff', borderColor: idx === 0 && stat.name !== 'Unassigned' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(0,0,0,0.05)' }}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: idx === 0 && stat.name !== 'Unassigned' ? 'linear-gradient(to bottom, #fde047, #d97706)' : 'linear-gradient(to bottom, #d8b4fe, #a855f7)' }}></div>
                                        <div className="pl-4 flex items-center gap-4 mb-4 md:mb-0">
                                            <div className="w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-lg shadow-inner" style={{ backgroundColor: idx === 0 && stat.name !== 'Unassigned' ? '#fefce8' : '#faf5ff', color: idx === 0 && stat.name !== 'Unassigned' ? '#a16207' : '#9333ea' }}>
                                                {stat.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                    {stat.name.replace(' —', ',').split(',')[0]}
                                                    {idx === 0 && stat.name !== 'Unassigned' && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm flex items-center gap-1" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>
                                                            <Sparkles size={10} /> Top Performer
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-medium mt-1 truncate" style={{ color: '#64748b' }}>{stat.name}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-4 sm:gap-6 md:pr-4 pl-0 md:pl-0 sm:ml-16 md:ml-0 border-t md:border-t-0 pt-3 md:pt-0" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                                            <div className="text-left md:text-right min-w-[50px]">
                                                <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#64748b' }}>Created</div>
                                                <div className="font-black text-xl" style={{ color: '#64748b' }}>{stat.created}</div>
                                            </div>
                                            <div className="text-left md:text-right min-w-[50px]">
                                                <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#64748b' }}>Prepared</div>
                                                <div className="font-black text-xl" style={{ color: '#3b82f6' }}>{stat.prepared}</div>
                                            </div>
                                            <div className="text-left md:text-right min-w-[50px]">
                                                <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#64748b' }}>Finalized</div>
                                                <div className="font-black text-xl" style={{ color: '#10b981' }}>{stat.finalized}</div>
                                            </div>
                                            <div className="text-left md:text-right min-w-[95px] border-l border-gray-100 pl-4 hidden xl:block">
                                                <div className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: '#64748b' }}>Total Pipeline</div>
                                                <div className="font-bold text-lg" style={{ color: '#059669' }}>{formatCurrency(stat.value)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

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
