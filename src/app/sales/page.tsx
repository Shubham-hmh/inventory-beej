'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Eye, 
  Printer, 
  X, 
  Calendar,
  FileSpreadsheet
} from 'lucide-react';

interface Sale {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
    address?: string;
  } | null;
  items: Array<{
    itemId: {
      name: string;
      unit: string;
      brand?: string;
      variety?: string;
    } | null;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
  date: string;
  notes?: string;
}

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Sale for Detail Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    async function fetchSales() {
      try {
        setLoading(true);
        const res = await fetch('/api/sales');
        const data = await res.json();
        if (data.success) {
          setSales(data.data || []);
        } else {
          setError(data.error || 'Failed to fetch sales history');
        }
      } catch (err) {
        setError('Error connecting to backend API');
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    const printContents = document.getElementById('receipt-print-area')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Receipt</title></head><body style="padding:20px;">');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Filter Logic
  const filteredSales = sales.filter(sale => {
    const customerName = sale.customerId?.name.toLowerCase() || '';
    const customerPhone = sale.customerId?.phone || '';
    const matchesSearch = customerName.includes(searchTerm.toLowerCase()) || 
                          customerPhone.includes(searchTerm);
    
    const matchesPayment = paymentFilter === 'All' || sale.paymentMode === paymentFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const saleDateStr = new Date(sale.date).toISOString().split('T')[0];
      matchesDate = saleDateStr === dateFilter;
    }

    return matchesSearch && matchesPayment && matchesDate;
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Sales Transaction Ledger</h1>
          <p>View, query, and print historical customer sales invoices and payment logs</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter Options */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Search Buyer Name / Phone</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="e.g. Ram Singh"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Payment Status</label>
            <select
              className="form-control"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="All">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Credit">Credit (Udhaar)</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Specific Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-control"
                style={{ paddingLeft: '2.2rem' }}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%' }}
            onClick={() => {
              setSearchTerm('');
              setPaymentFilter('All');
              setDateFilter('');
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Sales Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <History size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Sales Registered</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No sales match the selected filters or exist in the ledger database.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice Date</th>
                <th>Invoice ID</th>
                <th>Buyer Information</th>
                <th>Payment Mode</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale._id}>
                  <td>{new Date(sale.date).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {sale._id.substring(0, 10)}...
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{sale.customerId?.name || 'Walk-in Buyer'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {sale.customerId?.phone}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      sale.paymentMode === 'Cash' ? 'badge-success' : 
                      sale.paymentMode === 'UPI' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {sale.paymentMode}
                    </span>
                  </td>
                  <td className="text-right" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    ₹{sale.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="text-right">
                    <button 
                      className="btn btn-secondary btn-icon" 
                      onClick={() => handleViewSale(sale)}
                      title="View Invoice details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {isModalOpen && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Sales Invoice #{selectedSale._id.substring(0, 12)}</h3>
              <button className="modal-close" onClick={() => { setIsModalOpen(false); setSelectedSale(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* Receipt Area (Formatted for print) */}
              <div id="receipt-print-area" style={{ color: '#000000', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', padding: '1.5rem', fontFamily: 'Courier, monospace' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>KISAN BEEJ BHANDAR</h3>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.8rem' }}>Stock & Sales Ledger Invoice</p>
                  <div style={{ borderBottom: '1px dashed #000000', margin: '0.75rem 0' }} />
                </div>

                <div style={{ fontSize: '0.85rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div><strong>Invoice ID:</strong> {selectedSale._id}</div>
                  <div><strong>Date:</strong> {new Date(selectedSale.date).toLocaleDateString()}</div>
                  <div><strong>Customer:</strong> {selectedSale.customerId?.name || 'Walk-in'}</div>
                  <div><strong>Phone:</strong> {selectedSale.customerId?.phone || 'N/A'}</div>
                  {selectedSale.customerId?.address && <div><strong>Address:</strong> {selectedSale.customerId.address}</div>}
                  <div><strong>Payment Type:</strong> {selectedSale.paymentMode}</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #000000' }}>
                      <th style={{ textAlign: 'left', padding: '0.4rem 0' }}>Product</th>
                      <th style={{ textAlign: 'center', padding: '0.4rem 0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '0.4rem 0' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '0.4rem 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '0.4rem 0' }}>
                          <div>{it.itemId?.name || 'Deleted Product'}</div>
                          {it.itemId && (it.itemId.brand || it.itemId.variety) && (
                            <div style={{ fontSize: '0.75rem', color: '#666666' }}>
                              ({it.itemId.brand || 'No Brand'} - {it.itemId.variety || 'No Variety'})
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.4rem 0' }}>{it.quantity} {it.itemId?.unit || 'kg'}</td>
                        <td style={{ textAlign: 'right', padding: '0.4rem 0' }}>₹{it.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.4rem 0' }}>₹{(it.quantity * it.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000000', paddingTop: '0.5rem', textAlign: 'right', fontSize: '1rem', fontWeight: 'bold' }}>
                  GRAND TOTAL: ₹{selectedSale.totalAmount.toFixed(2)}
                </div>

                {selectedSale.notes && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Notes: {selectedSale.notes}
                  </div>
                )}
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { setIsModalOpen(false); setSelectedSale(null); }}>
                Close
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
