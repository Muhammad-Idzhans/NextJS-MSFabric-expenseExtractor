'use client';

import { useState, useEffect } from 'react';
import { Button, Spin } from 'antd';
import { useRouter } from 'next/navigation';

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch('/api/invoices');
        if (res.ok) {
          const data = await res.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.invoiceTotal || 0), 0);
  const syncedCount = invoices.filter((i) => i.status === 'Synced').length;

  const filtered = invoices.filter((inv) =>
    [inv.vendorName, inv.customerName, inv.invoiceId]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
      <div className="data-page-header">
        <div>
          <h1 className="data-page-title">Invoices</h1>
          <p className="data-page-subtitle">
            B2B invoices synced from Microsoft Fabric · bronze.invoices_raw
          </p>
        </div>
        <Button
          type="primary"
          style={{ background: '#111827', borderColor: '#111827', borderRadius: 8, fontWeight: 600 }}
          onClick={() => router.push('/dashboard/add')}
        >
          <i className="bi bi-plus-lg" style={{ marginRight: 6 }} />
          Add invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Invoices</div>
          <div className="stat-card-value">{invoices.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Synced</div>
          <div className="stat-card-value">{syncedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Value</div>
          <div className="stat-card-value">MYR {totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="data-toolbar">
        <i className="bi bi-search" style={{ color: '#9ca3af' }} />
        <input
          placeholder="Search vendor, customer, invoice number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#6b7280' }}>Loading invoices...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No invoices found. Try adding one!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Vendor</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Source File</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id || i}>
                  <td>
                    <div className="cell-primary">{inv.invoiceId}</div>
                    <div className="cell-secondary">{inv.purchaseOrder || '—'}</div>
                  </td>
                  <td>
                    <div className="cell-merchant">{inv.vendorName}</div>
                    <div className="cell-merchant-addr">{inv.vendorAddress}</div>
                  </td>
                  <td>
                    <div>{inv.customerName}</div>
                  </td>
                  <td>{inv.invoiceDate}</td>
                  <td>{inv.dueDate}</td>
                  <td>
                    <strong>{inv.currencyCode} {inv.invoiceTotal?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</strong>
                  </td>
                  <td>
                    <a href={inv.blobUrl || '#'} target="_blank" rel="noopener noreferrer" className="file-link">
                      <i className="bi bi-paperclip" />
                      {inv.fileName?.length > 22 ? inv.fileName.slice(0, 22) + '...' : inv.fileName}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
