export interface ProductDetails {
  id: string; // Unique row ID
  productCode: string;
  productName: string;
  image?: string; // Path to image
  productImage?: string; // Base64 string from input type file
  size: string;
  color: string;
  quantity: number;
  rate: number; // Price per item
  discountPercentage: number; // Discount applied to this specific product (if per-product discounting)
  discountAmount: number; // Computed discount amount
  amountBeforeDiscount: number;
  finalAmount: number; // after individual discount
  room?: string; // Room segment (e.g. "Master Bathroom", "Guest Bathroom")
}

export interface CustomerDetails {
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
}

export interface QuoteCalculations {
  grossSubtotal: number; // Sum of rate * quantity for all products
  totalItemDiscountAmount: number; // Sum of individual product discounts
  subtotal: number; // Sum of finalAmount of all products (Gross - Item Discounts)
  globalDiscountPercentage: number; // Optional additional global discount
  globalDiscountAmount: number;
  effectiveDiscountPercentage: number; // (totalItemDiscountAmount + globalDiscountAmount) / grossSubtotal * 100
  taxableAmount: number; // subtotal - globalDiscountAmount
  cgstAmount: number; // 9%
  sgstAmount: number; // 9%
  totalGstAmount: number; // 18% of taxableAmount
  grandTotal: number; // taxableAmount + totalGstAmount
}

export type DiscountMode = 'INDIVIDUAL' | 'COMMON' | 'GLOBAL';

export interface SavedQuotation {
  id: string;
  quoteNumber?: number;
  createdAt: string;
  customer: CustomerDetails;
  products: ProductDetails[];
  brand: 'KOHLER' | 'AQUANT';
  includeGST: boolean;
  gstPercentage: number;
  discountMode: DiscountMode;
  commonDiscountPercentage: number;
  globalDiscountAmount: number;
  totals: QuoteCalculations;
  preparedBy?: string;
  status?: 'CREATED' | 'PREPARED' | 'FINALIZED';
}
