'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from 'antd';

import { useDocumentContext } from '../../../context/DocumentContext';

// Default empty structures
const emptyInvoice = {
  invoiceId: '', currencyCode: 'MYR', invoiceDate: '', dueDate: '',
  purchaseOrder: '', paymentTerm: '',
  vendorName: '', vendorAddress: '', vendorTaxId: '',
  customerName: '', customerId: '', customerAddress: '', customerTaxId: '',
  billingAddress: '', shippingAddress: '',
  subTotal: null as number | null, totalDiscount: null as number | null,
  totalTax: null as number | null, invoiceTotal: null as number | null,
  amountDue: null as number | null, previousUnpaidBalance: null as number | null,
  serviceStartDate: '', serviceEndDate: '',
};

const emptyReceipt = {
  merchantName: '', merchantPhone: '', merchantAddress: '',
  transactionDate: '', transactionTime: '', receiptType: '',
  countryRegion: '', currencyCode: 'MYR',
  subtotal: null as number | null, totalTax: null as number | null,
  tip: null as number | null, total: null as number | null,
  arrivalDate: '', departureDate: '', balance: null as number | null,
};

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'invoice';
  const isInvoice = type === 'invoice';

  // State
  const [invForm, setInvForm] = useState({ ...emptyInvoice });
  const [invItems, setInvItems] = useState<any[]>([]);
  const [rcpForm, setRcpForm] = useState({ ...emptyReceipt });
  const [rcpItems, setRcpItems] = useState<any[]>([]);
  const [rcpPayments, setRcpPayments] = useState<any[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadedFile } = useDocumentContext();

  // Load extraction result from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('extractionResult');
    if (!raw) return;

    try {
      const result = JSON.parse(raw);
      setConfidence(result.confidence ?? 0);
      setFileName(result.fileName ?? '');
      const d = result.data;

      if (result.docType === 'invoice') {
        setInvForm({
          invoiceId: d.invoiceId ?? '',
          currencyCode: d.currencyCode ?? 'MYR',
          invoiceDate: d.invoiceDate ?? '',
          dueDate: d.dueDate ?? '',
          purchaseOrder: d.purchaseOrder ?? '',
          paymentTerm: d.paymentTerm ?? '',
          vendorName: d.vendorName ?? '',
          vendorAddress: d.vendorAddress ?? '',
          vendorTaxId: d.vendorTaxId ?? '',
          customerName: d.customerName ?? '',
          customerId: d.customerId ?? '',
          customerAddress: d.customerAddress ?? '',
          customerTaxId: d.customerTaxId ?? '',
          billingAddress: d.billingAddress ?? '',
          shippingAddress: d.shippingAddress ?? '',
          subTotal: d.subTotal,
          totalDiscount: d.totalDiscount,
          totalTax: d.totalTax,
          invoiceTotal: d.invoiceTotal,
          amountDue: d.amountDue,
          previousUnpaidBalance: d.previousUnpaidBalance,
          serviceStartDate: d.serviceStartDate ?? '',
          serviceEndDate: d.serviceEndDate ?? '',
        });
        setInvItems(d.lineItems ?? []);
      } else {
        setRcpForm({
          merchantName: d.merchantName ?? '',
          merchantPhone: d.merchantPhone ?? '',
          merchantAddress: d.merchantAddress ?? '',
          transactionDate: d.transactionDate ?? '',
          transactionTime: d.transactionTime ?? '',
          receiptType: d.receiptType ?? '',
          countryRegion: d.countryRegion ?? '',
          currencyCode: d.currencyCode ?? 'MYR',
          subtotal: d.subtotal,
          totalTax: d.totalTax,
          tip: d.tip,
          total: d.total,
          arrivalDate: d.arrivalDate ?? '',
          departureDate: d.departureDate ?? '',
          balance: d.balance,
        });
        setRcpItems(d.lineItems ?? []);
        setRcpPayments(d.payments ?? []);
      }
    } catch (e) {
      console.error('Failed to parse extraction result:', e);
    }
  }, []);

  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('docType', type);

        const metadata = isInvoice ? { ...invForm, lineItems: invItems } : { ...rcpForm, lineItems: rcpItems, payments: rcpPayments };
        formData.append('metadata', JSON.stringify(metadata));

        const res = await fetch('/api/submit', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) {
          alert(json.error || 'Failed to submit document');
          setIsSubmitting(false);
          return;
        }

        console.log('Submission successful:', json);
      } else {
        console.warn('No uploaded file found in context to submit.');
      }

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        sessionStorage.removeItem('extractionResult');
        router.push(isInvoice ? '/dashboard/invoices' : '/dashboard/receipts');
      }, 2000);
    } catch (err) {
      console.error('Error submitting document:', err);
      alert('Network error while submitting');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="review-header">
        <div>
          <button className="review-back btn btn-outline-light ms-0 ps-0" onClick={() => router.push('/dashboard/add')}>
            <i className="bi bi-arrow-left" />Back
          </button>
          <h1 className="review-title mt-3">Review extracted {type}</h1>
          <p className="review-subtitle">
            {fileName || 'uploaded file'} · edit any field before submitting
          </p>
        </div>
        <div className="review-actions">
          <span className="confidence-badge">
            <i className="bi bi-stars" /> Confidence {confidence}%
          </span>
          <button className='btn btn-dark btn-sm d-flex align-items-center gap-2' onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <i className="bi bi-database" />}
            <span>{isSubmitting ? 'Submitting...' : 'Submit to Fabric'}</span>
          </button>
        </div>
      </div>

      <div className="review-body">
        {/* Left — Form */}
        <div className="review-form-card">
          {isInvoice ? (
            <>
              {/* DOCUMENT SECTION */}
              <div className="review-section-title fw-bold fs-6">Document</div>
              <div className="review-form-grid">
                <div className="form-field">
                  <label>Invoice number</label>
                  <input value={invForm.invoiceId} onChange={(e) => setInvForm({ ...invForm, invoiceId: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <input value={invForm.currencyCode} onChange={(e) => setInvForm({ ...invForm, currencyCode: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Invoice date</label>
                  <input value={invForm.invoiceDate} onChange={(e) => setInvForm({ ...invForm, invoiceDate: e.target.value })} placeholder="DD/MM/YYYY" />
                </div>
                <div className="form-field">
                  <label>Due date</label>
                  <input value={invForm.dueDate} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} placeholder="DD/MM/YYYY" />
                </div>
                <div className="form-field">
                  <label>Purchase order</label>
                  <input value={invForm.purchaseOrder} onChange={(e) => setInvForm({ ...invForm, purchaseOrder: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Payment term</label>
                  <input value={invForm.paymentTerm} onChange={(e) => setInvForm({ ...invForm, paymentTerm: e.target.value })} placeholder="Not detected" />
                </div>
              </div>

              <div className='border my-4'></div>

              {/* VENDOR SECTION */}
              <div className="review-section-title fw-bold fs-6">Vendor</div>
              <div className="review-form-grid">
                <div className="form-field">
                  <label>Vendor name</label>
                  <input value={invForm.vendorName} onChange={(e) => setInvForm({ ...invForm, vendorName: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Vendor address</label>
                  <input value={invForm.vendorAddress} onChange={(e) => setInvForm({ ...invForm, vendorAddress: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Vendor Tax ID</label>
                  <input value={invForm.vendorTaxId} onChange={(e) => setInvForm({ ...invForm, vendorTaxId: e.target.value })} placeholder="Not detected" />
                </div>
              </div>

              <div className='border my-3'></div>

              {/* CUSTOMER SECTION */}
              <div className="review-section-title fw-bold fs-6">Customer</div>
              <div className="review-form-grid">
                <div className="form-field">
                  <label>Customer name</label>
                  <input value={invForm.customerName} onChange={(e) => setInvForm({ ...invForm, customerName: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Customer address</label>
                  <input value={invForm.customerAddress} onChange={(e) => setInvForm({ ...invForm, customerAddress: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Billing address</label>
                  <input value={invForm.billingAddress} onChange={(e) => setInvForm({ ...invForm, billingAddress: e.target.value })} placeholder="Not detected" />
                </div>
                <div className="form-field">
                  <label>Shipping address</label>
                  <input value={invForm.shippingAddress} onChange={(e) => setInvForm({ ...invForm, shippingAddress: e.target.value })} placeholder="Not detected" />
                </div>
              </div>

              <div className='border my-3'></div>

              {/* LINE ITEMS */}
              <div className="line-items-header">
                <h3 className='fw-bold fs-6'>Line Items</h3>
                <Button size="small" onClick={() => setInvItems([...invItems, { description: '', quantity: null, unitPrice: null, amount: null, productCode: '', unit: '', date: '', tax: null, taxRate: '' }])}>
                  + Add line
                </Button>
              </div>
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Description</th>
                    <th style={{ width: '10%' }}>Qty</th>
                    <th style={{ width: '15%' }}>Unit Price</th>
                    <th style={{ width: '15%' }}>Amount</th>
                    <th style={{ width: '10%' }}>Tax</th>
                    <th style={{ width: '5%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {invItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td><input value={item.description ?? ''} onChange={(e) => { const n = [...invItems]; n[idx] = { ...n[idx], description: e.target.value }; setInvItems(n); }} /></td>
                      <td><input type="number" value={item.quantity ?? ''} onChange={(e) => { const n = [...invItems]; n[idx] = { ...n[idx], quantity: Number(e.target.value) }; setInvItems(n); }} /></td>
                      <td><input type="number" step="0.01" value={item.unitPrice ?? ''} onChange={(e) => { const n = [...invItems]; n[idx] = { ...n[idx], unitPrice: Number(e.target.value) }; setInvItems(n); }} /></td>
                      <td><input type="number" step="0.01" value={item.amount ?? ''} onChange={(e) => { const n = [...invItems]; n[idx] = { ...n[idx], amount: Number(e.target.value) }; setInvItems(n); }} /></td>
                      <td><input type="number" step="0.01" value={item.tax ?? ''} onChange={(e) => { const n = [...invItems]; n[idx] = { ...n[idx], tax: Number(e.target.value) }; setInvItems(n); }} /></td>
                      <td><button className="line-items-delete" onClick={() => setInvItems(invItems.filter((_: any, i: number) => i !== idx))}><i className="bi bi-trash" /></button></td>
                    </tr>
                  ))}
                  {invItems.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#9ca3af' }}>No line items extracted. Click &quot;+ Add line&quot; to add manually.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <>
              {/* RECEIPT — DOCUMENT SECTION */}
              <div className="review-section-title fw-bold fs-6">Document</div>
              <div className="review-form-grid">
                <div className="form-field">
                  <label>Receipt type</label>
                  <input value={rcpForm.receiptType} onChange={(e) => setRcpForm({ ...rcpForm, receiptType: e.target.value })} placeholder='Not detected' />
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <input value={rcpForm.currencyCode} onChange={(e) => setRcpForm({ ...rcpForm, currencyCode: e.target.value })} placeholder='Not detected' />
                </div>
                <div className="form-field">
                  <label>Receipt date</label>
                  <input value={rcpForm.transactionDate} onChange={(e) => setRcpForm({ ...rcpForm, transactionDate: e.target.value })} placeholder="DD/MM/YYYY" />
                </div>
                <div className="form-field">
                  <label>Receipt time</label>
                  <input value={rcpForm.transactionTime} onChange={(e) => setRcpForm({ ...rcpForm, transactionTime: e.target.value })} placeholder='Not detected' />
                </div>
              </div>

              <div className='border my-4'></div>

              {/* MERCHANT SECTION */}
              <div className="review-section-title fw-bold fs-6">Merchant</div>
              <div className="review-form-grid">
                <div className="form-field">
                  <label>Merchant name</label>
                  <input value={rcpForm.merchantName} onChange={(e) => setRcpForm({ ...rcpForm, merchantName: e.target.value })} placeholder='Not detected' />
                </div>
                <div className="form-field">
                  <label>Merchant address</label>
                  <input value={rcpForm.merchantAddress} onChange={(e) => setRcpForm({ ...rcpForm, merchantAddress: e.target.value })} placeholder='Not detected' />
                </div>
                <div className="form-field">
                  <label>Merchant phone</label>
                  <input value={rcpForm.merchantPhone} onChange={(e) => setRcpForm({ ...rcpForm, merchantPhone: e.target.value })} placeholder='Not detected' />
                </div>
                <div className="form-field">
                  <label>Country / Region</label>
                  <input value={rcpForm.countryRegion} onChange={(e) => setRcpForm({ ...rcpForm, countryRegion: e.target.value })} placeholder='Not detected' />
                </div>
              </div>

              <div className='border my-4'></div>

              {/* PAYMENT SECTION */}
              {rcpPayments.length > 0 && (
                <>
                  <div className="review-section-title fw-bold fs-6">Payment</div>
                  <div className="review-form-grid">
                    {rcpPayments.map((p: any, i: number) => (
                      <div className="form-field" key={i}>
                        <label>Payment method {rcpPayments.length > 1 ? i + 1 : ''}</label>
                        <input value={p.method ?? ''} onChange={(e) => { const n = [...rcpPayments]; n[i] = { ...n[i], method: e.target.value }; setRcpPayments(n); }} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* LINE ITEMS */}
              <div className="line-items-header">
                <h3 className='fw-bold fs-6'>Line Items</h3>
                <Button size="small" onClick={() => setRcpItems([...rcpItems, { description: '', quantity: null, price: null, totalPrice: null, productCode: '', quantityUnit: '' }])}>
                  + Add line
                </Button>
              </div>
              <table className="line-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Description</th>
                    <th style={{ width: '12%' }}>Qty</th>
                    <th style={{ width: '18%' }}>Unit Price</th>
                    <th style={{ width: '18%' }}>Amount</th>
                    <th style={{ width: '5%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rcpItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td><input value={item.description ?? ''} onChange={(e) => { const n = [...rcpItems]; n[idx] = { ...n[idx], description: e.target.value }; setRcpItems(n); }} /></td>
                      <td><input type="number" value={item.quantity ?? ''} onChange={(e) => { const n = [...rcpItems]; n[idx] = { ...n[idx], quantity: Number(e.target.value) }; setRcpItems(n); }} /></td>
                      <td><input type="number" step="0.01" value={item.price ?? ''} onChange={(e) => { const n = [...rcpItems]; n[idx] = { ...n[idx], price: Number(e.target.value) }; setRcpItems(n); }} /></td>
                      <td><input type="number" step="0.01" value={item.totalPrice ?? ''} onChange={(e) => { const n = [...rcpItems]; n[idx] = { ...n[idx], totalPrice: Number(e.target.value) }; setRcpItems(n); }} /></td>
                      <td><button className="line-items-delete" onClick={() => setRcpItems(rcpItems.filter((_: any, i: number) => i !== idx))}><i className="bi bi-trash" /></button></td>
                    </tr>
                  ))}
                  {rcpItems.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16, color: '#9ca3af' }}>No line items extracted. Click &quot;+ Add line&quot; to add manually.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Right — Totals Card */}
        <div className="totals-card">
          <div className="totals-title">Totals</div>
          {isInvoice ? (
            <>
              <div className="totals-row">
                <span className="label">Subtotal</span>
                <span className="value d-flex align-items-center gap-1">
                  <span>{invForm.currencyCode}</span>
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                    value={invForm.subTotal ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const newSub = val;
                      const disc = invForm.totalDiscount ?? 0;
                      const tax = invForm.totalTax ?? 0;
                      const newTotal = newSub !== null ? newSub - disc + tax : null;
                      setInvForm({ ...invForm, subTotal: newSub, invoiceTotal: newTotal, amountDue: newTotal });
                    }}
                  />
                </span>
              </div>
              <div className="totals-row">
                <span className="label">Discount</span>
                <span className="value d-flex align-items-center gap-1">
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                    value={invForm.totalDiscount ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const sub = invForm.subTotal ?? 0;
                      const tax = invForm.totalTax ?? 0;
                      const newTotal = sub - (val ?? 0) + tax;
                      setInvForm({ ...invForm, totalDiscount: val, invoiceTotal: newTotal, amountDue: newTotal });
                    }}
                  />
                </span>
              </div>
              <div className="totals-row">
                <span className="label">Tax</span>
                <span className="value d-flex align-items-center gap-1">
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                    value={invForm.totalTax ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const sub = invForm.subTotal ?? 0;
                      const disc = invForm.totalDiscount ?? 0;
                      const newTotal = sub - disc + (val ?? 0);
                      setInvForm({ ...invForm, totalTax: val, invoiceTotal: newTotal, amountDue: newTotal });
                    }}
                  />
                </span>
              </div>
              <div className="totals-row total-main mt-3 pt-3 border-top">
                <span className="label fw-bold">Total</span>
                <span className="value d-flex align-items-center gap-1 fw-bold fs-5">
                  <span>{invForm.currencyCode}</span>
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end fw-bold"
                    style={{ width: '110px', fontSize: '1.1rem' }}
                    value={invForm.invoiceTotal ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      setInvForm({ ...invForm, invoiceTotal: val, amountDue: val });
                    }}
                  />
                </span>
              </div>
              <div className="totals-row" style={{ marginTop: 8 }}>
                <span className="label">Amount Due</span>
                <span className="value d-flex align-items-center gap-1">
                  <span>{invForm.currencyCode}</span>
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                    value={invForm.amountDue ?? ''}
                    placeholder="0.00"
                    onChange={(e) => setInvForm({ ...invForm, amountDue: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="totals-row">
                <span className="label">Subtotal</span>
                <span className="value d-flex align-items-center gap-1">
                  <span>{rcpForm.currencyCode}</span>
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                    value={rcpForm.subtotal ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const tax = rcpForm.totalTax ?? 0;
                      const tip = rcpForm.tip ?? 0;
                      const newTotal = val !== null ? val + tax + tip : null;
                      setRcpForm({ ...rcpForm, subtotal: val, total: newTotal });
                    }}
                  />
                </span>
              </div>
              <div className="totals-row">
                <span className="label">Tax</span>
                <span className="value d-flex align-items-center gap-1">
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end"
                    style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                    value={rcpForm.totalTax ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      const sub = rcpForm.subtotal ?? 0;
                      const tip = rcpForm.tip ?? 0;
                      const newTotal = sub + (val ?? 0) + tip;
                      setRcpForm({ ...rcpForm, totalTax: val, total: newTotal });
                    }}
                  />
                </span>
              </div>
              {rcpForm.tip !== null && rcpForm.tip !== undefined && rcpForm.tip > 0 && (
                <div className="totals-row">
                  <span className="label">Tip</span>
                  <span className="value d-flex align-items-center gap-1">
                    <input
                      type="number" step="0.01"
                      className="form-control form-control-sm text-end"
                      style={{ width: '100px', padding: '2px 6px', height: '28px' }}
                      value={rcpForm.tip ?? ''}
                      placeholder="0.00"
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        const sub = rcpForm.subtotal ?? 0;
                        const tax = rcpForm.totalTax ?? 0;
                        const newTotal = sub + tax + (val ?? 0);
                        setRcpForm({ ...rcpForm, tip: val, total: newTotal });
                      }}
                    />
                  </span>
                </div>
              )}
              <div className="totals-row total-main mt-3 pt-3 border-top">
                <span className="label fw-bold">Total</span>
                <span className="value d-flex align-items-center gap-1 fw-bold fs-5">
                  <span>{rcpForm.currencyCode}</span>
                  <input
                    type="number" step="0.01"
                    className="form-control form-control-sm text-end fw-bold"
                    style={{ width: '110px', fontSize: '1.1rem' }}
                    value={rcpForm.total ?? ''}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      setRcpForm({ ...rcpForm, total: val });
                    }}
                  />
                </span>
              </div>
            </>
          )}

          {/* Destination */}
          <div className="destination-section">
            <div className="destination-title">Destination</div>
            <div className="destination-item">
              <i className="bi bi-database" style={{ color: '#6366f1' }} />
              Fabric Lakehouse · {isInvoice ? 'bronze.invoices_raw' : 'bronze.receipts_raw'}
            </div>
            <div className="destination-item">
              <i className="bi bi-folder" style={{ color: '#f59e0b' }} />
              Azure Blob · /{isInvoice ? 'invoices' : 'receipts'}/2026/
            </div>
            <div className="destination-item">
              <i className="bi bi-folder" style={{ color: '#f59e0b' }} />
              SharePoint · {isInvoice ? 'Invoices Library' : 'Expenses Library'}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="toast">
          <i className="bi bi-check-circle-fill toast-icon" />
          <div>
            <h4>Extraction complete</h4>
            <p>Confidence {confidence}%</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewContent />
    </Suspense>
  );
}
