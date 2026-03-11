// Deployment Trigger: 2026-02-26 16:10
import { useState } from 'react';
import type { CustomerDetails, ProductDetails } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CustomerForm } from './components/CustomerForm';
import { ProductTableWithEffect as ProductTable } from './components/ProductTable';
import { SummaryTotals } from './components/SummaryTotals';
import { ActionPanel } from './components/ActionPanel';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { calculateQuoteTotals } from './utils/calculations';
import { getPDFBlobUrl, generatePDF } from './utils/pdfGenerator';
import { saveQuotation, getNextQuotationNumber } from './utils/storage';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SavedQuotationsList } from './components/SavedQuotationsList';
import { Dashboard } from './components/Dashboard';
import { RoomSummaryCard } from './components/RoomSummaryCard';
import type { DiscountMode } from './types';

function App() {
  const [customer, setCustomer] = useState<CustomerDetails>({
    customerName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
  });

  const [products, setProducts] = useState<ProductDetails[]>([]);
  const [includeGST, setIncludeGST] = useState<boolean>(true);
  const [gstPercentage, setGstPercentage] = useState<number>(18);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [currentRoute, setCurrentRoute] = useState<'DASHBOARD' | 'BRAND_SELECTION' | 'APP'>(() => {
    const path = window.location.pathname;
    if (path === '/app') return 'APP';
    // Always default to Dashboard (on '/', '/dashboard', or any unrecognised path)
    if (path !== '/dashboard') {
      window.history.replaceState(null, '', '/dashboard');
    }
    return 'DASHBOARD';
  });
  const [activeBrand, setActiveBrand] = useState<'KOHLER' | 'AQUANT' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'NEW_QUOTE' | 'SAVED_QUOTES'>('NEW_QUOTE');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('INDIVIDUAL');
  const [commonDiscountPercentage, setCommonDiscountPercentage] = useState<number>(0);
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState<number>(0);
  const [currentQuoteNumber, setCurrentQuoteNumber] = useState<number | undefined>(undefined);
  const [currentQuoteId, setCurrentQuoteId] = useState<string>(crypto.randomUUID());
  const [enableWatermark, setEnableWatermark] = useState<boolean>(true);
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useState(() => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleCustomerChange = (field: keyof CustomerDetails, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const totals = calculateQuoteTotals(
    products,
    discountMode,
    discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount,
    includeGST,
    gstPercentage
  );

  const validateQuote = () => {
    if (!customer.customerName.trim()) {
      alert("Please enter a Client Name before proceeding.");
      return false;
    }
    if (!customer.phone.trim()) {
      alert("Please enter a Phone Number before proceeding.");
      return false;
    }
    if (products.length === 0) {
      alert("Please add at least one product before proceeding.");
      return false;
    }
    return true;
  };

  const autoSaveQuotation = async () => {
    if (products.length > 0 && activeBrand) {
      let quoteNumber = currentQuoteNumber;
      if (!quoteNumber) {
        quoteNumber = await getNextQuotationNumber();
        setCurrentQuoteNumber(quoteNumber);
      }

      await saveQuotation({
        id: currentQuoteId,
        quoteNumber,
        createdAt: new Date().toISOString(),
        customer,
        products,
        brand: activeBrand,
        includeGST,
        gstPercentage,
        discountMode,
        commonDiscountPercentage,
        globalDiscountAmount,
        totals,
        preparedBy
      });
    }
  };

  const handleSaveQuote = async () => {
    if (!validateQuote()) return;
    await autoSaveQuotation();
    alert('Quotation saved successfully to history!');
  };

  const validatePreparedBy = () => {
    if (enableWatermark && !preparedBy) {
      alert('Please select a "Prepared By" name before generating the PDF (required when Watermark/Branding is ON).');
      return false;
    }
    return true;
  };

  const handleViewPDF = async () => {
    if (!validateQuote()) return;
    if (!validatePreparedBy()) return;
    await autoSaveQuotation();
    const url = await getPDFBlobUrl(customer, products, discountMode, discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount, includeGST, gstPercentage, currentQuoteNumber, enableWatermark, preparedBy);
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  const handleDownloadFromPreview = async () => {
    if (!validateQuote()) return;
    if (!validatePreparedBy()) return;
    await autoSaveQuotation();
    await generatePDF(customer, products, discountMode, discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount, includeGST, gstPercentage, currentQuoteNumber, enableWatermark, preparedBy);
  };

  if (currentRoute === 'DASHBOARD') {
    return (
      <Dashboard
        onStartConfigurator={() => setCurrentRoute('BRAND_SELECTION')}
        onBrandSelect={(brand) => {
          setActiveBrand(brand);
          setCurrentRoute('APP');
        }}
      />
    );
  }

  if (!activeBrand || currentRoute === 'BRAND_SELECTION') {
    return <WelcomeScreen onBrandSelect={(brand) => {
      setActiveBrand(brand);
      setCurrentRoute('APP');
    }} />;
  }

  return (
    <div className={`app-container ${activeBrand.toLowerCase()} theme-${theme}`}>
      <Header
        onMenuClick={() => setIsSidebarOpen(true)}
        activeBrand={activeBrand}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="app-header-spacer" />

      <Sidebar
        isOpen={isSidebarOpen}
        activeBrand={activeBrand}
        onBrandSelect={(brand) => {
          setActiveBrand(brand);
          setIsSidebarOpen(false);
          setCurrentView('NEW_QUOTE');
        }}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }}
        onGoToDashboard={() => {
          setCurrentRoute('DASHBOARD');
          setIsSidebarOpen(false);
        }}
      />

      <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)} />

      <main className="dashboard-grid">
        {currentView === 'SAVED_QUOTES' ? (
          <div className="col-span-full">
            <SavedQuotationsList
              onOpenQuotation={(quote) => {
                setCustomer(quote.customer);
                setProducts(quote.products);
                setActiveBrand(quote.brand);
                setIncludeGST(quote.includeGST);
                setGstPercentage(quote.gstPercentage || 18);
                setDiscountMode(quote.discountMode || 'INDIVIDUAL');
                setCommonDiscountPercentage(quote.commonDiscountPercentage || 0);
                setGlobalDiscountAmount(quote.globalDiscountAmount || 0);
                setCurrentQuoteNumber(quote.quoteNumber);
                setCurrentQuoteId(quote.id);
                if (quote.preparedBy) setPreparedBy(quote.preparedBy);
                setCurrentView('NEW_QUOTE');
              }}
            />
          </div>
        ) : (
          <>
            <div className="main-content">
              <div className="relative z-30 animate-fade-in-up stagger-1">
                <CustomerForm
                  customer={customer}
                  onChange={handleCustomerChange}
                  includeGST={includeGST}
                  onIncludeGSTChange={setIncludeGST}
                  gstPercentage={gstPercentage}
                  onGstPercentageChange={setGstPercentage}
                  preparedBy={preparedBy}
                  onPreparedByChange={setPreparedBy}
                />
              </div>

              <div className="relative z-20 animate-fade-in-up stagger-2">
                <ProductTable
                  products={products}
                  setProducts={setProducts}
                  activeBrand={activeBrand}
                  discountMode={discountMode}
                  commonDiscountPercentage={commonDiscountPercentage}
                />
              </div>

              <div className="relative z-10 animate-fade-in-up stagger-3">
                <ActionPanel
                  customer={customer}
                  products={products}
                  includeGST={includeGST}
                  gstPercentage={gstPercentage}
                  discountMode={discountMode}
                  onDiscountModeChange={setDiscountMode}
                  commonDiscountPercentage={commonDiscountPercentage}
                  onCommonDiscountChange={setCommonDiscountPercentage}
                  globalDiscountAmount={globalDiscountAmount}
                  onGlobalDiscountChange={setGlobalDiscountAmount}
                  onViewPDF={handleViewPDF}
                  onSaveQuote={handleSaveQuote}
                  enableWatermark={enableWatermark}
                  onEnableWatermarkChange={setEnableWatermark}
                />
              </div>
            </div>

            <aside className="sidebar flex flex-col gap-4">
              <SummaryTotals
                totals={totals}
                includeGST={includeGST}
                gstPercentage={gstPercentage}
              />

              <RoomSummaryCard
                products={products}
                includeGST={includeGST}
                gstPercentage={gstPercentage}
              />

              <div className="liquid-glass-warm text-xs text-muted animate-fade-in-up stagger-4 animate-hover-lift p-4">
                <h3 className="font-bold text-secondary mb-1 uppercase tracking-tight">Quick Tips</h3>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Enter client details to save to history.</li>
                  <li>Add products using the '+' button.</li>
                  <li>GST is applied after all discounts.</li>
                </ul>
              </div>
            </aside>
          </>
        )}
      </main>

      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={previewUrl}
        onEdit={() => setIsPreviewOpen(false)}
        onDownload={handleDownloadFromPreview}
      />
    </div>
  );
}

export default App;
