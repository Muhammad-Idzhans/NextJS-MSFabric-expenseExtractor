import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
  AnalyzeResultOutput,
  DocumentFieldOutput,
  AnalyzeDocumentFromStream202Response,
  AnalyzeDocumentFromStreamDefaultResponse,
} from '@azure-rest/ai-document-intelligence';
import { AzureKeyCredential } from '@azure/core-auth';

// ── helpers ────────────────────────────────────────────────────────
function getClient() {
  const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT!;
  const key = process.env.DOCUMENT_INTELLIGENCE_KEY!;
  return DocumentIntelligence(endpoint, new AzureKeyCredential(key));
}

/** Convert a date string (whatever DI returns) → DD/MM/YYYY */
function formatDate(raw: string | undefined | null): string {
  if (!raw) return '';
  // DI returns dates as YYYY-MM-DD
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function currencyValue(field: DocumentFieldOutput | undefined): number | null {
  if (!field) return null;
  if (field.type === 'currency') return (field as any).valueCurrency?.amount ?? null;
  if (field.type === 'number') return (field as any).valueNumber ?? null;
  return null;
}

function stringValue(field: DocumentFieldOutput | undefined): string {
  if (!field) return '';
  if (field.type === 'string') return (field as any).valueString ?? '';
  if (field.type === 'phoneNumber') return (field as any).valuePhoneNumber ?? '';
  if (field.type === 'countryRegion') return (field as any).valueCountryRegion ?? '';
  if (field.type === 'address') {
    const a = (field as any).valueAddress;
    if (!a) return (field as any).content ?? '';
    return [a.streetAddress, a.city, a.state, a.postalCode, a.countryRegion]
      .filter(Boolean)
      .join(', ');
  }
  return (field as any).content ?? '';
}

function dateValue(field: DocumentFieldOutput | undefined): string {
  if (!field) return '';
  return formatDate((field as any).valueDate ?? (field as any).content ?? '');
}

function timeValue(field: DocumentFieldOutput | undefined): string {
  if (!field) return '';
  return (field as any).valueTime ?? (field as any).content ?? '';
}

function numberValue(field: DocumentFieldOutput | undefined): number | null {
  if (!field) return null;
  if (field.type === 'number') return (field as any).valueNumber ?? null;
  return null;
}

// ── Invoice extraction ─────────────────────────────────────────────
function mapInvoiceFields(fields: Record<string, DocumentFieldOutput>) {
  const lineItems = (fields.Items as any)?.valueArray?.map((item: any) => {
    const f = item.valueObject ?? {};
    return {
      description: stringValue(f.Description),
      quantity: numberValue(f.Quantity),
      unitPrice: currencyValue(f.UnitPrice),
      amount: currencyValue(f.Amount),
      productCode: stringValue(f.ProductCode),
      unit: stringValue(f.Unit),
      date: dateValue(f.Date),
      tax: currencyValue(f.Tax),
      taxRate: stringValue(f.TaxRate),
    };
  }) ?? [];

  const paymentDetails = (fields.PaymentDetails as any)?.valueArray?.map((item: any) => {
    const f = item.valueObject ?? {};
    return {
      iban: stringValue(f.IBAN),
      swift: stringValue(f.SWIFT),
      bankAccountNumber: stringValue(f.BankAccountNumber),
    };
  }) ?? [];

  const taxDetails = (fields.TaxDetails as any)?.valueArray?.map((item: any) => {
    const f = item.valueObject ?? {};
    return {
      amount: currencyValue(f.Amount),
      rate: stringValue(f.Rate),
    };
  }) ?? [];

  return {
    // Vendor
    vendorName: stringValue(fields.VendorName),
    vendorAddress: stringValue(fields.VendorAddress),
    vendorTaxId: stringValue(fields.VendorTaxId),
    // Customer
    customerName: stringValue(fields.CustomerName),
    customerId: stringValue(fields.CustomerId),
    customerAddress: stringValue(fields.CustomerAddress),
    customerTaxId: stringValue(fields.CustomerTaxId),
    // Addresses
    billingAddress: stringValue(fields.BillingAddress),
    billingAddressRecipient: stringValue(fields.BillingAddressRecipient),
    shippingAddress: stringValue(fields.ShippingAddress),
    shippingAddressRecipient: stringValue(fields.ShippingAddressRecipient),
    // Invoice metadata
    invoiceId: stringValue(fields.InvoiceId),
    invoiceDate: dateValue(fields.InvoiceDate),
    dueDate: dateValue(fields.DueDate),
    purchaseOrder: stringValue(fields.PurchaseOrder),
    paymentTerm: stringValue(fields.PaymentTerm),
    // Financials
    subTotal: currencyValue(fields.SubTotal),
    totalDiscount: currencyValue(fields.TotalDiscount),
    totalTax: currencyValue(fields.TotalTax),
    invoiceTotal: currencyValue(fields.InvoiceTotal),
    amountDue: currencyValue(fields.AmountDue),
    previousUnpaidBalance: currencyValue(fields.PreviousUnpaidBalance),
    currencyCode: (fields.InvoiceTotal as any)?.valueCurrency?.currencyCode
      ?? (fields.SubTotal as any)?.valueCurrency?.currencyCode
      ?? 'MYR',
    // Service period
    serviceStartDate: dateValue(fields.ServiceStartDate),
    serviceEndDate: dateValue(fields.ServiceEndDate),
    // Arrays
    lineItems,
    paymentDetails,
    taxDetails,
    // NOTE: KVKNumber intentionally excluded (Netherlands-only)
  };
}

// ── Receipt extraction ─────────────────────────────────────────────
function mapReceiptFields(fields: Record<string, DocumentFieldOutput>) {
  const lineItems = (fields.Items as any)?.valueArray?.map((item: any) => {
    const f = item.valueObject ?? {};
    return {
      description: stringValue(f.Description),
      quantity: numberValue(f.Quantity),
      price: currencyValue(f.Price),
      totalPrice: currencyValue(f.TotalPrice),
      productCode: stringValue(f.ProductCode),
      quantityUnit: stringValue(f.QuantityUnit),
    };
  }) ?? [];

  const payments = (fields.Payments as any)?.valueArray?.map((item: any) => {
    const f = item.valueObject ?? {};
    return {
      method: stringValue(f.Method),
      amount: currencyValue(f.Amount),
    };
  }) ?? [];

  const taxDetails = (fields.TaxDetails as any)?.valueArray?.map((item: any) => {
    const f = item.valueObject ?? {};
    return {
      amount: currencyValue(f.Amount),
      rate: stringValue(f.Rate),
      netAmount: currencyValue(f.NetAmount),
      description: stringValue(f.Description),
    };
  }) ?? [];

  return {
    // Merchant
    merchantName: stringValue(fields.MerchantName),
    merchantPhone: stringValue(fields.MerchantPhoneNumber),
    merchantAddress: stringValue(fields.MerchantAddress),
    // Transaction
    transactionDate: dateValue(fields.TransactionDate),
    transactionTime: timeValue(fields.TransactionTime),
    receiptType: stringValue(fields.ReceiptType),
    countryRegion: stringValue(fields.CountryRegion),
    // Financials
    subtotal: currencyValue(fields.Subtotal),
    totalTax: currencyValue(fields.TotalTax),
    tip: currencyValue(fields.Tip),
    total: currencyValue(fields.Total),
    currencyCode: (fields.Total as any)?.valueCurrency?.currencyCode
      ?? (fields.Subtotal as any)?.valueCurrency?.currencyCode
      ?? 'MYR',
    // Hotel-specific
    arrivalDate: dateValue(fields.ArrivalDate),
    departureDate: dateValue(fields.DepartureDate),
    balance: currencyValue(fields.Balance),
    // Arrays
    lineItems,
    payments,
    taxDetails,
  };
}

// ── Route Handler ──────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const docType = formData.get('docType') as string; // 'invoice' | 'receipt'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!['invoice', 'receipt'].includes(docType)) {
      return Response.json({ error: 'Invalid docType. Must be "invoice" or "receipt"' }, { status: 400 });
    }

    const client = getClient();
    const modelId = docType === 'invoice' ? 'prebuilt-invoice' : 'prebuilt-receipt';

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Start analysis
    const initialResponse = await client
      .path('/documentModels/{modelId}:analyze', modelId)
      .post({
        contentType: 'application/json',
        body: {
          base64Source: base64,
        },
      });

    if (isUnexpected(initialResponse)) {
      console.error('Analyze failed:', initialResponse.body);
      return Response.json(
        { error: 'Document analysis failed', details: initialResponse.body },
        { status: 500 }
      );
    }

    // Poll until done
    const poller = getLongRunningPoller(
      client,
      initialResponse as AnalyzeDocumentFromStream202Response | AnalyzeDocumentFromStreamDefaultResponse
    );
    const result = await poller.pollUntilDone();
    const analyzeResult: AnalyzeResultOutput = (result as any).body.analyzeResult;

    if (!analyzeResult?.documents?.length) {
      return Response.json(
        { error: 'No documents found in the uploaded file' },
        { status: 422 }
      );
    }

    const doc = analyzeResult.documents[0];
    const fields = doc.fields as Record<string, DocumentFieldOutput>;
    const confidence = Math.round((doc.confidence ?? 0) * 100);

    let extractedData;
    if (docType === 'invoice') {
      extractedData = mapInvoiceFields(fields);
    } else {
      extractedData = mapReceiptFields(fields);
    }

    return Response.json({
      success: true,
      docType,
      confidence,
      data: extractedData,
      fileName: file.name,
    });
  } catch (err: any) {
    console.error('Extraction error:', err);
    return Response.json(
      { error: 'Internal extraction error', message: err.message },
      { status: 500 }
    );
  }
}
