import type { Metadata } from "next";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./globals.css";
import 'bootstrap-icons/font/bootstrap-icons.css';

export const metadata: Metadata = {
  title: "Invoice & Receipt Extractor",
  description: "Extract, review, and manage invoice and receipt data powered by Azure AI Document Intelligence and Microsoft Fabric.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
