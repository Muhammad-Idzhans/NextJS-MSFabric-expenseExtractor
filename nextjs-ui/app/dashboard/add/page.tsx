'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spin } from 'antd';

type DocType = 'invoice' | 'receipt';

import { useDocumentContext } from '../../context/DocumentContext';

export default function AddDocumentPage() {
  const [docType, setDocType] = useState<DocType>('invoice');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setUploadedFile } = useDocumentContext();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Extraction failed');
        return;
      }

      // Store file in context and JSON result in sessionStorage so Review page can read them
      setUploadedFile(file);
      sessionStorage.setItem('extractionResult', JSON.stringify(json));
      router.push(`/dashboard/add/review?type=${docType}`);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <>
      {/* Badge */}
      <div className="page-badge">
        <i className="bi bi-stars" />
        Document Intelligence
      </div>

      {/* Title */}
      <h1 className="page-title">Add a new document</h1>
      <p className="page-subtitle">
        Choose what you&apos;re uploading, then drop your file in. We&apos;ll extract vendor, line items,
        and totals automatically — you review before it lands in your lakehouse.
      </p>

      {/* Document Type Tabs */}
      <div className="doc-type-tabs">
        <button
          className={`doc-type-tab ${docType === 'invoice' ? 'active' : ''}`}
          onClick={() => { setDocType('invoice'); setFile(null); setError(null); }}
        >
          <div className="doc-type-tab-icon">
            <i className="bi bi-file-earmark-text" />
          </div>
          <div className="doc-type-tab-text">
            <h4>Invoice</h4>
            <p>B2B billing · line items · due date</p>
          </div>
        </button>
        <button
          className={`doc-type-tab ${docType === 'receipt' ? 'active' : ''}`}
          onClick={() => { setDocType('receipt'); setFile(null); setError(null); }}
        >
          <div className="doc-type-tab-icon">
            <i className="bi bi-receipt" />
          </div>
          <div className="doc-type-tab-text">
            <h4>Receipt</h4>
            <p>Expense · merchant · payment method</p>
          </div>
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone ${file ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !file && !loading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {loading ? (
          <div style={{ padding: '24px 0' }}>
            <Spin size="large" />
            <h3 style={{ marginTop: 16 }}>Extracting data from your {docType}...</h3>
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              This may take 10–30 seconds depending on document complexity.
            </p>
          </div>
        ) : !file ? (
          <>
            <div className="upload-icon">
              <i className="bi bi-cloud-arrow-up" />
            </div>
            <h3>Drag &amp; drop your {docType} here</h3>
            <p>PDF, PNG, JPG, TIFF · up to 20 MB</p>
            <div className="upload-actions">
              <Button type="primary" style={{ background: '#111827', borderColor: '#111827', borderRadius: 8 }}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse files
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="upload-icon">
              <i className="bi bi-file-earmark-check" />
            </div>
            <div className="file-name">{file.name}</div>
            <div className="file-meta">
              {formatFileSize(file.size)} · ready to extract as {docType}
            </div>
            <div className="upload-actions">
              <Button
                style={{ borderRadius: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setError(null);
                }}
              >
                Replace
              </Button>
              <Button
                type="primary"
                style={{ background: '#111827', borderColor: '#111827', borderRadius: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExtract();
                }}
              >
                <i className="bi bi-stars" style={{ marginRight: 6 }} />
                Extract data
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 13,
        }}>
          <i className="bi bi-exclamation-triangle" style={{ marginRight: 6 }} />
          {error}
        </div>
      )}

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="info-card-icon">
            <i className="bi bi-stars" />
          </div>
          <h4>AI extraction</h4>
          <p>
            {docType === 'invoice'
              ? 'Vendor, customer, line items and totals parsed in seconds.'
              : 'Vendor, items, payment method and totals parsed in seconds.'}
          </p>
        </div>
        <div className="info-card">
          <div className="info-card-icon">
            <i className="bi bi-shield-check" />
          </div>
          <h4>You stay in control</h4>
          <p>Review and correct fields before anything is saved.</p>
        </div>
        <div className="info-card">
          <div className="info-card-icon">
            <i className="bi bi-cloud-arrow-up" />
          </div>
          <h4>Synced to Fabric</h4>
          <p>
            {docType === 'invoice'
              ? 'Records land in bronze.invoices_raw; files mirrored to Blob & SharePoint.'
              : 'Records land in bronze.receipts_raw; files mirrored to Blob & SharePoint.'}
          </p>
        </div>
      </div>
    </>
  );
}
