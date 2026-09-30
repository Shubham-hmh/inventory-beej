'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Package, 
  Users, 
  ArrowDownLeft, 
  ShoppingBag, 
  Receipt,
  ChevronRight,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';

interface Item {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
}

interface Sale {
  _id: string;
  customerId: {
    name: string;
    phone: string;
  } | null;
  items: Array<{
    itemId: {
      name: string;
      unit: string;
    } | null;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMode?: string;
  date: string;
  invoiceSequence?: number;
  invoiceNumber?: string;
}

interface StockInput {
  _id: string;
  itemId: {
    name: string;
    unit: string;
  } | null;
  quantity: number;
  unitPrice: number;
  date: string;
  supplier: string;
}

// Helpers for clean unit & quantity display
function cleanUnitName(rawUnit?: string): string {
  if (!rawUnit) return '';
  return rawUnit.replace(/^\d+(\.\d+)?\s*/, '').trim();
}

function formatDisplayQty(quantity: number | string, rawUnit?: string): string {
  const qty = Number(quantity) || 0;
  const unitName = cleanUnitName(rawUnit);
  return unitName ? `${qty} ${unitName}` : `${qty}`;
}

export default function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockLogs, setStockLogs] = useState<StockInput[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Verify user session & role first
        const resMe = await fetch('/api/auth/me');
        const dataMe = await resMe.json();
        if (dataMe.success) {
          if (dataMe.data.role === 'employee') {
            router.push('/sales/new');
            return;
          }
        } else {
          router.push('/login');
          return;
        }

        // Fetch Items, Sales, Stock, Customers in parallel
        const [resItems, resSales, resStock, resCust] = await Promise.all([
          fetch('/api/items'),
          fetch('/api/sales'),
          fetch('/api/stock'),
          fetch('/api/customers')
        ]);

        const dataItems = await resItems.json();
        const dataSales = await resSales.json();
        const dataStock = await resStock.json();
        const dataCust = await resCust.json();

        if (dataItems.success) setItems(dataItems.data || []);
        if (dataSales.success) setSales(dataSales.data || []);
        if (dataStock.success) setStockLogs(dataStock.data || []);
        if (dataCust.success) setCustomersCount((dataCust.data || []).length);

      } catch (err: any) {
        setError('Failed to fetch dashboard data. Please refresh.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  // Compute stats
  const totalRevenue = sales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalInvoices = sales.length;
  const totalItemsCount = items.length;
  const recentSales = sales.slice(0, 6);
  const recentStocks = stockLogs.slice(0, 6);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Dashboard Overview...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <AlertTriangle size={20} />
        <div>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Dashboard Overview</h1>
          <p>Kisan Beej Bhandar performance summary and sales activity</p>
        </div>
        <div className="flex-gap-3">
          <Link href="/sales/new" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>Create New Sale</span>
          </Link>
          <Link href="/customers" className="btn btn-secondary">
            <Users size={18} />
            <span>Customers Directory</span>
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="dashboard-grid">
        <Link href="/sales" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
            <div className="card-header-flex">
              <div>
                <div className="card-value" style={{ color: 'var(--primary)' }}>
                  ₹{totalRevenue.toLocaleString('en-IN')}
                </div>
                <div className="card-title">Total Sales Revenue</div>
              </div>
              <div className="card-icon-wrapper primary">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="card-desc flex-between" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <span>Accrued across {totalInvoices} sales</span>
              <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, fontSize: '0.75rem' }}>
                View History <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </Link>

        <Link href="/customers" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
            <div className="card-header-flex">
              <div>
                <div className="card-value" style={{ color: '#38bdf8' }}>
                  {customersCount}
                </div>
                <div className="card-title">Registered Customers</div>
              </div>
              <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <Users size={24} />
              </div>
            </div>
            <div className="card-desc flex-between" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <span>Farmer database</span>
              <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, fontSize: '0.75rem' }}>
                View Directory <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </Link>

        <Link href="/inventory" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
            <div className="card-header-flex">
              <div>
                <div className="card-value" style={{ color: '#a855f7' }}>
                  {totalItemsCount}
                </div>
                <div className="card-title">Cataloged Products</div>
              </div>
              <div className="card-icon-wrapper" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <Package size={24} />
              </div>
            </div>
            <div className="card-desc flex-between" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <span>Seeds & fertilizers</span>
              <span style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, fontSize: '0.75rem' }}>
                Manage Items <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </Link>

        <Link href="/sales" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
            <div className="card-header-flex">
              <div>
                <div className="card-value" style={{ color: '#f59e0b' }}>
                  {totalInvoices}
                </div>
                <div className="card-title">Total Invoices</div>
              </div>
              <div className="card-icon-wrapper accent">
                <Receipt size={24} />
              </div>
            </div>
            <div className="card-desc flex-between" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <span>Completed orders</span>
              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600, fontSize: '0.75rem' }}>
                Sales History <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Activity Grid */}
      <div className="grid-equal-panels">
        {/* Revamped Recent Sales History */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} style={{ color: 'var(--primary)' }} />
                Recent Sales History
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Latest billing transactions & purchased items
              </p>
            </div>
            <Link href="/sales" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {recentSales.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2.5rem 0' }}>
              No sales transactions registered yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentSales.map(sale => (
                <div key={sale._id} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  transition: 'background-color 0.2s ease'
                }}>
                  <div className="flex-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        backgroundColor: 'var(--primary-glow)',
                        color: 'var(--primary)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        {sale.invoiceNumber || 'INV-N/A'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {sale.customerId?.name || 'Walk-in Buyer'}
                      </span>
                      {sale.customerId?.phone && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({sale.customerId.phone})
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
                        ₹{sale.totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Items Purchased List */}
                  <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.825rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem 1rem'
                  }}>
                    {sale.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {it.itemId?.name || 'Item'}:
                        </span>
                        <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>
                          {formatDisplayQty(it.quantity, it.itemId?.unit)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>
                      {new Date(sale.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                      {sale.paymentMode === 'Credit' ? 'Credit / Udhaar' : sale.paymentMode || 'Cash'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stock Inwards Panel */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowDownLeft size={20} style={{ color: '#14b8a6' }} />
                Recent Stock Inwards
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Latest incoming inventory shipments
              </p>
            </div>
            <Link href="/stock" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {recentStocks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2.5rem 0' }}>
              No stock arrivals recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentStocks.map(log => (
                <div key={log._id} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {log.itemId?.name || 'Item Record'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Supplier: <span style={{ color: 'var(--text-secondary)' }}>{log.supplier || 'N/A'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                      +{formatDisplayQty(log.quantity, log.itemId?.unit)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(log.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


