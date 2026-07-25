'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  X, 
  Receipt,
  MapPin,
  Phone
} from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: string;
}

interface SaleItem {
  itemId: {
    name: string;
    unit: string;
  } | null;
  quantity: number;
  price: number;
}

interface Sale {
  _id: string;
  customerId: string | { _id: string } | null;
  items: SaleItem[];
  totalAmount: number;
  paymentMode: string;
  date: string;
}

export default function CustomersRegistry() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected customer for history view
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const resCust = await fetch('/api/customers');
        const dataCust = await resCust.json();
        
        const resSales = await fetch('/api/sales');
        const dataSales = await resSales.json();

        if (dataCust.success) setCustomers(dataCust.data || []);
        if (dataSales.success) setSales(dataSales.data || []);
      } catch (err) {
        setError('Error loading customer directory');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute metrics per customer
  const getCustomerMetrics = (customerId: string) => {
    const custSales = sales.filter(sale => {
      if (!sale.customerId) return false;
      const id = typeof sale.customerId === 'object' ? sale.customerId._id : sale.customerId;
      return id === customerId;
    });

    const totalSpent = custSales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    return {
      orderCount: custSales.length,
      totalSpent
    };
  };

  // Get specific sales for the selected customer
  const getCustomerSales = (customerId: string) => {
    return sales.filter(sale => {
      if (!sale.customerId) return false;
      const id = typeof sale.customerId === 'object' ? sale.customerId._id : sale.customerId;
      return id === customerId;
    });
  };

  // Filter logic
  const filteredCustomers = customers.filter(cust => {
    const term = search.toLowerCase();
    return cust.name.toLowerCase().includes(term) || cust.phone.includes(term);
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Customers Directory</h1>
          <p>View registered farmer profiles, total purchase amounts, and transaction logs</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search customers by name or phone..." 
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Customers Registered</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No buyer profiles match your query. Add customers during new sale checkouts.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer Profile</th>
                <th>Phone Number</th>
                <th>Village / Address</th>
                <th className="text-right">Total Visits</th>
                <th className="text-right">Total Purchased</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => {
                const metrics = getCustomerMetrics(cust._id);
                return (
                  <tr key={cust._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{cust.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Registered: {new Date(cust.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div className="flex-gap-2" style={{ fontSize: '0.9rem' }}>
                        <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{cust.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-gap-2" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{cust.address || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="badge badge-info" style={{ fontWeight: 600 }}>
                        {metrics.orderCount} orders
                      </span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      ₹{metrics.totalSpent.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn btn-secondary btn-icon"
                        onClick={() => {
                          setSelectedCust(cust);
                          setIsModalOpen(true);
                        }}
                        title="View Purchase Ledger"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {isModalOpen && selectedCust && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Purchase History: {selectedCust.name}</h3>
              <button className="modal-close" onClick={() => { setIsModalOpen(false); setSelectedCust(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="grid-2col" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contact Info</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{selectedCust.phone}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Location</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{selectedCust.address || 'Not Specified'}</div>
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Invoiced Orders</h4>
              
              {getCustomerSales(selectedCust._id).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' }}>
                  No orders registered under this customer profile.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {getCustomerSales(selectedCust._id).map(sale => (
                    <div key={sale._id} className="card" style={{ padding: '1rem', margin: 0, border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Date: <strong>{new Date(sale.date).toLocaleDateString()}</strong>
                        </div>
                        <span className={`badge ${
                          sale.paymentMode === 'Cash' ? 'badge-success' : 
                          sale.paymentMode === 'UPI' ? 'badge-info' : 'badge-warning'
                        }`} style={{ fontSize: '0.7rem' }}>
                          {sale.paymentMode}
                        </span>
                      </div>

                      {/* Items List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="flex-between" style={{ fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {item.itemId?.name || 'Deleted Product'} ({item.quantity} {item.itemId?.unit || 'kg'})
                            </span>
                            <span>₹{(item.quantity * item.price).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex-between" style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Billed</span>
                        <span className="text-primary">₹{sale.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => { setIsModalOpen(false); setSelectedCust(null); }}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
