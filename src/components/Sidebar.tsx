import React from 'react';
import { Box, FileText, PlusCircle, LayoutDashboard } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    activeBrand: 'KOHLER' | 'AQUANT';
    onBrandSelect: (brand: 'KOHLER' | 'AQUANT') => void;
    currentView: 'NEW_QUOTE' | 'SAVED_QUOTES';
    onViewChange: (view: 'NEW_QUOTE' | 'SAVED_QUOTES') => void;
    onGoToDashboard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen, activeBrand, onBrandSelect, currentView, onViewChange, onGoToDashboard
}) => {
    const [width, setWidth] = React.useState(300);
    const [isResizing, setIsResizing] = React.useState(false);
    const sidebarRef = React.useRef<HTMLDivElement>(null);
    const isResizingRef = React.useRef(false);

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
        isResizingRef.current = true;
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
        isResizingRef.current = false;
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizingRef.current && sidebarRef.current) {
                const newWidth = mouseMoveEvent.clientX;
                if (newWidth > 240 && newWidth < 600) {
                    setWidth(newWidth);
                }
            }
        },
        []
    );

    React.useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <>
            {/* Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
                onClick={() => onBrandSelect(activeBrand)}
            />

            <aside
                ref={sidebarRef}
                className={`sidebar glass-premium ${isOpen ? 'open' : ''} ${isResizing ? 'resizing' : ''}`}
                style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
            >
                <div className="sidebar-resizer" onMouseDown={startResizing}>
                    <div className="resizer-handle" />
                </div>

                <div className="sidebar-header">
                    <div className="sidebar-logo-container">
                        <img
                            src="logo.png"
                            alt="Shreeji Ceramica"
                            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
                            className="sidebar-logo"
                        />
                    </div>
                </div>

                <div className="sidebar-content">
                    <div className="sidebar-section">
                        <div className="section-label">Navigation</div>
                        <nav className="sidebar-nav">
                            <button className="nav-item" onClick={onGoToDashboard}>
                                <LayoutDashboard size={18} />
                                <span>Dashboard</span>
                            </button>
                            <button
                                className={`nav-item ${currentView === 'NEW_QUOTE' ? 'active' : ''}`}
                                onClick={() => onViewChange('NEW_QUOTE')}
                            >
                                <PlusCircle size={18} />
                                <span>Create Quote</span>
                            </button>
                            <button
                                className={`nav-item ${currentView === 'SAVED_QUOTES' ? 'active' : ''}`}
                                onClick={() => onViewChange('SAVED_QUOTES')}
                            >
                                <FileText size={18} />
                                <span>Saved Quotations</span>
                            </button>
                        </nav>
                    </div>

                    <div className="sidebar-section">
                        <div className="section-label">Brands</div>
                        <div className="brand-selectors">
                            <button
                                className={`brand-item ${activeBrand === 'KOHLER' ? 'active' : ''}`}
                                onClick={() => onBrandSelect('KOHLER')}
                            >
                                <div className="brand-dot bg-secondary"></div>
                                <span>KOHLER</span>
                            </button>
                            <button
                                className={`brand-item ${activeBrand === 'AQUANT' ? 'active' : ''}`}
                                onClick={() => onBrandSelect('AQUANT')}
                            >
                                <div className="brand-dot bg-secondary"></div>
                                <span>AQUANT</span>
                            </button>
                        </div>
                    </div>

                    <div className="catalog-status-panel glass-surface">
                        <div className="status-header">
                            <Box size={14} />
                            <span>Catalog Ready</span>
                        </div>
                        <p>Categories update automatically based on selection.</p>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <p>SHREEJI CERAMICA © 2026</p>
                </div>
            </aside>
        </>
    );
};
