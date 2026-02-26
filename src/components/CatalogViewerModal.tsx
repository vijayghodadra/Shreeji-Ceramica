import React from 'react';
import { X } from 'lucide-react';

interface CatalogViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    title: string;
}

export const CatalogViewerModal: React.FC<CatalogViewerModalProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    title
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container catalog-modal">
                <div className="modal-header">
                    <div className="modal-title-area">
                        <h2>{title}</h2>
                    </div>
                    <div className="modal-actions">
                        <button onClick={onClose} className="close-button">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="modal-content">
                    <iframe
                        src={pdfUrl}
                        className="pdf-iframe"
                        title={title}
                    />
                </div>
            </div>
        </div>
    );
};
