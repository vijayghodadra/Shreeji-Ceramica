import { Menu, Sun, Moon } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
    activeBrand?: 'KOHLER' | 'AQUANT' | null;
    theme?: 'light' | 'dark';
    onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, activeBrand, theme, onToggleTheme }) => {
    return (
        <header className="app-header">
            <div className="flex justify-between items-center w-full px-4">
                <div className="flex items-center gap-4">
                    <button
                        className="menu-btn p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-primary transition-colors"
                        onClick={onMenuClick}
                        title="Switch Brand"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="brand flex items-center gap-3">
                        <img src="/logo.png" alt="Shreeji Ceramica" className="hidden sm:block" style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
                        <h1 className="flex items-center gap-3">
                            <span>Shreeji <span className="brand-accent">Ceramica</span></span>

                            {activeBrand && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600 text-3xl font-light leading-none">|</span>
                                    <span className={`px-4 py-1.5 rounded-lg border-2 text-xl font-bold tracking-wider shadow-sm
                                        ${activeBrand === 'KOHLER'
                                            ? 'bg-black text-white border-black'
                                            : 'bg-[#3498DB] text-white border-[#3498DB]'}`}>
                                        {activeBrand}
                                    </span>
                                </>
                            )}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={onToggleTheme}
                        className="p-2.5 rounded-xl bg-surface border border-border shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? (
                            <Moon size={20} className="text-primary animate-in fade-in zoom-in duration-500" />
                        ) : (
                            <Sun size={20} className="text-secondary animate-in fade-in spin-in-90 duration-500" />
                        )}
                    </button>

                    <div className="header-meta text-muted text-sm text-right mobile-hide border-l border-border pl-6">
                        <div className="font-bold text-primary">Quotation Portal</div>
                        <div>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    </div>
                </div>
            </div>
        </header>
    );
};
