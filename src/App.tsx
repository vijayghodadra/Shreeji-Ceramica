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
  const [activeBrand, setActiveBrand] = useState<'KOHLER' | 'AQUANT' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'NEW_QUOTE' | 'SAVED_QUOTES'>('NEW_QUOTE');
  const [discountMode, setDiscountMode] = useState<DiscountMode>('INDIVIDUAL');
  const [commonDiscountPercentage, setCommonDiscountPercentage] = useState<number>(0);
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState<number>(0);
  const [currentQuoteNumber, setCurrentQuoteNumber] = useState<number | undefined>(undefined);
  const [currentQuoteId, setCurrentQuoteId] = useState<string>(crypto.randomUUID());
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
    if (includeGST) {
      if (!customer.gstNumber || customer.gstNumber.trim() === '') {
        alert("Please enter a GST Number when 'Apply GST' is checked.");
        return false;
      }
      // Basic Regex for Indian GSTIN (15 characters alphanumeric)
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(customer.gstNumber.trim().toUpperCase())) {
        alert("Please enter a valid 15-character GSTIN Number (e.g. 22AAAAA0000A1Z5).");
        return false;
      }
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
        totals
      });
    }
  };

  const handleSaveQuote = async () => {
    if (!validateQuote()) return;
    await autoSaveQuotation();
    alert('Quotation saved successfully to history!');
  };

  const handleViewPDF = async () => {
    if (!validateQuote()) return;
    await autoSaveQuotation();
    const url = await getPDFBlobUrl(customer, products, discountMode, discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount, includeGST, gstPercentage, currentQuoteNumber);
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  const handleDownloadFromPreview = async () => {
    if (!validateQuote()) return;
    await autoSaveQuotation();
    await generatePDF(customer, products, discountMode, discountMode === 'COMMON' ? commonDiscountPercentage : globalDiscountAmount, includeGST, gstPercentage, currentQuoteNumber);
  };

  if (!activeBrand) {
    return <WelcomeScreen onBrandSelect={setActiveBrand} />;
  }

  return (
    <div className={`app-container ${activeBrand.toLowerCase()} theme-${theme}`}>
      <Header
        onMenuClick={() => setIsSidebarOpen(true)}
        activeBrand={activeBrand}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

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
                />
              </div>
            </div>

            <aside className="sidebar flex flex-col gap-4">
              <SummaryTotals
                totals={totals}
                includeGST={includeGST}
                gstPercentage={gstPercentage}
              />

              <div className="panel glass-panel text-xs text-muted animate-fade-in-up stagger-4 animate-hover-lift">
                <h3 className="font-bold text-primary mb-1">Quick Tips</h3>
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
