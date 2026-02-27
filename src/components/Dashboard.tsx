import React, { useEffect, useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { CatalogViewerModal } from './CatalogViewerModal';

interface Category {
    id: string;
    name: string;
    image: string;
    page: number;
}

const CACHE_BUSTER = "?v=2";

const kohlerCategories: Category[] = [
    { id: 'toilets', name: 'Toilets', image: `/catalog/dashboard_categories/toilets.jpg${CACHE_BUSTER}`, page: 4 },
    { id: 'mirrors', name: 'Mirrors', image: `/catalog/dashboard_categories/mirrors.jpg${CACHE_BUSTER}`, page: 18 },
    { id: 'wash-basins', name: 'Wash Basins', image: `/catalog/dashboard_categories/wash_basins.jpg${CACHE_BUSTER}`, page: 30 },
    { id: 'showering', name: 'Showering', image: `/catalog/dashboard_categories/showering.jpg${CACHE_BUSTER}`, page: 54 },
    { id: 'fittings', name: 'Fittings', image: `/catalog/dashboard_categories/fittings.jpg${CACHE_BUSTER}`, page: 84 },
    { id: 'vibrant-finishes', name: 'Vibrant Finishes', image: `/catalog/dashboard_categories/vibrant_finishes.jpg${CACHE_BUSTER}`, page: 92 },
    { id: 'kitchen-sinks', name: 'Kitchen Sinks & Faucets', image: `/catalog/dashboard_categories/kitchen_sinks.jpg${CACHE_BUSTER}`, page: 146 },
    { id: 'bathtubs', name: 'Bathtubs & Bath Fillers', image: `/catalog/dashboard_categories/bathtubs.jpg${CACHE_BUSTER}`, page: 154 },
    { id: 'commercial', name: 'Commercial Products', image: `/catalog/dashboard_categories/commercial.jpg${CACHE_BUSTER}`, page: 158 }
];

const aquantCategories: Category[] = [
    { id: 'aq-wash-basins', name: 'Wash Basins', image: `/catalog/aquant_images/1001.jpg`, page: 4 },
    { id: 'aq-toilets', name: 'Toilets', image: `/catalog/aquant_images/7004_BG.jpg`, page: 27 },
    { id: 'aq-showers', name: 'Showers & Wellness', image: `/catalog/aquant_images/9001.jpg`, page: 44 },
    { id: 'aq-faucets', name: 'Faucets', image: `/catalog/aquant_images/2005.jpg`, page: 32 }
];

const KOHLER_PDF = "/Kohler_PriceBook_Nov'25 Edition.pdf";
const AQUANT_PDF = "/Aquant Price List Vol. 14 Feb. 2025 - Low Res Searchable.pdf";

interface DashboardProps {
    onStartConfigurator: () => void;
    onBrandSelect: (brand: 'KOHLER' | 'AQUANT') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartConfigurator }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [previewPdfId, setPreviewPdfId] = useState<{ url: string; title: string } | null>(null);

    useEffect(() => {
        // Staggered entrance animation effect
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const openPdf = (pdfBaseUrl: string, title: string, page: number) => {
        setPreviewPdfId({
            url: `${pdfBaseUrl}#page=${page}`,
            title: title
        });
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className={`dashboard-container ${isVisible ? 'visible' : ''}`}>
            {/* Hero Section */}
            <section className="dashboard-hero">
                <div className="hero-content">
                    <h1 className="hero-title">Elevate Your Space</h1>
                    <p className="hero-subtitle">
                        Premium architectural solutions combining breathtaking design with uncompromising performance.
                    </p>
                    <div className="hero-actions">
                        <button className="btn btn-primary" onClick={onStartConfigurator}>
                            Start Quotation <ArrowRight size={18} />
                        </button>
                        <div className="brand-shortcuts">
                            <button className="brand-btn kohler-btn" onClick={() => scrollToSection('kohler-section')}>KOHLER</button>
                            <button className="brand-btn aquant-btn" onClick={() => scrollToSection('aquant-section')}>AQUANT</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Kohler Categories Section */}
            <section id="kohler-section" className="dashboard-categories-section">
                <div className="section-header">
                    <h2 className="section-title">Kohler Collections</h2>
                    <p className="section-description">Discover Kohler's finest sanitaryware & fittings tailored for your next project</p>
                </div>

                <div className="dashboard-category-grid">
                    {kohlerCategories.map((category, index) => (
                        <div
                            key={category.id}
                            className="dashboard-category-card"
                            style={{ transitionDelay: `${index * 50}ms` }}
                        >
                            <div className="category-image-wrapper">
                                <img src={category.image} alt={category.name} className="category-image" loading="lazy" />
                                <div className="category-overlay"></div>
                            </div>
                            <div className="category-content">
                                <h3 className="category-name">{category.name}</h3>
                                <button
                                    onClick={() => openPdf(KOHLER_PDF, `Kohler - ${category.name}`, category.page)}
                                    className="category-view-link"
                                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', outline: 'inherit' }}
                                >
                                    View Details <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Aquant Categories Section */}
            <section id="aquant-section" className="dashboard-categories-section">
                <div className="section-header">
                    <h2 className="section-title">Aquant Collections</h2>
                    <p className="section-description">Explore Aquant's contemporary and elegant bathroom solutions</p>
                </div>

                <div className="dashboard-category-grid">
                    {aquantCategories.map((category, index) => (
                        <div
                            key={category.id}
                            className="dashboard-category-card"
                            style={{ transitionDelay: `${index * 50}ms` }}
                        >
                            <div className="category-image-wrapper">
                                <img src={category.image} alt={category.name} className="category-image" loading="lazy" />
                                <div className="category-overlay"></div>
                            </div>
                            <div className="category-content">
                                <h3 className="category-name">{category.name}</h3>
                                <button
                                    onClick={() => openPdf(AQUANT_PDF, `Aquant - ${category.name}`, category.page)}
                                    className="category-view-link"
                                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', outline: 'inherit' }}
                                >
                                    View Details <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <CatalogViewerModal
                isOpen={previewPdfId !== null}
                onClose={() => setPreviewPdfId(null)}
                pdfUrl={previewPdfId?.url || ''}
                title={previewPdfId?.title || ''}
            />
        </div>
    );
};
