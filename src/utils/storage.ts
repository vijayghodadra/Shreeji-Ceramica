import type { SavedQuotation, CustomerDetails, ProductDetails } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
    RECENT_CUSTOMERS: 'shreeji_recent_customers',
    RECENT_PRODUCTS: 'shreeji_recent_products',
    QUOTATION_COUNTER: 'shreeji_quote_counter',
    SAVED_QUOTATIONS: 'shreeji_saved_quotations',
};

export const getNextQuotationNumber = async (): Promise<number> => {
    // If Supabase is available, try to get the max quote number from the cloud
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select('quoteNumber')
                .order('quoteNumber', { ascending: false })
                .limit(1);

            if (!error && data && data.length > 0) {
                const next = (data[0].quoteNumber || 0) + 1;
                localStorage.setItem(STORAGE_KEYS.QUOTATION_COUNTER, next.toString());
                return next;
            }
        } catch (e) {
            console.error("Failed to fetch next quote number from cloud", e);
        }
    }

    const current = localStorage.getItem(STORAGE_KEYS.QUOTATION_COUNTER);
    const next = current ? parseInt(current, 10) + 1 : 1;
    localStorage.setItem(STORAGE_KEYS.QUOTATION_COUNTER, next.toString());
    return next;
};

export const getCurrentQuotationCounter = (): number => {
    const current = localStorage.getItem(STORAGE_KEYS.QUOTATION_COUNTER);
    return current ? parseInt(current, 10) : 0;
};

const MAX_SUGGESTIONS = 10;

export const saveCustomerToHistory = (customer: CustomerDetails) => {
    if (!customer.customerName && !customer.companyName) return;

    const existingStr = localStorage.getItem(STORAGE_KEYS.RECENT_CUSTOMERS);
    let customers: CustomerDetails[] = existingStr ? JSON.parse(existingStr) : [];

    // Remove if exists to push to front
    customers = customers.filter(
        (c) => c.customerName !== customer.customerName || c.phone !== customer.phone
    );

    customers.unshift(customer);

    if (customers.length > MAX_SUGGESTIONS) {
        customers = customers.slice(0, MAX_SUGGESTIONS);
    }

    localStorage.setItem(STORAGE_KEYS.RECENT_CUSTOMERS, JSON.stringify(customers));
};

export const getCustomerHistory = (): CustomerDetails[] => {
    const existingStr = localStorage.getItem(STORAGE_KEYS.RECENT_CUSTOMERS);
    return existingStr ? JSON.parse(existingStr) : [];
};

export const saveProductToHistory = (product: ProductDetails) => {
    if (!product.productCode && !product.productName) return;

    const existingStr = localStorage.getItem(STORAGE_KEYS.RECENT_PRODUCTS);
    let products: Partial<ProductDetails>[] = existingStr ? JSON.parse(existingStr) : [];

    products = products.filter(
        (p) => p.productCode !== product.productCode || p.productName !== product.productName
    );

    // Only save reusable fields
    const productToSave: Partial<ProductDetails> = {
        productCode: product.productCode,
        productName: product.productName,
        size: product.size,
        color: product.color,
        rate: product.rate,
    };

    products.unshift(productToSave);

    if (products.length > MAX_SUGGESTIONS * 2) {
        products = products.slice(0, MAX_SUGGESTIONS * 2);
    }

    localStorage.setItem(STORAGE_KEYS.RECENT_PRODUCTS, JSON.stringify(products));
};

export const getProductHistory = (): Partial<ProductDetails>[] => {
    const existingStr = localStorage.getItem(STORAGE_KEYS.RECENT_PRODUCTS);
    return existingStr ? JSON.parse(existingStr) : [];
};

export const getSavedQuotations = (): SavedQuotation[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_QUOTATIONS);
    return saved ? JSON.parse(saved) : [];
};

export const saveQuotation = async (quotation: SavedQuotation) => {
    const saved = getSavedQuotations();
    const index = saved.findIndex(q => q.id === quotation.id);

    if (index >= 0) {
        saved[index] = quotation;
    } else {
        saved.push(quotation);
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_QUOTATIONS, JSON.stringify(saved));
    saveCustomerToHistory(quotation.customer);

    // Sync to Supabase
    if (supabase) {
        try {
            const { error } = await supabase
                .from('quotations')
                .upsert({
                    id: quotation.id,
                    quoteNumber: quotation.quoteNumber,
                    brand: quotation.brand,
                    includeGST: quotation.includeGST,
                    gstPercentage: quotation.gstPercentage,
                    discountMode: quotation.discountMode,
                    commonDiscountPercentage: quotation.commonDiscountPercentage,
                    globalDiscountAmount: quotation.globalDiscountAmount,
                    customer: quotation.customer,
                    products: quotation.products,
                    totals: quotation.totals,
                    createdAt: quotation.createdAt,
                    preparedBy: quotation.preparedBy,
                    status: quotation.status || 'CREATED'
                });
            if (error) throw error;
        } catch (e) {
            console.error("Supabase Sync Failed:", e);
        }
    }
};

export const syncQuotationsFromCloud = async (): Promise<SavedQuotation[]> => {
    if (!supabase) return getSavedQuotations();

    try {
        const { data, error } = await supabase
            .from('quotations')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;

        if (data) {
            const formatted: SavedQuotation[] = data.map(item => ({
                id: item.id,
                quoteNumber: item.quoteNumber,
                createdAt: item.createdAt,
                customer: item.customer,
                products: item.products,
                brand: item.brand,
                includeGST: item.includeGST,
                gstPercentage: item.gstPercentage,
                discountMode: item.discountMode,
                commonDiscountPercentage: item.commonDiscountPercentage,
                globalDiscountAmount: item.globalDiscountAmount,
                totals: item.totals,
                preparedBy: item.preparedBy,
                status: item.status || 'CREATED'
            }));

            localStorage.setItem(STORAGE_KEYS.SAVED_QUOTATIONS, JSON.stringify(formatted));
            return formatted;
        }
    } catch (e) {
        console.error("Cloud Sync Failed:", e);
    }
    return getSavedQuotations();
};

export const deleteQuotation = async (id: string) => {
    const saved = getSavedQuotations();
    const filtered = saved.filter(q => q.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_QUOTATIONS, JSON.stringify(filtered));

    if (supabase) {
        try {
            const { error } = await supabase
                .from('quotations')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error("Cloud Delete Failed:", e);
        }
    }
};

export const deleteHistoricalQuotations = async (phone: string) => {
    const saved = getSavedQuotations();
    const filtered = saved.filter(q => q.customer.phone !== phone);
    localStorage.setItem(STORAGE_KEYS.SAVED_QUOTATIONS, JSON.stringify(filtered));

    if (supabase) {
        try {
            const { error } = await supabase
                .from('quotations')
                .delete()
                .filter('customer->>phone', 'eq', phone);
            if (error) throw error;
        } catch (error) {
            console.error("Historical Deletion Failed:", error);
        }
    }
};

export const updateQuotationStatus = async (id: string, status: 'CREATED' | 'PREPARED' | 'FINALIZED') => {
    let saved = getSavedQuotations();
    const index = saved.findIndex(q => q.id === id);
    if (index === -1) return;

    saved[index] = { ...saved[index], status };
    localStorage.setItem(STORAGE_KEYS.SAVED_QUOTATIONS, JSON.stringify(saved));

    if (supabase) {
        try {
            await supabase
                .from('quotations')
                .update({ status })
                .eq('id', id);
        } catch (e) {
            console.error("Supabase Status Update Failed:", e);
        }
    }
};
