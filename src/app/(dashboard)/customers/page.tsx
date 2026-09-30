'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Eye, 
  X, 
  Receipt,
  MapPin,
  Phone,
  Trash2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShoppingBag
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
    _id?: string;
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

interface DeleteTarget {
  customer: Customer;
  orderCount: number;
  totalSpent: number;
}

export default function CustomersRegistry() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected customer for history view
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Customer Delete Confirmation Modal (For customers with sales)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Search filter
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Role Guard Check: Employees cannot view directories
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.success && dataMe.data.role === 'employee') {
        window.location.href = '/sales/new';
        return;
      }

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
  };

  useEffect(() => {
    loadData();
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

  const handleDeleteCustomerPrompt = (cust: Customer) => {
    const metrics = getCustomerMetrics(cust._id);
    if (metrics.orderCount > 0) {
      // Open specialized confirmation modal with options
      setDeleteTarget({
        customer: cust,
        orderCount: metrics.orderCount,
        totalSpent: metrics.totalSpent,
      });
    } else {
      // 0 orders: Direct confirmation
      if (window.confirm(`Are you sure you want to delete customer profile "${cust.name}" (${cust.phone})? This action cannot be undone.`)) {
        executeDeleteCustomer(cust._id, false, cust.name);
      }
    }
  };

  const executeDeleteCustomer = async (id: string, deleteSales: boolean, customerName: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/customers/${id}?deleteSales=${deleteSales}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showNotification(
          deleteSales
            ? `Customer "${customerName}" and all associated sales records were deleted, and item stocks were restored.`
            : `Customer "${customerName}" profile deleted successfully.`
        );
        // Refresh local state
        setCustomers(prev => prev.filter(c => c._id !== id));
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        if (deleteSales) {
          // Remove deleted customer's sales from local sales state
          setSales(prev => prev.filter(s => {
            const cId = typeof s.customerId === 'object' ? s.customerId?._id : s.customerId;
            return cId !== id;
          }));
        }
        if (selectedCust?._id === id) {
          setIsModalOpen(false);
          setSelectedCust(null);
        }
        setDeleteTarget(null);
      } else {
        showNotification(data.error || 'Failed to delete customer profile.', true);
      }
    } catch (err: any) {
      showNotification('Network error occurred while deleting customer.', true);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmMsg = `Are you sure you want to delete ${count} selected customer profiles?\n\n` +
      `• Their profiles will be permanently removed from the directory.\n` +
      `• Any existing invoices will be preserved as Walk-in purchases.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setIsBulkDeleting(true);
      const res = await fetch('/api/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();

      if (data.success) {
        showNotification(`Successfully deleted ${count} customer profiles.`);
        setCustomers(prev => prev.filter(c => !selectedIds.includes(c._id)));
        setSelectedIds([]);
        if (selectedCust && selectedIds.includes(selectedCust._id)) {
          setIsModalOpen(false);
          setSelectedCust(null);
        }
      } else {
        showNotification(data.error || 'Failed to delete selected customers.', true);
      }
    } catch (err) {
      showNotification('Network error deleting selected customers.', true);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c._id));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Customers Directory</h1>
          <p>View registered farmer profiles, total purchase amounts, transaction logs, and manage accounts</p>
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

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
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
              Choose action for selected customer profiles:
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
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                    onChange={toggleSelectAll}
                    title="Select all customers"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Customer Profile</th>
                <th>Phone Number</th>
                <th>Village / Address</th>
                <th className="text-right">Total Visits</th>
                <th className="text-right">Total Purchased</th>
                <th className="text-right" style={{ minWidth: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => {
                const metrics = getCustomerMetrics(cust._id);
                const isSelected = selectedIds.includes(cust._id);
                const isThisDeleting = deletingId === cust._id;

                return (
                  <tr key={cust._id} style={{ backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCustomer(cust._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
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
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <Link 
                          href={`/sales/new?customerId=${cust._id}`}
                          className="btn btn-secondary btn-icon"
                          title="New Sale / Add to Existing Record"
                        >
                          <ShoppingBag size={16} />
                        </Link>
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
                        <button 
                          className="btn btn-danger btn-icon"
                          onClick={() => handleDeleteCustomerPrompt(cust)}
                          disabled={isThisDeleting || isBulkDeleting}
                          title="Delete Customer Profile (Admin)"
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
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => {
                    handleDeleteCustomerPrompt(selectedCust);
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Customer</span>
                </button>
                <Link
                  href={`/sales/new?customerId=${selectedCust._id}`}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ShoppingBag size={16} />
                  <span>New Sale / Add Bill</span>
                </Link>
              </div>

              <button type="button" className="btn btn-primary" onClick={() => { setIsModalOpen(false); setSelectedCust(null); }}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal (When customer has orders) */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ color: 'var(--danger)', display: 'flex' }}>
                  <AlertTriangle size={22} />
                </div>
                <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Confirm Customer Deletion</h3>
              </div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                You are about to delete the customer profile for <strong>&ldquo;{deleteTarget.customer.name}&rdquo;</strong> ({deleteTarget.customer.phone}).
              </p>

              <div 
                className="card" 
                style={{ 
                  margin: '0 0 1.25rem 0', 
                  padding: '1rem', 
                  backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                  border: '1px solid rgba(245, 158, 11, 0.25)' 
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Existing Sales Warning:
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  This buyer has <strong>{deleteTarget.orderCount} invoice(s)</strong> registered with a total spend of <strong>₹{deleteTarget.totalSpent.toLocaleString('en-IN')}</strong>.
                </p>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Please choose how you would like to handle their associated sales:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ textAlign: 'left', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}
                  onClick={() => executeDeleteCustomer(deleteTarget.customer._id, false, deleteTarget.customer.name)}
                  disabled={deletingId === deleteTarget.customer._id}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Delete Customer Only (Keep Sales Records)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Customer profile is removed. Existing {deleteTarget.orderCount} invoices are preserved in ledger as &quot;Walk-in Buyer&quot;.
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ textAlign: 'left', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}
                  onClick={() => executeDeleteCustomer(deleteTarget.customer._id, true, deleteTarget.customer.name)}
                  disabled={deletingId === deleteTarget.customer._id}
                >
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>
                    Delete Customer AND All Associated Sales
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Deletes the customer profile and removes all {deleteTarget.orderCount} sales invoices, returning item quantities to inventory stock.
                  </span>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.customer._id}
              >
                Cancel
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
