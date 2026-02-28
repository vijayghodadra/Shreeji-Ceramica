import React from 'react';
import { X, Download, Edit3 } from 'lucide-react';

interface PdfPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string;
    onDownload: () => void;
    onEdit: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
    isOpen,
    onClose,
    pdfUrl,
    onDownload,
    onEdit
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-container glass-premium">
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="modal-title-area">
                        <h2>Quotation Preview</h2>
                        <p>Review your document before sending</p>
                    </div>
                    <div className="modal-actions">
                        <button
                            onClick={onEdit}
                            className="btn btn-secondary"
                            style={{ padding: '0.6rem 1.2rem' }}
                        >
                            <Edit3 size={18} /> Edit Quotation
                        </button>
                        <button
                            onClick={onDownload}
                            className="btn btn-primary"
                            style={{ padding: '0.6rem 1.2rem' }}
                        >
                            <Download size={18} /> Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="close-button"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* PDF Content */}
                <div className="modal-content">
                    <iframe
                        src={pdfUrl}
                        className="pdf-iframe"
                        title="PDF Preview"
                    />
                </div>

                {/* Footer Tip */}
                <div className="modal-footer-tip">
                    Tip: You can return to edit mode anytime to update product details or quantities.
                </div>
            </div>
        </div>
    );
};
