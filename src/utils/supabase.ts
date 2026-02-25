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
