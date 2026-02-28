import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CatalogViewerModal } from './CatalogViewerModal';
import { LiquidUnlockSlider } from './LiquidUnlockSlider';

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
    const [currentBgIndex, setCurrentBgIndex] = useState(0);

    const backgroundImages = [
        '/aquant_hero_bg.png',
        '/kohler_hero_bg.png'
    ];

    useEffect(() => {
        // Staggered entrance animation effect
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const bgTimer = setInterval(() => {
            setCurrentBgIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 5000);
        return () => clearInterval(bgTimer);
    }, [backgroundImages.length]);

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

    // Scroll Reveal Logic
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [isVisible]);

    return (
        <div className={`dashboard-container dashboard-page-bg ${isVisible ? 'visible' : ''}`}>
            {/* Hero Section */}
            <section className="dashboard-hero">
                <div className="hero-background-slider">
                    {backgroundImages.map((bg, index) => (
                        <div
                            key={bg}
                            className={`hero-bg-slide ${index === currentBgIndex ? 'active' : ''}`}
                            style={{ backgroundImage: `url(${bg})` }}
                        />
                    ))}
                </div>
                <div className="hero-content liquid-glass liquid-float-animation">
                    {/* Integrated Logo for perfect cinematic centering */}
                    <div className="flex justify-center mb-8">
                        <img src="/logo.png" alt="Shreeji Ceramica" className="h-20 drop-shadow-2xl bg-white/90 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/20" />
                    </div>
                    <h1 className="hero-title reveal-on-scroll font-black tracking-tighter">Elevate Your Space</h1>
                    <p className="hero-subtitle reveal-on-scroll font-medium opacity-80">
                        Premium architectural solutions combining breathtaking design with uncompromising fluid performance.
                    </p>
                    <div className="hero-actions reveal-on-scroll flex flex-col items-center gap-6 mt-8">
                        <div className="w-full max-w-sm">
                            <LiquidUnlockSlider onUnlock={onStartConfigurator} />
                        </div>
                        <div className="brand-shortcuts">
                            <button className="liquid-button liquid-secondary" onClick={() => scrollToSection('kohler-section')}>KOHLER</button>
                            <button className="liquid-button liquid-secondary" onClick={() => scrollToSection('aquant-section')}>AQUANT</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Kohler Categories Section */}
            <section id="kohler-section" className="dashboard-categories-section py-20">
                <div className="section-header mb-12">
                    <h2 className="section-title text-4xl font-black">KOHLER <span className="text-primary/50">COLLECTIONS</span></h2>
                    <p className="section-description font-medium text-muted max-w-2xl">Discover Kohler's finest luxury sanitaryware & fittings tailored for your next fluid project</p>
                </div>

                <div className="dashboard-category-grid">
                    {kohlerCategories.map((category, index) => (
                        <div
                            key={category.id}
                            className="dashboard-category-card liquid-glass reveal-on-scroll hover:rotate-1"
                            style={{ transitionDelay: `${index * 50}ms` }}
                        >
                            <div className="category-image-wrapper !rounded-t-3xl overflow-hidden">
                                <img src={category.image} alt={category.name} className="category-image hover:scale-110 transition-transform duration-700" loading="lazy" />
                                <div className="category-overlay bg-gradient-to-t from-black/60 to-transparent"></div>
                            </div>
                            <div className="category-content p-6">
                                <h3 className="category-name text-lg font-bold">{category.name}</h3>
                                <button
                                    onClick={() => openPdf(KOHLER_PDF, `Kohler - ${category.name}`, category.page)}
                                    className="liquid-button !bg-transparent !text-primary !p-0 !shadow-none hover:!translate-x-2"
                                >
                                    Explore <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Aquant Categories Section */}
            <section id="aquant-section" className="dashboard-categories-section py-20 rounded-[4rem]">
                <div className="section-header mb-12">
                    <h2 className="section-title text-4xl font-black">AQUANT <span className="text-primary/50">COLLECTIONS</span></h2>
                    <p className="section-description font-medium text-muted max-w-2xl">Explore Aquant's contemporary and elegant bathroom solutions flowing with modern design</p>
                </div>

                <div className="dashboard-category-grid">
                    {aquantCategories.map((category, index) => (
                        <div
                            key={category.id}
                            className="dashboard-category-card liquid-glass reveal-on-scroll hover:-rotate-1"
                            style={{ transitionDelay: `${index * 50}ms` }}
                        >
                            <div className="category-image-wrapper !rounded-t-3xl overflow-hidden">
                                <img src={category.image} alt={category.name} className="category-image hover:scale-110 transition-transform duration-700" loading="lazy" />
                                <div className="category-overlay bg-gradient-to-t from-primary/40 to-transparent"></div>
                            </div>
                            <div className="category-content p-6">
                                <h3 className="category-name text-lg font-bold">{category.name}</h3>
                                <button
                                    onClick={() => openPdf(AQUANT_PDF, `Aquant - ${category.name}`, category.page)}
                                    className="liquid-button !bg-transparent !text-primary !p-0 !shadow-none hover:!translate-x-2"
                                >
                                    Explore <ChevronRight size={16} />
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
