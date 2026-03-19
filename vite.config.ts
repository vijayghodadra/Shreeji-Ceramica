import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-pdf';
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/quotations': {
        target: 'https://xmtprcnmslamfzjnuejc.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/quotations/, '/storage/v1/object/public/quotations')
      }
    }
  },
  preview: {
    allowedHosts: true
  }
})
