import React, { useState, useEffect } from 'react';
import type { ProductDetails } from '../types';
import { calculateProductTotals, formatCurrency } from '../utils/calculations';
import { getProductHistory, saveProductToHistory } from '../utils/storage';
import { Plus, Trash2, Box, Info, Search, Database } from 'lucide-react';
import kohlerCatalog from '../data/products.json';
import aquantCatalog from '../data/aquant_products.json';

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

    useEffect(() => {
        setHistory(getProductHistory());
    }, []);

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
                                setGlobalSearch(e.target.value);
                                setShowGlobalSuggestions(true);
                            }}
                            onFocus={() => setShowGlobalSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowGlobalSuggestions(false), 200)}
                        />
                    </div>
                    {showGlobalSuggestions && (globalSearch.length > 1) && (
                        <div className="suggestions-dropdown glass-premium" style={{ maxHeight: '400px' }}>
                            {activeBrand === 'KOHLER' ? (
                                <>
                                    {[
                                        { title: 'Smart Toilets & Bidets', keywords: ['Toilet', 'Bidet', 'Cleansing', 'PureWash', 'C3-', 'Veil', 'Innate', 'Leap'] },
                                        { title: 'Faucets & Fittings', keywords: ['Faucet', 'Tap', 'Mixer', 'Handle', 'Spout'] },
                                        { title: 'Showers & Bath', keywords: ['Shower', 'Bath', 'Valve', 'Trim'] },
                                        { title: 'Other Products', keywords: [] }
                                    ].map((cat, catIdx) => {
                                        const filtered = kohlerCatalog.filter(c => {
                                            const matchCode = c.productCode?.toLowerCase() || '';
                                            const matchName = c.productName?.toLowerCase() || '';
                                            const searchLower = globalSearch.toLowerCase();
                                            const matchesSearch = matchCode.includes(searchLower) || matchName.includes(searchLower);
                                            if (!matchesSearch) return false;

                                            if (cat.keywords.length === 0) {
                                                // "Other" category: check if it doesn't match any other categories
                                                const matchesOtherCat = ['Toilet', 'Bidet', 'Faucet', 'Mixer', 'Shower', 'Bath'].some(k =>
                                                    c.productName.toLowerCase().includes(k.toLowerCase())
                                                );
                                                return !matchesOtherCat;
                                            }

                                            const searchTarget = matchName + ' ' + matchCode;
                                            return cat.keywords.some(k => searchTarget.includes(k.toLowerCase()));
                                        }).slice(0, 15);

                                        if (filtered.length === 0) return null;

                                        return (
                                            <div key={`cat-${catIdx}`}>
                                                <div className="p-2 bg-gray-50 text-[10px] font-bold text-muted uppercase flex items-center gap-1 border-b border-gray-100">
                                                    <Box size={10} /> {cat.title}
                                                </div>
                                                {filtered.map((c: any, i) => (
                                                    <div
                                                        key={`glob-${catIdx}-${i}`}
                                                        className="suggestion-item p-2 hover:bg-blue-50 cursor-pointer text-sm flex gap-3 items-center border-b border-gray-100"
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
                                                        {c.image ? (
                                                            <div className="w-10 h-10 min-w-[2.5rem] bg-white rounded border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                <img src={c.image} alt={c.productCode} className="w-full h-full object-contain" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 min-w-[2.5rem] bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-muted flex-shrink-0">
                                                                <Database size={14} />
                                                            </div>
                                                        )}
                                                        <div className="flex-grow min-w-0">
                                                            <div className="font-bold text-primary flex justify-between items-center text-xs">
                                                                <span className="truncate mr-2">{c.productCode}</span>
                                                                <span className="text-secondary flex-shrink-0">{formatCurrency(c.rate)}</span>
                                                            </div>
                                                            <div className="text-muted text-[10px] truncate">{c.productName}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                activeBrand === 'AQUANT' ? (
                                    <>
                                        {[
                                            { title: 'Stone & Concrete Basins', keywords: ['Basin', 'Concrete', 'Carrara', 'Marble'] },
                                            { title: 'Toilets', keywords: ['Toilet', 'WC', 'Urinal', 'Concealed'] },
                                            { title: 'Showers & Drains', keywords: ['Shower', 'Drain', 'Jet', 'Rain'] },
                                            { title: 'Mixers & Faucets', keywords: ['Mixer', 'Spout', 'Cock', 'Tap'] },
                                            { title: 'Other Products', keywords: [] }
                                        ].map((cat, catIdx) => {
                                            const filtered = aquantCatalog.filter(c => {
                                                const matchCode = c.productCode?.toLowerCase() || '';
                                                const matchName = c.productName?.toLowerCase() || '';
                                                const searchLower = globalSearch.toLowerCase();
                                                const matchesSearch = matchCode.includes(searchLower) || matchName.includes(searchLower);
                                                if (!matchesSearch) return false;

                                                if (cat.keywords.length === 0) {
                                                    const matchesOtherCat = ['Basin', 'Concrete', 'Carrara', 'Marble', 'Toilet', 'WC', 'Urinal', 'Concealed', 'Shower', 'Drain', 'Jet', 'Rain', 'Mixer', 'Spout', 'Cock', 'Tap'].some(k =>
                                                        (matchName + ' ' + matchCode).includes(k.toLowerCase())
                                                    );
                                                    return !matchesOtherCat;
                                                }

                                                return cat.keywords.some(k => (matchName + ' ' + matchCode).includes(k.toLowerCase()));
                                            }).slice(0, 15);

                                            if (filtered.length === 0) return null;

                                            return (
                                                <div key={`aq-cat-${catIdx}`}>
                                                    <div className="p-2 bg-gray-50 text-[10px] font-bold text-muted uppercase flex items-center gap-1 border-b border-gray-100">
                                                        <Box size={10} /> {cat.title}
                                                    </div>
                                                    {filtered.map((c: any, i) => (
                                                        <div
                                                            key={`glob-aq-${catIdx}-${i}`}
                                                            className="suggestion-item p-2 hover:bg-blue-50 cursor-pointer text-sm flex gap-3 items-center border-b border-gray-100"
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
                                                            {c.image ? (
                                                                <div className="w-10 h-10 min-w-[2.5rem] bg-white rounded border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                    <img src={c.image} alt={c.productCode} className="w-full h-full object-contain" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-10 h-10 min-w-[2.5rem] bg-gray-50 rounded border border-gray-100 flex items-center justify-center text-muted flex-shrink-0">
                                                                    <Database size={14} />
                                                                </div>
                                                            )}
                                                            <div className="flex-grow min-w-0">
                                                                <div className="font-bold text-primary flex justify-between items-center text-xs">
                                                                    <span className="truncate mr-2">{c.productCode}</span>
                                                                    <span className="text-secondary flex-shrink-0">{formatCurrency(c.rate)}</span>
                                                                </div>
                                                                <div className="text-muted text-[10px] truncate">{c.productName}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <div className="p-8 text-center text-muted">
                                        <Box size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-bold">AQUANT Catalog Empty</p>
                                        <p className="text-xs">No products currently loaded for Aquant Brand.</p>
                                    </div>
                                )
                            )}
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
                            <th style={{ width: '13%', padding: '0.4rem 0.3rem' }}>CODE</th>
                            <th style={{ width: '25%', padding: '0.4rem 0.3rem' }}>PRODUCT NAME</th>
                            <th style={{ width: '9%', padding: '0.4rem 0.3rem' }}>SIZE</th>
                            <th style={{ width: '9%', padding: '0.4rem 0.3rem' }}>COLOR</th>
                            <th className="text-center" style={{ width: '6%', padding: '0.4rem 0.3rem' }}>QTY</th>
                            <th className="text-center" style={{ width: '9%', padding: '0.4rem 0.3rem' }}>RATE</th>
                            <th className="text-center" style={{ width: '6%', padding: '0.4rem 0.3rem' }}>DISC</th>
                            <th className="text-right" style={{ width: '11%', padding: '0.4rem 0.3rem' }}>AMOUNT</th>
                            <th className="text-center" style={{ width: '3%', padding: '0.4rem 0.3rem' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center p-6 text-muted">
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
                                        <div className="suggestions-dropdown glass-premium" style={{ right: '-150px', minWidth: '380px' }}>
                                            {history.filter(h =>
                                                h.productCode?.toLowerCase().includes(product.productCode.toLowerCase()) ||
                                                h.productName?.toLowerCase().includes(product.productName.toLowerCase())
                                            ).length > 0 && (
                                                    <div className="p-2 bg-gray-50 text-xs font-bold text-muted uppercase flex items-center gap-1">
                                                        <Box size={10} /> Recent Items
                                                    </div>
                                                )}
                                            {history
                                                .filter(h => h.productCode?.toLowerCase().includes(product.productCode.toLowerCase()) || h.productName?.toLowerCase().includes(product.productName.toLowerCase()))
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
                                                            const catCode = c.productCode?.toLowerCase() || '';
                                                            const catName = c.productName?.toLowerCase() || '';
                                                            const pCode = product.productCode?.toLowerCase() || '';
                                                            const pName = product.productName?.toLowerCase() || '';
                                                            return catCode.includes(pCode) || catName.includes(pName);
                                                        })
                                                        .slice(0, 15)
                                                        .map((c: any, i) => (
                                                            <div
                                                                key={`cat-${i}`}
                                                                className="suggestion-item p-2 hover:bg-blue-50 cursor-pointer text-sm flex gap-3 items-center"
                                                                style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                                onClick={() => handleSelectSuggestion(product.id, c)}
                                                            >
                                                                {c.image ? (
                                                                    <div className="w-12 h-12 min-w-[3rem] bg-white rounded border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                        <img src={c.image} alt={c.productCode} className="w-full h-full object-contain" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-12 h-12 min-w-[3rem] bg-blue-50 rounded border border-blue-100 flex items-center justify-center text-primary-light flex-shrink-0">
                                                                        <Database size={16} />
                                                                    </div>
                                                                )}
                                                                <div className="flex-grow">
                                                                    <div className="font-bold text-primary flex justify-between">
                                                                        <span>{c.productCode}</span>
                                                                        <span className="text-secondary font-bold">{formatCurrency(c.rate)}</span>
                                                                    </div>
                                                                    <div className="text-muted text-xs line-clamp-2">{c.productName}</div>
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
