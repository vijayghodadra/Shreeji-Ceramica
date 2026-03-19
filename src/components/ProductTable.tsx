import React, { useState, useEffect } from 'react';
import type { ProductDetails } from '../types';
import { calculateProductTotals, formatCurrency } from '../utils/calculations';
import { getProductHistory, saveProductToHistory } from '../utils/storage';
import { Plus, Trash2, Box, Info, Search, Database, Sparkles } from 'lucide-react';
import { semanticSearch } from '../utils/supabase';

import kohlerCatalog from '../data/products.json';
import aquantCatalog from '../data/aquant_products.json';

const ROOM_OPTIONS = [
    { value: '', label: '— Room —' },
    { value: "Kid's Bathroom", label: "Kid's Bathroom" },
    { value: 'Guest Bathroom', label: 'Guest Bathroom' },
    { value: "Parent's Bathroom", label: "Parent's Bathroom" },
    { value: 'Master Bathroom', label: 'Master Bathroom' },
    { value: 'Common / Powder Room', label: 'Common / Powder Room' },
    { value: 'Living Room', label: 'Living Room' },
    { value: 'Kitchen', label: 'Kitchen' },
    { value: 'Balcony', label: 'Balcony' },
    { value: 'Utility Room', label: 'Utility Room' },
];

const matchesProductSearch = (product: any, searchTerm: string): boolean => {
    if (!searchTerm || !product) return true;
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    const matchCode = product.productCode?.toLowerCase() || '';
    const matchName = product.productName?.toLowerCase() || '';
    const matchColor = product.color?.toLowerCase() || '';
    const matchSize = product.size?.toLowerCase() || '';

    // Direct substring match first
    if (matchCode.includes(searchLower) || matchName.includes(searchLower)) {
        return true;
    }

    // Multi-token match for things like "1003 G - Gold"
    const searchTerms = searchLower.split(/[\s-]+/).filter(t => t.length > 0);
    if (searchTerms.length === 0) return false;

    const fullText = `${matchCode} ${matchName} ${matchColor} ${matchSize}`;
    return searchTerms.every(term => fullText.includes(term));
};


interface ProductTableProps {
    products: ProductDetails[];
    setProducts: React.Dispatch<React.SetStateAction<ProductDetails[]>>;
    activeBrand: 'KOHLER' | 'AQUANT';
    discountMode: 'INDIVIDUAL' | 'COMMON' | 'GLOBAL';
    commonDiscountPercentage: number;
}

