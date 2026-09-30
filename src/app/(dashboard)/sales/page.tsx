'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Eye, 
  Printer, 
  X, 
  Calendar,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RotateCcw
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
      _id?: string;
      name: string;
      unit: string;
      brand?: string;
      variety?: string;
    } | null;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  discount?: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
  date: string;
  notes?: string;
  invoiceSequence?: number;
  invoiceNumber?: string;
}

function cleanUnitName(rawUnit?: string): string {
  if (!rawUnit) return '';
  return rawUnit.replace(/^\d+(\.\d+)?\s*/, '').trim();
}

function formatDisplayQty(quantity: number | string, rawUnit?: string): string {
  const qty = Number(quantity) || 0;
  if (!rawUnit) return `${qty}`;
  const unitName = cleanUnitName(rawUnit);
  if (!unitName) {
    return `${qty}`;
  }
  return `${qty} ${unitName}`;
}

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Selected Sale for Detail Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Multi-select for Batch Delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  const fetchSales = async () => {
    try {
      setLoading(true);
      
      // Role Guard Check: Employees cannot view sales history logs
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.success && dataMe.data.role === 'employee') {
        window.location.href = '/sales/new';
        return;
      }

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
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handleDeleteSale = async (sale: Sale) => {
    const invName = sale.invoiceNumber || `#${sale._id.substring(sale._id.length - 6)}`;
    const confirmMsg = `Are you sure you want to delete Invoice ${invName}?\n\n` +
      `Total Amount: ₹${sale.totalAmount.toLocaleString('en-IN')}\n` +
      `Items: ${sale.items.length} product(s)\n\n` +
      `• The items in this sale will be automatically restored back to inventory stock.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDeletingId(sale._id);
      const res = await fetch(`/api/sales/${sale._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showNotification(`Invoice ${invName} deleted successfully. Stock has been restored.`);
        setSales(prev => prev.filter(s => s._id !== sale._id));
        setSelectedIds(prev => prev.filter(id => id !== sale._id));
        if (selectedSale?._id === sale._id) {
          setIsModalOpen(false);
          setSelectedSale(null);
        }
      } else {
        showNotification(data.error || 'Failed to delete sale record.', true);
      }
    } catch (err: any) {
      showNotification('Network error occurred while deleting sale record.', true);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmMsg = `Are you sure you want to delete ${count} selected sale records?\n\n` +
      `• All items sold in these ${count} sales will be restored back into inventory stock.\n` +
      `• This action cannot be undone.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setIsBulkDeleting(true);
      const res = await fetch('/api/sales', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, restoreStock: true }),
      });
      const data = await res.json();

      if (data.success) {
        showNotification(`Successfully deleted ${count} sale records and restored stock.`);
        setSales(prev => prev.filter(s => !selectedIds.includes(s._id)));
        setSelectedIds([]);
        if (selectedSale && selectedIds.includes(selectedSale._id)) {
          setIsModalOpen(false);
          setSelectedSale(null);
        }
      } else {
        showNotification(data.error || 'Failed to delete selected sales.', true);
      }
    } catch (err: any) {
      showNotification('Network error deleting selected sales.', true);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handlePrint = () => {
    const printContents = document.getElementById('receipt-print-area')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Tax Invoice - Kisan Beej Bhandar</title>
              <style>
                @page { size: auto; margin: 15mm; }
                body { font-family: 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>${printContents}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSales.map(s => s._id));
    }
  };

  const toggleSelectSale = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-title-group">
          <h1>Sales Transaction Ledger</h1>
          <p>View, query, delete, and print customer sales invoices and payment logs</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Filter Options */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
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

      {/* Batch Action Toolbar */}
      {selectedIds.length > 0 && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '1.5rem', 
            padding: '0.85rem 1.25rem', 
            backgroundColor: 'rgba(239, 68, 68, 0.08)', 
            borderColor: 'rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
              {selectedIds.length} Selected
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Choose action for selected sale records:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
              onClick={() => setSelectedIds([])}
              disabled={isBulkDeleting}
            >
              Deselect All
            </button>
            <button
              className="btn btn-danger"
              style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash2 size={15} />
              <span>{isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

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
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredSales.length > 0 && selectedIds.length === filteredSales.length}
                    onChange={toggleSelectAll}
                    title="Select all sales"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Invoice Date</th>
                <th>Invoice No.</th>
                <th>Buyer Information</th>
                <th>Cashier</th>
                <th>Payment Mode</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right" style={{ minWidth: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => {
                const isSelected = selectedIds.includes(sale._id);
                const isThisDeleting = deletingId === sale._id;

                return (
                  <tr key={sale._id} style={{ backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSale(sale._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>{new Date(sale.date).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {sale.invoiceNumber || 'N/A'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sale.customerId?.name || 'Walk-in Buyer'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {sale.customerId?.phone || 'No phone'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.75rem' }}>
                        {sale.invoiceNumber ? sale.invoiceNumber.replace(/[0-9]/g, '') : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        sale.paymentMode === 'Cash' ? 'badge-success' : 
                        sale.paymentMode === 'UPI' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {sale.paymentMode === 'Credit' ? 'Credit / Udhaar' : sale.paymentMode}
                      </span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      ₹{sale.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          onClick={() => handleViewSale(sale)}
                          title="View Invoice details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon" 
                          onClick={() => handleDeleteSale(sale)}
                          disabled={isThisDeleting || isBulkDeleting}
                          title="Delete sale and restore stock (Admin)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {isModalOpen && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Sales Invoice #{selectedSale.invoiceNumber || selectedSale._id.substring(0, 12)}</h3>
              <button className="modal-close" onClick={() => { setIsModalOpen(false); setSelectedSale(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* Receipt Area (Formatted for print) */}
              <div id="receipt-print-area" style={{ color: '#0f172a', backgroundColor: '#ffffff', borderRadius: '12px', padding: '2rem', fontFamily: "'Segoe UI', Roboto, system-ui, -apple-system, sans-serif", border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🌾 KISAN BEEJ BHANDAR</span>
                    </div>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>Seeds, Fertilizers & Agricultural Equipment</p>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Store Contact: +91 {selectedSale.customerId?.phone || 'N/A'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'inline-block' }}>
                      TAX INVOICE
                    </span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
                      #{selectedSale.invoiceNumber || selectedSale._id.substring(0, 8)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                      Date: {new Date(selectedSale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Customer & Payment Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>BILLED TO</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{selectedSale.customerId?.name || 'Walk-in Customer'}</div>
                    <div style={{ color: '#475569', marginTop: '0.15rem' }}>Phone: {selectedSale.customerId?.phone || 'N/A'}</div>
                    {selectedSale.customerId?.address && <div style={{ color: '#475569', marginTop: '0.15rem' }}>Address: {selectedSale.customerId.address}</div>}
                  </div>
                  <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>PAYMENT DETAILS</div>
                    <div style={{ color: '#475569', marginBottom: '0.2rem' }}>
                      Payment Mode: <strong style={{ color: selectedSale.paymentMode === 'Credit' ? '#dc2626' : '#166534' }}>{selectedSale.paymentMode === 'Credit' ? 'CREDIT / UDHAAR' : selectedSale.paymentMode?.toUpperCase()}</strong>
                    </div>
                    <div style={{ color: '#475569' }}>
                      Cashier Initials: <strong>{selectedSale.invoiceNumber ? selectedSale.invoiceNumber.replace(/[0-9]/g, '') : 'EMP'}</strong>
                    </div>
                  </div>
                </div>

                {/* Product Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>#</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>Product Description</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>Qty</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>Rate (₹)</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600, borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((it, idx) => {
                      const itemName = it.itemId?.name || 'Product';
                      const itemBrand = it.itemId?.brand;
                      const itemVariety = it.itemId?.variety;
                      const itemUnit = it.itemId?.unit || 'kg';
                      const isEven = idx % 2 === 0;

                      return (
                        <tr key={idx} style={{ backgroundColor: isEven ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{itemName}</div>
                            {(itemBrand || itemVariety) && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                                Brand: {itemBrand || 'Standard'} | Variety: {itemVariety || 'Default'}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                            {formatDisplayQty(it.quantity, itemUnit)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#334155' }}>₹{it.price.toFixed(2)}</td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{(it.quantity * it.price).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Financial Totals Box */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                  <div style={{ width: '270px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.9rem', fontSize: '0.85rem' }}>
                    {selectedSale.discount && selectedSale.discount > 0 ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: '#475569' }}>
                          <span>Subtotal:</span>
                          <span>₹{(selectedSale.totalAmount + selectedSale.discount).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#166534', fontWeight: 600 }}>
                          <span>Discount:</span>
                          <span>-₹{selectedSale.discount.toFixed(2)}</span>
                        </div>
                        <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: '0.5rem' }}></div>
                      </>
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>GRAND TOTAL:</span>
                      <span style={{ fontWeight: 900, fontSize: '1.3rem', color: '#166534' }}>₹{selectedSale.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {selectedSale.notes && (
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '0.6rem 0.8rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#92400e', wordBreak: 'break-word' }}>
                    <strong>Notes:</strong> {selectedSale.notes}
                  </div>
                )}

                {/* Footer Terms & Signature */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem', color: '#64748b' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Thank you for buying with us!</p>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#166534', fontWeight: 500 }}>🌾 Kisan Ki Unnati, Desh Ka Vikas.</p>
                  </div>
                  <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '0.25rem', width: '140px' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Authorised Signatory</span>
                  </div>
                </div>
              </div>

            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => handleDeleteSale(selectedSale)}
                disabled={deletingId === selectedSale._id}
              >
                <Trash2 size={16} />
                <span>Delete Sale</span>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
