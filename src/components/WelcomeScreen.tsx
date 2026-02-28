import { LiquidUnlockSlider } from './LiquidUnlockSlider';

interface WelcomeScreenProps {
    onBrandSelect: (brand: 'KOHLER' | 'AQUANT') => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onBrandSelect }) => {
    return (
        <div className="welcome-screen">
            <div className="welcome-background">
                <div className="glass-blob blob-1"></div>
                <div className="glass-blob blob-2"></div>
                <div className="glass-blob blob-3"></div>
            </div>

            <div className="welcome-container">
                <div className="welcome-glass-panel liquid-glass liquid-float-animation reveal-on-scroll visible">
                    <header className="welcome-header">
                        <div className="welcome-logo">
                            <img src="/logo.png" alt="Shreeji Ceramica" className="animate-pulse" />
                        </div>
                        <div className="header-brand">
                            <span className="brand-name tracking-tight">SHREEJI <span className="text-secondary font-black">CERAMICA</span></span>
                        </div>
                        <p className="welcome-tagline italic opacity-80">Flowing with Premium Design • Since 2024</p>
                    </header>

                    <main className="welcome-selection">
                        <div className="selection-header mb-4">
                            <h2 className="text-xl font-bold">Begin Your Design Journey</h2>
                            <p className="text-muted text-sm">Select a brand to flow through our exquisite collections</p>
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                            {/* KOHLER Slider */}
                            <div className="welcome-slider-wrapper kohler-wrapper">
                                <div className="brand-info text-center mb-3">
                                    <h3 className="text-2xl font-bold tracking-tight">KOHLER</h3>
                                    <p className="text-xs text-muted uppercase tracking-widest font-semibold">GLOBAL LUXURY</p>
                                </div>
                                <LiquidUnlockSlider
                                    text="Slide to Unlock Kohler"
                                    thumbGradient="linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)"
                                    textGradient="linear-gradient(90deg, #1d1d1f 0%, #334155 100%)"
                                    trackBackground="rgba(255, 255, 255, 0.5)"
                                    onUnlock={() => onBrandSelect('KOHLER')}
                                />
                            </div>

                            {/* AQUANT Slider */}
                            <div className="welcome-slider-wrapper aquant-wrapper mt-2">
                                <div className="brand-info text-center mb-3">
                                    <h3 className="text-2xl font-bold tracking-tight">AQUANT</h3>
                                    <p className="text-xs text-muted uppercase tracking-widest font-semibold">MODERN FLUIDITY</p>
                                </div>
                                <LiquidUnlockSlider
                                    text="Slide to Unlock Aquant"
                                    thumbGradient="var(--liquid-gradient)"
                                    textGradient="linear-gradient(90deg, #1d1d1f 0%, #0071e3 100%)"
                                    trackBackground="rgba(0, 113, 227, 0.05)"
                                    onUnlock={() => onBrandSelect('AQUANT')}
                                />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};
