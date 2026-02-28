import React from 'react';
import { Menu, Sun, Moon, MapPin } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
    activeBrand?: 'KOHLER' | 'AQUANT' | null;
    theme?: 'light' | 'dark';
    onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onMenuClick,
    activeBrand,
    theme,
    onToggleTheme
}) => {
    return (
        <header className="header glass-surface">
            <div className="header-container">
                <div className="header-left">
                    <button
                        className="menu-toggle animate-hover-lift"
                        onClick={onMenuClick}
                        aria-label="Toggle Menu"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="header-brand flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="Shreeji Ceramica"
                            style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                            className="drop-shadow-sm"
                        />
                        <span className="brand-name tracking-tight hidden sm:inline-block">SHREEJI <span className="text-secondary font-black">CERAMICA</span></span>
                    </div>
                    {activeBrand && (
                        <div className="header-badge-wrapper reveal-on-scroll visible">
                            <div className="badge-divider"></div>
                            <span className={`brand-badge ${activeBrand.toLowerCase()}`}>
                                {activeBrand}
                            </span>
                        </div>
                    )}
                </div>

                <div className="header-right">
                    <div className="location-tag">
                        <MapPin size={14} className="text-secondary" />
                        <span>Vadodara</span>
                    </div>

                    <div className="header-actions">
                        <button
                            onClick={onToggleTheme}
                            className="theme-toggle glass-premium animate-hover-lift"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        <div className="portal-indicator mobile-hide">
                            <div className="indicator-dot pulse"></div>
                            <span>Live Portal</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