export const ProductTable: React.FC<ProductTableProps> = ({
    products,
    setProducts,
    activeBrand,
    discountMode,
    commonDiscountPercentage
}) => {
    const [history, setHistory] = useState<Partial<ProductDetails>[]>([]);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [showGlobalSuggestions, setShowGlobalSuggestions] = useState(false);
    const [semanticResults, setSemanticResults] = useState<any[]>([]);
    const [isSearchingAI, setIsSearchingAI] = useState(false);


    useEffect(() => {
        setHistory(getProductHistory());
    }, []);

    // Debounced Semantic Search Effect
    useEffect(() => {
        if (!globalSearch || globalSearch.length < 3) {
            setSemanticResults([]);
            setIsSearchingAI(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingAI(true);
            try {
                const results = await semanticSearch(globalSearch, activeBrand);
                setSemanticResults(results);
            } catch (err) {
                console.error("AI Search failed:", err);
            } finally {
                setIsSearchingAI(false);
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timer);
    }, [globalSearch, activeBrand]);


    const addProduct = () => {
        const newProduct: ProductDetails = {
            id: crypto.randomUUID(),
            productCode: '',
            productName: '',
            size: '',
            color: '',
            quantity: 1,
            rate: 0,
            discountPercentage: discountMode === 'COMMON' ? commonDiscountPercentage : 0,
            discountAmount: 0,
            amountBeforeDiscount: 0,
            finalAmount: 0,
        };

        if (discountMode === 'COMMON') {
            const { amountBeforeDiscount, discountAmount, finalAmount } = calculateProductTotals(
                newProduct.quantity,
                newProduct.rate,
                commonDiscountPercentage
            );
            newProduct.amountBeforeDiscount = amountBeforeDiscount;
            newProduct.discountAmount = discountAmount;
            newProduct.finalAmount = finalAmount;
        }

        setProducts([...products, newProduct]);
    };

    const removeProduct = (id: string) => {
        setProducts(products.filter(p => p.id !== id));
    };

    const updateProduct = (id: string, field: keyof ProductDetails, value: string | number) => {
        setProducts(products.map(product => {
            if (product.id !== id) return product;

            const updated = { ...product, [field]: value };

            // Auto-recalculate if quantity, rate, or discount changes
            if (['quantity', 'rate', 'discountPercentage'].includes(field)) {
                const disc = discountMode === 'COMMON' ? commonDiscountPercentage : updated.discountPercentage;
                const { amountBeforeDiscount, discountAmount, finalAmount } = calculateProductTotals(
                    updated.quantity,
                    updated.rate,
                    disc
                );
                updated.discountPercentage = disc;
                updated.amountBeforeDiscount = amountBeforeDiscount;
                updated.discountAmount = discountAmount;
                updated.finalAmount = finalAmount;
            }

            return updated;
        }));
    };

    const handleSelectSuggestion = (id: string, suggestion: Partial<ProductDetails>) => {
        setProducts(products.map(product => {
            if (product.id !== id) return product;

            const updated = {
                ...product,
                productCode: suggestion.productCode || product.productCode,
                productName: suggestion.productName || product.productName,
                image: suggestion.image || product.image,
                size: suggestion.size || product.size,
                color: suggestion.color || product.color,
                rate: suggestion.rate || product.rate,
            };

            const disc = discountMode === 'COMMON' ? commonDiscountPercentage : updated.discountPercentage;
            const { amountBeforeDiscount, discountAmount, finalAmount } = calculateProductTotals(
                updated.quantity,
                updated.rate,
                disc
            );
            updated.discountPercentage = disc;
            updated.amountBeforeDiscount = amountBeforeDiscount;
            updated.discountAmount = discountAmount;
            updated.finalAmount = finalAmount;

            return updated;
        }));
        setActiveRowId(null);
    };

    const handleRowBlur = (product: ProductDetails) => {
        setTimeout(() => {
            if (activeRowId === product.id) setActiveRowId(null);
            if (product.productCode || product.productName) {
                saveProductToHistory(product);
                setHistory(getProductHistory());
            }
        }, 200);
    };

    return (
        <div className="liquid-glass-warm mt-6 animate-fade-in p-6 w-full max-w-full overflow-hidden" style={{ animationDelay: '0.1s', position: 'relative' }}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                <h2 className="panel-title mb-0 flex-shrink-0 w-full md:w-auto text-left"><Box size={20} className="text-secondary inline-block mr-2" /> Products / Bill of Materials</h2>

                <div className="relative flex-grow w-full max-w-md mx-auto md:mx-0">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                            <Search size={16} />
                        </span>
                        <input
                            type="text"
                            className="input-field-warm w-full pl-10"
                            placeholder={`Quick Search & Add ${activeBrand === 'KOHLER' ? 'Kohler' : 'Aquant'} Product...`}
                            value={globalSearch}
                            onChange={(e) => {
                                const val = e.target.value;
                                setGlobalSearch(val);
                                setShowGlobalSuggestions(true);
                                
                                // Debounced Semantic Search is handled by useEffect
                                if (val.length > 2) {
                                    setIsSearchingAI(true);
                                } else {
                                    setSemanticResults([]);
                                }

                            }}
                            onFocus={() => setShowGlobalSuggestions(true)}

                            onBlur={() => setTimeout(() => setShowGlobalSuggestions(false), 200)}
                        />
                    </div>
                                        {showGlobalSuggestions && (globalSearch.length > 1) && (
                        <div 
                            className="suggestions-dropdown glass-premium" 
                            style={{ maxHeight: '60vh', overflowY: 'auto' }}
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            {(() => {
                                const renderProductItem = (c: any, keyMap: string) => (
                                    <div
                                        key={keyMap}
                                        className="suggestion-item"
                                        onClick={() => {
                                            const newPrd: ProductDetails = {
                                                id: crypto.randomUUID(),
                                                productCode: c.productCode,
                                                productName: c.productName,
                                                image: c.image || '',
                                                rate: c.rate,
                                                quantity: 1,
                                                size: c.size || '',
                                                color: c.color || '',
                                                discountPercentage: discountMode === 'COMMON' ? commonDiscountPercentage : 0,
                                                discountAmount: 0,
                                                amountBeforeDiscount: 0,
                                                finalAmount: 0
                                            };
                                            if (discountMode === 'COMMON') {
                                                const { amountBeforeDiscount, discountAmount, finalAmount } = calculateProductTotals(
                                                    newPrd.quantity,
                                                    newPrd.rate,
                                                    commonDiscountPercentage
                                                );
                                                newPrd.amountBeforeDiscount = amountBeforeDiscount;
                                                newPrd.discountAmount = discountAmount;
                                                newPrd.finalAmount = finalAmount;
                                            }
                                            setProducts([...products, newPrd]);
                                            setGlobalSearch('');
                                            setShowGlobalSuggestions(false);
                                        }}
                                    >
                                        <div className="suggestion-img-wrapper">
                                            <img 
                                                src={c.image || "/catalog/aquant_images/placeholder.jpg"} 
                                                alt={c.productCode} 
                                                onError={(e) => { e.currentTarget.src = "/catalog/aquant_images/placeholder.jpg"; }}
                                            />
                                        </div>

                                        <div className="suggestion-info">
                                            <div className="suggestion-header">
                                                <span className="suggestion-code">{c.productCode}</span>
                                                <span className="text-[9px] px-1 bg-gray-100 rounded text-muted font-bold ml-2">{c.brand || activeBrand}</span>
                                                <span className="suggestion-price">{formatCurrency(c.rate)}</span>
                                            </div>

                                            <div className="suggestion-name">{c.productName}</div>
                                            {(c.size || c.color) && (
                                                <div className="suggestion-meta">
                                                    {c.size && <span>Size: {c.size}</span>}
                                                    {c.size && c.color && <span className="mx-1">|</span>}
                                                    {c.color && <span>Color: {c.color}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );

                                // 1. COLLATE RESULTS
                                const isKohler = activeBrand === 'KOHLER';
                                const mainCatalog = isKohler ? kohlerCatalog : aquantCatalog;
                                const inactiveBrandStr = isKohler ? 'AQUANT' : 'KOHLER';
                                const inactiveCatalog = isKohler ? aquantCatalog : kohlerCatalog;
                                const searchLower = globalSearch.toLowerCase().trim();
                                const searchNorm = searchLower.replace(/[^a-z0-9]/g, '');

                                // Check for exact matches in local catalog first (instant)
                                const localExact = mainCatalog.find(c => {
                                    const code = (c.productCode || '').toLowerCase().trim();
                                    return code === searchLower || code.replace(/[^a-z0-9]/g, '') === searchNorm;
                                });

                                // Check inactive catalog for cross-exact match
                                const inactiveExactMatch = inactiveCatalog.find(c => {
                                    const code = (c.productCode || '').toLowerCase().trim();
                                    return code === searchLower || code.replace(/[^a-z0-9]/g, '') === searchNorm;
                                });

                                // 2. COLLECT RESULTS
                                const results = [];

                                // ALWAYS show local exact first
                                if (localExact) {
                                    results.push(
                                        <div key="exact-match-group">
                                            <div className="p-2 bg-green-50 text-[10px] font-bold text-green-700 uppercase flex items-center gap-1 border-b border-green-100">
                                                <Sparkles size={10} className="text-secondary" /> EXACT MODEL MATCH FOUND
                                            </div>
                                            {renderProductItem(localExact, 'exact-match')}
                                        </div>
                                    );
                                } else if (inactiveExactMatch) {
                                    // If no local exact but exists in other catalog, show it PROMINTENTLY!
                                    results.push(
                                        <div key="cross-exact-match-group">
                                            <div className="p-2 bg-blue-50 text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1 border-b border-blue-100">
                                                <Search size={10} className="text-primary" /> EXACT {inactiveBrandStr} MODEL MATCH
                                            </div>
                                            {renderProductItem(inactiveExactMatch, 'cross-exact-1')}
                                        </div>
                                    );
                                }

                                // 3. AI Suggestions (interleaved)
                                if (semanticResults.length > 0) {
                                    const filteredAI = semanticResults.filter(s => 
                                        (!localExact || s.productCode !== localExact.productCode) && 
                                        (!inactiveExactMatch || s.productCode !== inactiveExactMatch.productCode)
                                    ).slice(0, 5);

                                    if (filteredAI.length > 0) {
                                        results.push(
                                            <div key="semantic-group" className="mt-2">
                                                <div className="p-2 bg-purple-50 text-[10px] font-bold text-purple-700 uppercase flex items-center gap-1 border-b border-purple-100">
                                                    <Sparkles size={10} /> AI POWERED SUGGESTIONS
                                                </div>
                                                {filteredAI.map((c: any, i) => renderProductItem(c, `semantic-${i}`))}
                                            </div>
                                        );
                                    }
                                }

                                // 4. Local Category Filtering
                                const cats = isKohler ? [
                                    { title: 'Smart Toilets & Bidets', keywords: ['Toilet', 'Bidet', 'Cleansing', 'PureWash', 'C3-', 'Veil', 'Innate', 'Leap'] },
                                    { title: 'Faucets & Fittings', keywords: ['Faucet', 'Tap', 'Mixer', 'Handle', 'Spout'] },
                                    { title: 'Showers & Bath', keywords: ['Shower', 'Bath', 'Valve', 'Trim'] },
                                    { title: 'Other Products', keywords: [] }
                                ] : [
                                    { title: 'Stone & Concrete Basins', keywords: ['Basin', 'Concrete', 'Carrara', 'Marble'] },
                                    { title: 'Toilets', keywords: ['Toilet', 'WC', 'Urinal', 'Concealed'] },
                                    { title: 'Showers & Drains', keywords: ['Shower', 'Drain', 'Jet', 'Rain'] },
                                    { title: 'Mixers & Faucets', keywords: ['Mixer', 'Spout', 'Cock', 'Tap', 'Knobs'] },
                                    { title: 'Other Products', keywords: [] }
                                ];

                                const categoryResults = cats.map((cat, catIdx) => {
                                    const filtered = mainCatalog.filter(c => {
                                        if (localExact && c.productCode === localExact.productCode) return false;
                                        if (inactiveExactMatch && c.productCode === inactiveExactMatch.productCode) return false;
                                        
                                        const matchesSearch = matchesProductSearch(c, globalSearch);
                                        if (!matchesSearch) return false;

                                        const searchTarget = (c.productName || '') + ' ' + (c.productCode || '');
                                        if (cat.keywords.length === 0) {
                                            const matchesOtherCat = isKohler 
                                                ? ['Toilet', 'Bidet', 'Faucet', 'Mixer', 'Shower', 'Bath'].some(k => searchTarget.toLowerCase().includes(k.toLowerCase()))
                                                : ['Basin', 'Concrete', 'Carrara', 'Marble', 'Toilet', 'WC', 'Urinal', 'Concealed', 'Shower', 'Drain', 'Jet', 'Rain', 'Mixer', 'Spout', 'Cock', 'Tap', 'Knobs'].some(k => searchTarget.toLowerCase().includes(k.toLowerCase()));
                                            return !matchesOtherCat;
                                        }

                                        return cat.keywords.some(k => searchTarget.toLowerCase().includes(k.toLowerCase()));
                                    }).sort((a: any, b: any) => {
                                        const aCode = (a.productCode || '').toLowerCase();
                                        const bCode = (b.productCode || '').toLowerCase();
                                        const aPrefix = aCode.startsWith(searchLower);
                                        const bPrefix = bCode.startsWith(searchLower);
                                        if (aPrefix && !bPrefix) return -1;
                                        if (!aPrefix && bPrefix) return 1;
                                        return 0;
                                    }).slice(0, 10);

                                    if (filtered.length === 0) return null;

                                    return (
                                        <div key={`cat-${catIdx}`}>
                                            <div className="p-2 bg-gray-50 text-[10px] font-bold text-muted uppercase flex items-center gap-1 border-b border-gray-100">
                                                <Box size={10} /> {cat.title}
                                            </div>
                                            {filtered.map((c: any, i) => renderProductItem(c, `glob-${catIdx}-${i}`))}
                                        </div>
                                    );
                                });

                                const hasLocalPartial = categoryResults.some(r => r !== null);
                                if (hasLocalPartial) results.push(...categoryResults);

                                // 5. Cross-brand matches (if nothing found locally besides maybe an exact match)
                                if (results.length <= 1) { // Up to 1 result (the exact match)
                                    const inactiveMatches = inactiveCatalog.filter(c => {
                                        if (inactiveExactMatch && c.productCode === inactiveExactMatch.productCode) return false;
                                        return matchesProductSearch(c, globalSearch);
                                    }).sort((a: any, b: any) => {
                                        const aCode = (a.productCode || '').toLowerCase();
                                        const bCode = (b.productCode || '').toLowerCase();
                                        const aPrefix = aCode.startsWith(searchLower);
                                        const bPrefix = bCode.startsWith(searchLower);
                                        if (aPrefix && !bPrefix) return -1;
                                        if (!aPrefix && bPrefix) return 1;
                                        return 0;
                                    }).slice(0, 15);

                                    if (inactiveMatches.length > 0) {
                                        results.push(
                                            <div key="cross-brand-matches" className="mt-2 border-t border-gray-100">
                                                <div className="p-2 bg-blue-50 text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1 border-b border-blue-100">
                                                    <Search size={10} /> Matches in {inactiveBrandStr}
                                                </div>
                                                {inactiveMatches.map((c: any, i) => renderProductItem(c, `cross-glob-${i}`))}
                                            </div>
                                        );
                                    }
                                }


                                // 6. FINAL FALLBACK: If absolutely nothing found
                                if (results.length === 0) {
                                    results.push(
                                        <div key="no-all-results" className="p-8 text-center text-muted">
                                            <Box size={32} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm font-bold">No results found in any catalog</p>
                                            <p className="text-xs">Try searching in another category or using partial names.</p>
                                            {isSearchingAI && <p className="text-secondary animate-pulse mt-2">The AI is still searching deep in the catalog...</p>}
                                        </div>
                                    );
                                }

                                return <>{results}</>;

                            })()}
                        </div>
                    )}

               </div>

                <button className="btn btn-primary btn-sm flex-shrink-0 w-full md:w-auto justify-center" onClick={addProduct}>
                    <Plus size={16} /> Add Product
                </button>
            </div>

            <div className="product-table-scroll-container" style={{ overflowX: 'auto', margin: '0 -1.5rem', padding: '0 1.5rem' }}>
                <table className="premium-table w-full">
                    <thead>
                        <tr>
                            <th style={{ width: '12%', minWidth: '80px', padding: '0.4rem 0.3rem' }}>CODE</th>
                            <th style={{ width: '22%', minWidth: '150px', padding: '0.4rem 0.3rem' }}>PRODUCT NAME</th>
                            <th style={{ width: '8%', minWidth: '60px', padding: '0.4rem 0.3rem' }}>SIZE</th>
                            <th style={{ width: '8%', minWidth: '80px', padding: '0.4rem 0.3rem' }}>COLOR</th>
                            <th className="text-center" style={{ width: '5%', minWidth: '50px', padding: '0.4rem 0.3rem' }}>QTY</th>
                            <th className="text-center" style={{ width: '8%', minWidth: '70px', padding: '0.4rem 0.3rem' }}>RATE</th>
                            <th className="text-center" style={{ width: '5%', minWidth: '50px', padding: '0.4rem 0.3rem' }}>DISC</th>
                            <th className="text-right" style={{ width: '10%', minWidth: '80px', padding: '0.4rem 0.3rem' }}>AMOUNT</th>
                            <th className="text-center" style={{ width: '14%', minWidth: '110px', padding: '0.4rem 0.3rem' }}>ROOM</th>
                            <th className="text-center" style={{ width: '3%', minWidth: '40px', padding: '0.4rem 0.3rem' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center p-6 text-muted">
                                    <div className="flex flex-col items-center gap-2">
                                        <Info size={24} />
                                        <p>No products added yet. Click "Add Product" to start.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : products.map((product) => (
                            <tr key={product.id}>
                                <td style={{ position: 'relative', padding: '0.4rem 0.3rem' }}>
                                    <div className="flex gap-1.5 items-center">
                                        {(product.image || product.productImage) ? (
                                            <div className="w-6 h-6 bg-white rounded border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5">
                                                <img
                                                    src={product.image || product.productImage}
                                                    alt={product.productCode}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-muted flex-shrink-0">
                                                <Box size={10} />
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            className="input-field-warm w-full font-bold"
                                            placeholder="Code"
                                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.4rem' }}
                                            value={product.productCode}
                                            onChange={(e) => updateProduct(product.id, 'productCode', e.target.value)}
                                            onFocus={() => setActiveRowId(product.id)}
                                            onBlur={() => handleRowBlur(product)}
                                        />
                                    </div>

                                    {activeRowId === product.id && (
                                        <div className="suggestions-dropdown glass-premium" style={{ left: 0, width: 'max-content', maxWidth: '85vw', minWidth: '250px' }}>
                                            {history.filter(h =>
                                                matchesProductSearch(h, product.productCode) ||
                                                matchesProductSearch(h, product.productName)
                                            ).length > 0 && (
                                                    <div className="p-2 bg-gray-50 text-xs font-bold text-muted uppercase flex items-center gap-1">
                                                        <Box size={10} /> Recent Items
                                                    </div>
                                                )}
                                            {history
                                                .filter(h => matchesProductSearch(h, product.productCode) || matchesProductSearch(h, product.productName))
                                                .map((h, i) => (
                                                    <div
                                                        key={`hist-${i}`}
                                                        className="suggestion-item p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                        style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                        onClick={() => handleSelectSuggestion(product.id, h)}
                                                    >
                                                        <div className="font-bold flex justify-between">
                                                            <span>{h.productCode}</span>
                                                            <span className="text-xs text-muted">Recent</span>
                                                        </div>
                                                        <div className="text-muted text-xs truncate">{h.productName}</div>
                                                    </div>
                                                ))}

                                            {product.productCode.length > 1 || product.productName.length > 2 ? (
                                                <>
                                                    <div className="p-2 bg-blue-50 text-xs font-bold text-primary-light uppercase flex items-center gap-1">
                                                        <Database size={10} /> {activeBrand === 'AQUANT' ? 'Aquant' : 'Kohler'} Catalog
                                                    </div>
                                                    {(activeBrand === 'AQUANT' ? aquantCatalog : kohlerCatalog)
                                                        .filter(c => {
                                                            const pCodeMatch = product.productCode ? matchesProductSearch(c, product.productCode) : false;
                                                            const pNameMatch = product.productName ? matchesProductSearch(c, product.productName) : false;
                                                            return (product.productCode && pCodeMatch) || (product.productName && pNameMatch) || (!product.productCode && !product.productName);
                                                        })
                                                        .slice(0, 15)
                                                        .map((c: any, i) => (
                                                            <div
                                                                key={`cat-${i}`}
                                                                className="suggestion-item"
                                                                onClick={() => handleSelectSuggestion(product.id, c)}
                                                            >
                                                                <div className="suggestion-img-wrapper">
                                                                    {c.image ? (
                                                                        <img src={c.image} alt={c.productCode} />
                                                                    ) : (
                                                                        <Database size={24} className="text-muted opacity-20" />
                                                                    )}
                                                                </div>
                                                                <div className="suggestion-info">
                                                                    <div className="suggestion-header">
                                                                        <span className="suggestion-code">{c.productCode}</span>
                                                                        <span className="suggestion-price">{formatCurrency(c.rate)}</span>
                                                                    </div>
                                                                    <div className="suggestion-name">{c.productName}</div>
                                                                    {(c.size || c.color) && (
                                                                        <div className="suggestion-meta">
                                                                            {c.size && <span>Size: {c.size}</span>}
                                                                            {c.size && c.color && <span className="mx-1">|</span>}
                                                                            {c.color && <span>Color: {c.color}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </>
                                            ) : (
                                                <div className="p-4 text-center text-xs text-muted">
                                                    Start typing to search {activeBrand === 'AQUANT' ? 'Aquant' : 'Kohler'} Catalog...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        type="text"
                                        className="input-field-warm w-full text-xs"
                                        placeholder="Product Name"
                                        style={{ padding: '0.3rem 0.4rem' }}
                                        value={product.productName}
                                        onChange={(e) => updateProduct(product.id, 'productName', e.target.value)}
                                        onFocus={() => setActiveRowId(product.id)}
                                        onBlur={() => handleRowBlur(product)}
                                    />
                                </td>
                                <td style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        type="text"
                                        className="input-field-warm w-full text-xs"
                                        placeholder="Size"
                                        style={{ padding: '0.3rem 0.4rem' }}
                                        value={product.size}
                                        onChange={(e) => updateProduct(product.id, 'size', e.target.value)}
                                    />
                                </td>
                                <td style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        type="text"
                                        className="input-field-warm w-full text-xs"
                                        placeholder="Color"
                                        style={{ padding: '0.3rem 0.4rem' }}
                                        value={product.color}
                                        onChange={(e) => updateProduct(product.id, 'color', e.target.value)}
                                    />
                                </td>
                                <td className="text-center" style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        type="number"
                                        className="input-field-warm text-center text-xs"
                                        style={{ width: '45px', padding: '0.3rem 0.3rem' }}
                                        value={product.quantity}
                                        onChange={(e) => updateProduct(product.id, 'quantity', Number(e.target.value))}
                                    />
                                </td>
                                <td className="text-center" style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        type="number"
                                        className="input-field-warm text-center text-xs font-bold"
                                        style={{ width: '85px', padding: '0.3rem 0.3rem' }}
                                        value={product.rate}
                                        onChange={(e) => updateProduct(product.id, 'rate', Number(e.target.value))}
                                    />
                                </td>
                                <td className="text-center" style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        className={`input-field-warm text-center mx-auto text-xs ${discountMode !== 'INDIVIDUAL' ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                                        style={{ width: '40px', padding: '0.3rem 0.3rem' }}
                                        value={product.discountPercentage}
                                        onChange={(e) => updateProduct(product.id, 'discountPercentage', Number(e.target.value))}
                                        disabled={discountMode !== 'INDIVIDUAL'}
                                        title={discountMode !== 'INDIVIDUAL' ? "Switch to Individual Discount mode to edit" : ""}
                                    />
                                </td>
                                <td className="text-right font-bold text-primary text-xs" style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.3rem' }}>
                                    {formatCurrency(product.finalAmount)}
                                </td>
                                <td style={{ padding: '0.4rem 0.3rem' }}>
                                    <input
                                        type="text"
                                        list="room-options"
                                        className="input-field-warm w-full text-xs"
                                        style={{ padding: '0.3rem 0.2rem', fontSize: '0.7rem' }}
                                        placeholder="Room"
                                        value={product.room || ''}
                                        onChange={(e) => updateProduct(product.id, 'room', e.target.value)}
                                        title="Assign Room or type custom"
                                    />
                                </td>
                                <td className="text-center" style={{ padding: '0.4rem 0.3rem' }}>
                                    <button
                                        className="btn btn-danger p-1 hover:bg-red-50 flex items-center justify-center mx-auto"
                                        onClick={() => removeProduct(product.id)}
                                        title="Remove Product"
                                        style={{ minHeight: '26px', minWidth: '26px' }}
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <datalist id="room-options">
                    {ROOM_OPTIONS.filter(r => r.value !== '').map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </datalist>
            </div>

            {/* Mobile Card View */}
            <div className="product-mobile-grid">
                {products.length === 0 ? (
                    <div className="p-8 text-center text-muted glass-panel">
                        <Info size={32} className="mx-auto mb-2 opacity-20" />
                        <p>No products added yet.</p>
                        <button className="btn btn-primary btn-sm mt-4 w-full" onClick={addProduct}>
                            <Plus size={16} /> Add Product
                        </button>
                    </div>
                ) : (
                    products.map((product) => (
                        <div key={product.id} className="product-card">
                            <div className="product-card-header">
                                <div className="product-card-img">
                                    {(product.image || product.productImage) ? (
                                        <img src={product.image || product.productImage} alt="" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Box size={24} className="text-muted opacity-30" />
                                    )}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <input
                                            type="text"
                                            className="input-field-warm w-full font-bold text-sm"
                                            placeholder="Code"
                                            value={product.productCode}
                                            onChange={(e) => updateProduct(product.id, 'productCode', e.target.value)}
                                        />
                                        <button
                                            className="p-2 text-danger hover:bg-red-50 rounded-full"
                                            onClick={() => removeProduct(product.id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        className="input-field-warm w-full mt-2 text-xs"
                                        placeholder="Product Name"
                                        value={product.productName}
                                        onChange={(e) => updateProduct(product.id, 'productName', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="product-card-body">
                                <div className="input-group mb-0">
                                    <label className="input-label text-[10px]">Size</label>
                                    <input
                                        type="text"
                                        className="input-field-warm w-full"
                                        value={product.size}
                                        onChange={(e) => updateProduct(product.id, 'size', e.target.value)}
                                    />
                                </div>
                                <div className="input-group mb-0">
                                    <label className="input-label text-[10px]">Color</label>
                                    <input
                                        type="text"
                                        className="input-field-warm w-full"
                                        value={product.color}
                                        onChange={(e) => updateProduct(product.id, 'color', e.target.value)}
                                    />
                                </div>
                                <div className="input-group mb-0">
                                    <label className="input-label text-[10px]">Quantity</label>
                                    <input
                                        type="number"
                                        className="input-field-warm w-full"
                                        value={product.quantity}
                                        onChange={(e) => updateProduct(product.id, 'quantity', Number(e.target.value))}
                                    />
                                </div>
                                <div className="input-group mb-0">
                                    <label className="input-label text-[10px]">Rate</label>
                                    <input
                                        type="number"
                                        className="input-field w-full font-bold"
                                        value={product.rate}
                                        onChange={(e) => updateProduct(product.id, 'rate', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="product-card-footer">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-muted uppercase">Disc:</span>
                                    <input
                                        className={`input-field-warm text-center w-12 ${discountMode !== 'INDIVIDUAL' ? 'bg-gray-100' : ''}`}
                                        value={product.discountPercentage}
                                        onChange={(e) => updateProduct(product.id, 'discountPercentage', Number(e.target.value))}
                                        disabled={discountMode !== 'INDIVIDUAL'}
                                    />
                                    <span className="text-xs text-muted">%</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-muted uppercase font-bold">Total</div>
                                    <div className="text-lg font-bold text-primary">{formatCurrency(product.finalAmount)}</div>
                                </div>
                            </div>
                            <div className="px-4 pb-3">
                                <label className="input-label text-[10px] mb-1">Room</label>
                                <input
                                    type="text"
                                    list="room-options"
                                    className="input-field-warm w-full text-xs"
                                    placeholder="Room"
                                    value={product.room || ''}
                                    onChange={(e) => updateProduct(product.id, 'room', e.target.value)}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export const ProductTableWithEffect: React.FC<ProductTableProps> = (props) => {
    const { setProducts, discountMode, commonDiscountPercentage } = props;

    // When commonDiscountPercentage changes, update all products
    useEffect(() => {
        if (discountMode === 'COMMON') {
            setProducts(current => current.map(p => {
                const { amountBeforeDiscount, discountAmount, finalAmount } = calculateProductTotals(
                    p.quantity,
                    p.rate,
                    commonDiscountPercentage
                );
                return {
                    ...p,
                    discountPercentage: commonDiscountPercentage,
                    amountBeforeDiscount,
                    discountAmount,
                    finalAmount
                };
            }));
        } else if (discountMode === 'GLOBAL') {
            // Reset individual discounts in GLOBAL mode to keep it clean? 
            // Request says "Individual... OR Common... OR Global".
            // If they choose Global, we probably zero out the row-level ones for clarity.
            setProducts(current => current.map(p => {
                const { amountBeforeDiscount, discountAmount, finalAmount } = calculateProductTotals(
                    p.quantity,
                    p.rate,
                    0
                );
                return {
                    ...p,
                    discountPercentage: 0,
                    amountBeforeDiscount,
                    discountAmount,
                    finalAmount
                };
            }));
        }
    }, [discountMode, commonDiscountPercentage]);

    return <ProductTable {...props} />;
};
