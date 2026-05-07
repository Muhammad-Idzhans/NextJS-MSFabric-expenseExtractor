// ========================================
// Invoice Types (prebuilt-invoice fields)
// ========================================
export interface InvoiceLineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  productCode: string;
  unit: string;
  date: string;
  tax: number | null;
  taxRate: string;
}

export interface PaymentDetail {
  iban: string;
  swift: string;
  bankAccountNumber: string;
}

export interface TaxDetail {
  amount: number | null;
  rate: string;
  netAmount?: number | null;
  description?: string;
}

export interface Invoice {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  updatedAt?: string;
  // Vendor
  vendorName: string;
  vendorAddress: string;
  vendorTaxId: string;
  // Customer
  customerName: string;
  customerId: string;
  customerAddress: string;
  customerTaxId: string;
  // Addresses
  billingAddress: string;
  shippingAddress: string;
  // Invoice metadata
  invoiceId: string;
  invoiceDate: string;
  dueDate: string;
  purchaseOrder: string;
  paymentTerm: string;
  // Financials
  subTotal: number | null;
  totalDiscount: number | null;
  totalTax: number | null;
  invoiceTotal: number | null;
  amountDue: number | null;
  previousUnpaidBalance: number | null;
  currencyCode: string;
  // Service period
  serviceStartDate: string;
  serviceEndDate: string;
  // Arrays
  lineItems: InvoiceLineItem[];
  paymentDetails: PaymentDetail[];
  taxDetails: TaxDetail[];
  // App metadata
  status: 'Synced' | 'Pending' | 'Error';
  confidence: number;
}

// ========================================
// Receipt Types (prebuilt-receipt fields)
// ========================================
export interface ReceiptLineItem {
  description: string;
  quantity: number | null;
  price: number | null;
  totalPrice: number | null;
  productCode: string;
  quantityUnit: string;
}

export interface PaymentMethod {
  method: string;
  amount: number | null;
}

export interface Receipt {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  updatedAt?: string;
  // Merchant
  merchantName: string;
  merchantPhone: string;
  merchantAddress: string;
  // Transaction
  transactionDate: string;
  transactionTime: string;
  receiptType: string;
  countryRegion: string;
  // Financials
  subtotal: number | null;
  totalTax: number | null;
  tip: number | null;
  total: number | null;
  currencyCode: string;
  // Hotel-specific
  arrivalDate?: string;
  departureDate?: string;
  balance?: number | null;
  // Arrays
  lineItems: ReceiptLineItem[];
  payments: PaymentMethod[];
  taxDetails: TaxDetail[];
  // App metadata
  status: 'Synced' | 'Pending' | 'Error';
  confidence: number;
  category: string;
}
