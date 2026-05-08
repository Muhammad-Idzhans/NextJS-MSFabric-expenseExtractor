'use client';

import { useState, useEffect } from 'react';
import { Button, Spin } from 'antd';
import { useRouter } from 'next/navigation';

const categoryColors: Record<string, string> = {
  'Food & Beverage': 'badge-green',
  'Travel': 'badge-blue',
  'Supplies': 'badge-amber',
  'Other': 'badge-purple',
};

export default function ReceiptsPage() {
  const [search, setSearch] = useState('');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchReceipts() {
      try {
        const res = await fetch('/api/receipts');
        if (res.ok) {
          const data = await res.json();
          setReceipts(data);
        }
      } catch (error) {
        console.error('Failed to fetch receipts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchReceipts();
  }, []);

  const totalSpend = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
  const syncedCount = receipts.filter((r) => r.status === 'Synced').length;

  const filtered = receipts.filter((r) =>
    [r.merchantName, r.category]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
      <div className="data-page-header">
        <div>
          <h1 className="data-page-title">Receipts</h1>
          <p className="data-page-subtitle">
            Expense receipts synced from Microsoft Fabric · bronze.receipts_raw
          </p>
        </div>
        <Button
          type="primary"
          style={{ background: '#111827', borderColor: '#111827', borderRadius: 8, fontWeight: 600 }}
          onClick={() => router.push('/dashboard/add')}
        >
          <i className="bi bi-plus-lg" style={{ marginRight: 6 }} />
          Add receipt
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Receipts</div>
          <div className="stat-card-value">{receipts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Synced</div>
          <div className="stat-card-value">{syncedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Spend</div>
          <div className="stat-card-value">MYR {totalSpend.toFixed(2)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="data-toolbar">
        <i className="bi bi-search" style={{ color: '#9ca3af' }} />
        <input
          placeholder="Search merchant, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="data-table-wrapper">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#6b7280' }}>Loading receipts...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No receipts found. Try adding one!
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Merchant</th>
                <th>Date</th>
                <th>Category</th>
                <th>Total</th>
                <th>Source File</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id || i}>
                  <td>
                    <div className="cell-primary">{r.id.substring(0, 10).toUpperCase()}...</div>
                  </td>
                  <td>
                    <div className="cell-merchant">{r.merchantName}</div>
                    <div className="cell-merchant-addr">{r.merchantAddress}</div>
                  </td>
                  <td>{r.transactionDate}</td>
                  <td>
                    <span className={`badge ${categoryColors[r.category] || 'badge-purple'}`}>
                      {r.category}
                    </span>
                  </td>
                  <td>
                    <strong>{r.currencyCode} {r.total?.toFixed(2)}</strong>
                  </td>
                  <td>
                    <a href={r.blobUrl || '#'} target="_blank" rel="noopener noreferrer" className="file-link">
                      <i className="bi bi-paperclip" />
                      {r.fileName?.length > 22 ? r.fileName.slice(0, 22) + '...' : r.fileName}
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
