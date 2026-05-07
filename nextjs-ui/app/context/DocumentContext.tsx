'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DocumentContextType {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  return (
    <DocumentContext.Provider value={{ uploadedFile, setUploadedFile }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocumentContext must be used within a DocumentProvider');
  }
  return context;
}
