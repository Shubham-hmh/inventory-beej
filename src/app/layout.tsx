import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kisan Beej Bhandar - Stock & Sales Management",
  description: "Manage inventory stock, sales invoices, items, prices, and customer directories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <div className="app-container">
          <Sidebar />
          <div className="main-wrapper">
            <header className="header">
              <h2 className="header-title">Kisan Beej Bhandar</h2>
              <div className="header-meta">
                <span className="badge badge-success">Secure Database Link</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </header>
            <main className="content-container">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

