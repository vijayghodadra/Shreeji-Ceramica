import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Falling back to LocalStorage only.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Uploads a PDF blob to Supabase Storage and returns the public URL
 */
export const uploadPDF = async (blob: Blob, fileName: string): Promise<string | null> => {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase.storage
            .from('quotations')
            .upload(fileName, blob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('quotations')
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (error) {
        console.error('CRITICAL: Supabase Upload Error:', error);
        // We still return null so the UI knows it failed
        return null;
    }
};

/**
 * Performs a semantic search for products using local FAISS engine
 */
export const semanticSearch = async (query: string, brand: string): Promise<any[]> => {
    if (query.length < 3) return [];

    try {
        const response = await fetch(`http://localhost:5001/search?q=${encodeURIComponent(query)}&brand=${brand.toUpperCase()}`);
        if (!response.ok) throw new Error("Local Search Engine not responding");
        
        const data = await response.json();
        return data.map((item: any) => ({
             productCode: item.productCode,
             productName: item.productName,
             rate: item.rate,
             image: item.image,
             size: item.size,
             color: item.color,
             similarity: item.similarity
        }));
    } catch (err) {
        console.error('Local Search Engine Error:', err);
        // Fallback or retry logic could go here
        return [];
    }
};



