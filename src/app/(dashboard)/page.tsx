'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Package, 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle,
  ShoppingBag,
  Download
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
  };
  items: Array<{
    itemId: {
      name: string;
      unit: string;
    };
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMode: string;
  date: string;
  invoiceSequence?: number;
  invoiceNumber?: string;
}

interface StockInput {
  _id: string;
  itemId: {
    name: string;
    unit: string;
  };
  quantity: number;
  unitPrice: number;
  date: string;
  supplier: string;
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

        // Fetch Items
        const resItems = await fetch('/api/items');
        const dataItems = await resItems.json();
        
        // Fetch Sales
        const resSales = await fetch('/api/sales');
        const dataSales = await resSales.json();
        
        // Fetch Stock Logs
        const resStock = await fetch('/api/stock');
        const dataStock = await resStock.json();

        // Fetch Customers
        const resCust = await fetch('/api/customers');
        const dataCust = await resCust.json();

        if (dataItems.success) setItems(dataItems.data || []);
        if (dataSales.success) setSales(dataSales.data || []);
        if (dataStock.success) setStockLogs(dataStock.data || []);
        if (dataCust.success) setCustomersCount((dataCust.data || []).length);

      } catch (err: any) {
        setError('Failed to fetch dashboard data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Compute stats
  const totalRevenue = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const lowStockItems = items.filter(item => item.stock < 10);
  const totalItemsCount = items.length;
  const recentSales = sales.slice(0, 5);
  const recentStocks = stockLogs.slice(0, 5);

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
      <div className="page-header">
        <div className="page-title-group">
          <h1>Dashboard Overview</h1>
          <p>Kisan Beej Bhandar business performance and stock metrics</p>
        </div>
        <div className="flex-gap-3">
          <Link href="/sales/new" className="btn btn-primary">
            <ShoppingBag size={18} />
            <span>New Sale</span>
          </Link>
          <Link href="/stock" className="btn btn-secondary">
            <Download size={18} />
            <span>Record Stock Inward</span>
          </Link>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header-flex">
            <div>
              <div className="card-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
              <div className="card-title">Total Sales Revenue</div>
            </div>
            <div className="card-icon-wrapper primary">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="card-desc">Accrued across {sales.length} transactions</div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <div>
              <div className="card-value">{totalItemsCount}</div>
              <div className="card-title">Active Items</div>
            </div>
            <div className="card-icon-wrapper secondary">
              <Package size={24} />
            </div>
          </div>
          <div className="card-desc">Seeds, fertilizers, and pesticides cataloged</div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <div>
              <div className="card-value">{customersCount}</div>
              <div className="card-title">Registered Customers</div>
            </div>
            <div className="card-icon-wrapper primary">
              <Users size={24} />
            </div>
          </div>
          <div className="card-desc">Farmers and buyers database</div>
        </div>

        <div className="card">
          <div className="card-header-flex">
            <div>
              <div className="card-value">{stockLogs.length}</div>
              <div className="card-title">Stock Inflow Records</div>
            </div>
            <div className="card-icon-wrapper accent">
              <ArrowDownLeft size={24} />
            </div>
          </div>
          <div className="card-desc">Inventory shipments registered</div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="flex-gap-3" style={{ marginBottom: '1rem', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Low Stock Alert!</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            The following items are running low (less than 10 units) and need to be restocked:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {lowStockItems.map(item => (
              <span key={item._id} className="badge badge-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                {item.name}: {item.stock} {item.unit} left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs Section */}
      <div className="grid-equal-panels">
        {/* Recent Sales */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Recent Sales</h3>
            <Link href="/sales" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
              View All Sales
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No sales transactions registered yet.
            </p>
          ) : (
            <div className="table-container" style={{ margin: 0, border: 'none', backgroundColor: 'transparent' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice / Buyer</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(sale => (
                    <tr key={sale._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                            {sale.invoiceNumber || 'N/A'}
                          </span>
                          <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.3rem' }} title="Cashier initials">
                            {sale.invoiceNumber ? sale.invoiceNumber.replace(/[0-9]/g, '') : 'N/A'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 500, fontSize: '0.85rem', marginTop: '0.15rem' }}>{sale.customerId?.name || 'Walk-in Buyer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(sale.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {sale.items.map((it, idx) => (
                          <div key={idx}>
                            {it.itemId?.name || 'Unknown Item'} ({it.quantity} {it.itemId?.unit || 'kg'})
                          </div>
                        ))}
                      </td>
                      <td className="text-right" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        ₹{sale.totalAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Stock Arrivals */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Recent Stock Inwards</h3>
            <Link href="/stock" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
              View All Inwards
            </Link>
          </div>
          {recentStocks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
              No stock arrivals recorded yet.
            </p>
          ) : (
            <div className="table-container" style={{ margin: 0, border: 'none', backgroundColor: 'transparent' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Supplier</th>
                    <th className="text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStocks.map(log => (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 500 }}>{log.itemId?.name || 'Deleted Item'}</td>
                      <td>
                        <span className="badge badge-success">
                          +{log.quantity} {log.itemId?.unit || 'kg'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {log.supplier || 'N/A'}
                      </td>
                      <td className="text-right" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
