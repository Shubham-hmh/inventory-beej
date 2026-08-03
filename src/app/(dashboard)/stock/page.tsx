'use client';

import { useState, useEffect } from 'react';
import { 
  Download, 
  Search, 
  Calendar, 
  Truck, 
  FileText,
  DollarSign,
  ClipboardList
} from 'lucide-react';

interface Item {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  brand?: string;
  variety?: string;
}

interface StockLog {
  _id: string;
  itemId: {
    _id: string;
    name: string;
    unit: string;
    brand?: string;
    variety?: string;
  } | null;
  quantity: number;
  unitPrice: number;
  date: string;
  supplier: string;
  notes: string;
  createdAt: string;
}

export default function StockInward() {
  const [items, setItems] = useState<Item[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Filtering fields
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Role Guard Check: Employees cannot record/view stock arrivals
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.success && dataMe.data.role === 'employee') {
        window.location.href = '/sales/new';
        return;
      }

      const resItems = await fetch('/api/items');
      const dataItems = await resItems.json();
      if (dataItems.success) {
        setItems(dataItems.data || []);
      }

      const resLogs = await fetch('/api/stock');
      const dataLogs = await resLogs.json();
      if (dataLogs.success) {
        setStockLogs(dataLogs.data || []);
      }
    } catch (err: any) {
      setError('Error loading page data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !quantity || !unitPrice) {
      setError('Item, Quantity, and Purchase Unit Price are required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          date,
          supplier,
          notes
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Stock record saved and inventory updated!');
        // Reset form
        setSelectedItemId('');
        setQuantity('');
        setUnitPrice('');
        setDate(new Date().toISOString().split('T')[0]);
        setSupplier('');
        setNotes('');
        
        // Reload data
        loadData();
      } else {
        setError(data.error || 'Failed to save stock entry');
      }
    } catch (err) {
      setError('Network error saving stock entry');
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setError('');
        setSuccess('');
      }, 4000);
    }
  };

  // Find unit of currently selected item to display next to quantity input
  const selectedItem = items.find(it => it._id === selectedItemId);

  // Filter logs
  const filteredLogs = stockLogs.filter(log => {
    const itemName = log.itemId?.name.toLowerCase() || '';
    const supplierName = log.supplier?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    return itemName.includes(term) || supplierName.includes(term);
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Stock Inward Management</h1>
          <p>Record seeds, fertilizers, and products received into store stock</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid-equal-panels">
        {/* Left Side: Stock Entry Form */}
        <div className="card">
          <div className="flex-gap-3" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Download size={22} className="text-primary" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Log Incoming Stock</h3>
          </div>

          <form onSubmit={handleStockSubmit}>
            <div className="form-group">
              <label className="form-label">Select Product *</label>
              <select
                className="form-control"
                required
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">-- Choose Item from Inventory --</option>
                {items.map(item => {
                  const details = [
                    item.brand && `Brand: ${item.brand}`,
                    item.variety && `Variety: ${item.variety}`
                  ].filter(Boolean).join(', ');
                  const detailStr = details ? ` [${details}]` : '';
                  return (
                    <option key={item._id} value={item._id}>
                      {item.name}{detailStr} ({item.category}) — Current: {item.stock} {item.unit}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label className="form-label">
                  Quantity Received {selectedItem ? `(${selectedItem.unit})` : ''} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 50"
                  className="form-control"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Unit Price (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cost per unit"
                    className="form-control"
                    style={{ paddingLeft: '2rem' }}
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid-2col">
              <div className="form-group">
                <label className="form-label">Arrival Date *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    className="form-control"
                    style={{ paddingLeft: '2rem' }}
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Name</label>
                <div style={{ position: 'relative' }}>
                  <Truck size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="e.g. IFFCO Distributor"
                    className="form-control"
                    style={{ paddingLeft: '2rem' }}
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                <textarea
                  placeholder="e.g. Batch no, invoice details..."
                  className="form-control"
                  style={{ paddingLeft: '2rem', height: '80px', resize: 'vertical' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={submitting}
            >
              {submitting ? 'Recording Inward...' : 'Add Stock Entry'}
            </button>
          </form>
        </div>

        {/* Right Side: Stock History Log */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div className="flex-gap-3">
              <ClipboardList size={22} className="text-primary" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Arrival History</h3>
            </div>
            
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search logs..."
                className="form-control"
                style={{ paddingLeft: '1.8rem', paddingRight: '0.5rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.8rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
              No stock entries match your search.
            </p>
          ) : (
            <div className="table-container" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item Details</th>
                    <th>Qty Added</th>
                    <th>Supplier</th>
                    <th>Cost Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.itemId?.name || 'Deleted Item'}</div>
                        {log.itemId && (log.itemId.brand || log.itemId.variety) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({log.itemId.brand || 'No Brand'} - {log.itemId.variety || 'No Variety'})
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {new Date(log.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-success" style={{ fontWeight: 600 }}>
                          +{log.quantity} {log.itemId?.unit || 'kg'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {log.supplier || 'N/A'}
                        {log.notes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes}>
                            Note: {log.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          ₹{(log.quantity * log.unitPrice).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ₹{log.unitPrice}/unit
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
