'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { DocumentProvider } from '../context/DocumentContext';

const navItems = [
  { label: 'Add Document', icon: 'bi-file-earmark-plus', href: '/dashboard/add' },
  { label: 'Invoices', icon: 'bi-receipt', href: '/dashboard/invoices', disabled: true },
  { label: 'Receipts', icon: 'bi-receipt-cutoff', href: '/dashboard/receipts', disabled: true },
];

const comingSoon = [
  { label: 'Analytics', icon: 'bi-bar-chart-line' },
  { label: 'Documents', icon: 'bi-folder2' },
];

function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  let breadcrumbs = ['Finance Operations'];

  if (pathname === '/dashboard/add') {
    breadcrumbs = ['Add Document'];
  } else if (pathname.startsWith('/dashboard/add/review')) {
    const type = searchParams.get('type');
    const docType = type === 'receipt' ? 'Receipt' : type === 'invoice' ? 'Invoice' : 'Document';
    breadcrumbs = ['Add Document', `Review ${docType}`];
  } else if (pathname === '/dashboard/invoices') {
    breadcrumbs = ['Invoices'];
  } else if (pathname === '/dashboard/receipts') {
    breadcrumbs = ['Receipts'];
  }

  return (
    <>
      <i className="bi bi-grid-1x2" />
      Workspace
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          <span>/</span>
          <span>{crumb}</span>
        </React.Fragment>
      ))}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DocumentProvider>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand d-flex align-items-center">
          <div className="sidebar-brand-icon">Ix</div>
          <div className="sidebar-brand-text">
            <h2 className='p-0 m-0'>Invoxa</h2>
            <span>Invoice Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-section">
          <div className="sidebar-section-label">Workspace</div>
          <ul className="sidebar-nav">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href} className={`sidebar-nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}>
                  {item.disabled ? (
                    <span>
                      <i className={`bi ${item.icon}`} />
                      {item.label}
                    </span>
                  ) : (
                    <Link href={item.href}>
                      <i className={`bi ${item.icon}`} />
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <nav className="sidebar-section" style={{ marginTop: 16 }}>
          <div className="sidebar-section-label">Coming Soon</div>
          <ul className="sidebar-nav">
            {comingSoon.map((item) => (
              <li key={item.label} className="sidebar-nav-item disabled">
                <span>
                  <i className={`bi ${item.icon}`} />
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-spacer" />
      </aside>

      {/* Header */}
      <header className="app-header">
        <div className="header-breadcrumb">
          <Suspense fallback={<><i className="bi bi-grid-1x2" /> Workspace</>}>
            <Breadcrumbs />
          </Suspense>
        </div>
      </header>

      {/* Content */}
      <main className="main-content">
        {children}
      </main>
    </DocumentProvider>
  );
}
