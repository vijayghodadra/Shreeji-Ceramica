import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Unlock } from 'lucide-react';

interface LiquidUnlockSliderProps {
    onUnlock: () => void;
    text?: string;
    thumbGradient?: string;
    textGradient?: string;
    trackBackground?: string;
}

export const LiquidUnlockSlider: React.FC<LiquidUnlockSliderProps> = ({
    onUnlock,
    text = 'Slide to Start Quotation',
    thumbGradient = 'var(--liquid-gradient)',
    textGradient = 'linear-gradient(90deg, #1d1d1f 0%, #86868b 100%)',
    trackBackground = 'rgba(255, 255, 255, 0.3)'
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragX, setDragX] = useState(0);
    const [isUnlocked, setIsUnlocked] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef(0);
    const maxDragRef = useRef(0);

    const updateMaxDrag = useCallback(() => {
        if (containerRef.current && thumbRef.current) {
            // Total padding is 8px (4px each side)
            maxDragRef.current = containerRef.current.offsetWidth - thumbRef.current.offsetWidth - 8;
        }
    }, []);

    useEffect(() => {
        updateMaxDrag();
        window.addEventListener('resize', updateMaxDrag);
        return () => window.removeEventListener('resize', updateMaxDrag);
    }, [updateMaxDrag]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isUnlocked) return;
        setIsDragging(true);
        startXRef.current = e.clientX - dragX;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || isUnlocked) return;

        let newX = e.clientX - startXRef.current;

        if (newX < 0) newX = 0;
        if (newX > maxDragRef.current) newX = maxDragRef.current;

        setDragX(newX);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging || isUnlocked) return;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (dragX >= maxDragRef.current * 0.85) { // 85% threshold
            // Unlocked!
            setDragX(maxDragRef.current);
            setIsUnlocked(true);
            setTimeout(() => {
                onUnlock();
                // Reset after a delay in case they come back to the page
                setTimeout(() => {
                    setIsUnlocked(false);
                    setDragX(0);
                }, 1000);
            }, 400); // Wait for smooth slide to end
        } else {
            // Snap back
            setDragX(0);
        }
    };

    const thumbStyle = {
        transform: `translateX(${dragX}px)`,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: isUnlocked ? 'var(--color-success)' : thumbGradient,
    };

    const textOpacity = maxDragRef.current > 0 ? Math.max(0, 1 - (dragX / (maxDragRef.current * 0.5))) : 1;

    return (
        <div
            className="unlock-slider-container liquid-glass"
            ref={containerRef}
            style={{ touchAction: 'none', background: trackBackground }}
        >
            <div
                className="unlock-slider-text"
                style={{ opacity: textOpacity }}
            >
                <span className="slider-text-gradient" style={{ background: textGradient, WebkitBackgroundClip: 'text' }}>
                    {isUnlocked ? 'Unlocked!' : text}
                </span>
            </div>

            <div
                className={`unlock-slider-thumb ${isDragging ? 'grabbing' : 'grab'} ${isUnlocked ? 'unlocked' : ''}`}
                ref={thumbRef}
                style={thumbStyle}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {isUnlocked ? (
                    <Unlock size={20} className="text-white" />
                ) : (
                    <ArrowRight size={20} className={`text-white ${isDragging ? '' : 'animate-pulse'}`} />
                )}
            </div>
        </div>
    );
};
