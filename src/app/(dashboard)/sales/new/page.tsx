'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  UserPlus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Printer, 
  X,
  CreditCard,
  Plus
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

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address?: string;
}

interface CartItem {
  itemId: string;
  name: string;
  brand?: string;
  variety?: string;
  quantity: number;
  price: number; // Sale price (can be custom)
  unit: string;
  maxStock: number;
}

export default function NewSale() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer Form State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);

  // Cart Build State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleQty, setSaleQty] = useState('');

  // Sale metadata
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Credit'>('Cash');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  // Receipts / Modals
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const resItems = await fetch('/api/items');
        const dataItems = await resItems.json();
        if (dataItems.success) setItems(dataItems.data || []);

        const resCust = await fetch('/api/customers');
        const dataCust = await resCust.json();
        if (dataCust.success) setCustomers(dataCust.data || []);
      } catch (err) {
        setError('Error loading inventory and customer records');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Monitor phone input to auto-associate existing customer
  useEffect(() => {
    if (customerPhone.length >= 10) {
      const match = customers.find(c => c.phone === customerPhone.trim());
      if (match) {
        setCustomerName(match.name);
        setCustomerAddress(match.address || '');
        setIsExistingCustomer(true);
      } else {
        setIsExistingCustomer(false);
      }
    } else {
      setIsExistingCustomer(false);
    }
  }, [customerPhone, customers]);

  // Automatically resolve selectedItemId based on cascading dropdowns
  useEffect(() => {
    if (selectedProductName && selectedBrand && selectedVariety) {
      const match = items.find(it => 
        it.name === selectedProductName && 
        (it.brand || 'No Brand') === selectedBrand && 
        (it.variety || 'No Variety') === selectedVariety
      );
      if (match) {
        setSelectedItemId(match._id);
        return;
      }
    }
    setSelectedItemId('');
  }, [selectedProductName, selectedBrand, selectedVariety, items]);

  // Handle selected item price fill
  useEffect(() => {
    if (selectedItemId) {
      const match = items.find(it => it._id === selectedItemId);
      if (match) {
        setSalePrice(match.price.toString());
        setSaleQty('1');
      }
    } else {
      setSalePrice('');
      setSaleQty('');
    }
  }, [selectedItemId, items]);

  const handleAddToInvoice = () => {
    if (!selectedItemId || !saleQty || !salePrice) {
      setError('Please select an item, quantity, and specify the selling price.');
      return;
    }

    const qty = Number(saleQty);
    const price = Number(salePrice);
    const matchItem = items.find(it => it._id === selectedItemId);

    if (!matchItem) return;
    if (qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(c => c.itemId === selectedItemId);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += qty;
      // Keep price customized if specified
      updatedCart[existingIndex].price = price;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          itemId: selectedItemId,
          name: matchItem.name,
          brand: matchItem.brand,
          variety: matchItem.variety,
          quantity: qty,
          price: price,
          unit: matchItem.unit,
          maxStock: matchItem.stock
        }
      ]);
    }

    // Clear item inputs
    setSelectedProductName('');
    setSelectedBrand('');
    setSelectedVariety('');
    setSelectedItemId('');
    setSaleQty('');
    setSalePrice('');
    setError('');
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const calculateTotal = () => {
    return cart.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      setError('Customer name and phone number are required.');
      return;
    }
    if (cart.length === 0) {
      setError('Invoice must contain at least one product.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const payload = {
        customer: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress
        },
        items: cart.map(c => ({
          itemId: c.itemId,
          quantity: c.quantity,
          price: c.price
        })),
        paymentMode,
        date: saleDate,
        notes
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Sale registered successfully!');
        setCreatedInvoice({
          ...data.data,
          customer: { name: customerName, phone: customerPhone, address: customerAddress },
          items: cart
        });
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setNotes('');
        setShowReceipt(true);
      } else {
        setError(data.error || 'Failed to complete checkout');
      }
    } catch (err) {
      setError('Network error checking out invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const activeItem = items.find(it => it._id === selectedItemId);
  const totalInvoiceVal = calculateTotal();

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>New Sale / Billing POS</h1>
          <p>Register customer invoices, collect payments, and automatically reconcile stock levels</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid-split-pos">
        {/* Left Side: Customer & Item input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Customer registry */}
          <div className="card">
            <div className="flex-gap-3" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <UserPlus size={20} className="text-primary" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Buyer Information</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                type="tel"
                placeholder="Type phone (10 digits)"
                maxLength={12}
                className="form-control"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              {isExistingCustomer && (
                <span className="badge badge-success" style={{ marginTop: '0.4rem' }}>
                  ✓ Existing Customer Linked
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input 
                type="text"
                placeholder="Enter customer name"
                className="form-control"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Address (Optional)</label>
              <input 
                type="text"
                placeholder="Village / Town name"
                className="form-control"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Add Cart Item */}
          <div className="card">
            <div className="flex-gap-3" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <ShoppingBag size={20} className="text-primary" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select Product</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Select Product *</label>
              <select
                className="form-control"
                value={selectedProductName}
                onChange={(e) => {
                  setSelectedProductName(e.target.value);
                  setSelectedBrand('');
                  setSelectedVariety('');
                }}
              >
                <option value="">-- Choose Product --</option>
                {Array.from(new Set(items.map(it => it.name))).sort().map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Brand *</label>
              <select
                className="form-control"
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedVariety('');
                }}
                disabled={!selectedProductName}
              >
                <option value="">-- Choose Brand --</option>
                {selectedProductName && Array.from(new Set(
                  items.filter(it => it.name === selectedProductName).map(it => it.brand || 'No Brand')
                )).sort().map(br => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Variety *</label>
              <select
                className="form-control"
                value={selectedVariety}
                onChange={(e) => setSelectedVariety(e.target.value)}
                disabled={!selectedBrand}
              >
                <option value="">-- Choose Variety --</option>
                {selectedBrand && Array.from(new Set(
                  items.filter(it => 
                    it.name === selectedProductName && 
                    (it.brand || 'No Brand') === selectedBrand
                  ).map(it => it.variety || 'No Variety')
                )).sort().map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {activeItem && (
              <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div>Stock Status: <strong>{activeItem.stock} {activeItem.unit}</strong> available</div>
                <div>Default Selling Price: <strong>₹{activeItem.price} / {activeItem.unit}</strong></div>
              </div>
            )}

            <div className="grid-2col">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5"
                  className="form-control"
                  value={saleQty}
                  onChange={(e) => setSaleQty(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="Price per unit"
                  className="form-control"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </div>
            </div>

            {activeItem && Number(saleQty) > activeItem.stock && (
              <div className="alert alert-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <AlertTriangle size={14} />
                <span>Quantity exceeds current inventory stock. Warning only.</span>
              </div>
            )}

            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={handleAddToInvoice}
              disabled={!selectedItemId}
            >
              <Plus size={16} />
              <span>Add to Invoice</span>
            </button>
          </div>
        </div>

        {/* Right Side: Invoice list (Cart) & Checkout details */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
          <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Active Invoice Cart</h3>
            <span className="badge badge-info">{cart.length} items</span>
          </div>

          {/* Cart table list */}
          <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem 1rem', fontSize: '0.9rem' }}>
                Invoice cart is empty. Choose buyer info and add items from the left.
              </div>
            ) : (
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((cartItem, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{cartItem.name}</div>
                        {(cartItem.brand || cartItem.variety) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            ({cartItem.brand || 'No Brand'} - {cartItem.variety || 'No Variety'})
                          </div>
                        )}
                        {cartItem.quantity > cartItem.maxStock && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--danger)', fontStyle: 'italic', marginTop: '0.1rem' }}>
                            (Warning: Low Stock)
                          </div>
                        )}
                      </td>
                      <td>₹{cartItem.price.toFixed(2)}</td>
                      <td>{cartItem.quantity} {cartItem.unit}</td>
                      <td className="text-right" style={{ fontWeight: 600 }}>
                        ₹{(cartItem.quantity * cartItem.price).toFixed(2)}
                      </td>
                      <td className="text-right">
                        <button 
                          className="btn btn-danger btn-icon" 
                          style={{ padding: '0.25rem' }}
                          onClick={() => handleRemoveFromCart(idx)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals & Metadata options */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment Mode *</label>
                <select 
                  className="form-control"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit">Credit / Udhaar</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Invoice Date *</label>
                <input 
                  type="date"
                  className="form-control"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Billing / Invoice Notes</label>
              <input 
                type="text" 
                placeholder="e.g. Paid via PhonePe, Pending delivery..."
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex-between" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Grand Total Amount</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{totalInvoiceVal.toLocaleString('en-IN')}
                </div>
              </div>
              
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ padding: '1rem 2rem' }}
                disabled={submitting || cart.length === 0}
                onClick={handleSubmitInvoice}
              >
                <CreditCard size={18} />
                <span>{submitting ? 'Checking out...' : 'Check Out / Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {showReceipt && createdInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} className="text-primary" />
                <span>Sale Completed Successfully</span>
              </h3>
              <button className="modal-close" onClick={() => setShowReceipt(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" id="printable-receipt" style={{ color: '#000000', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', padding: '2rem', fontFamily: 'Courier, monospace' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>KISAN BEEJ BHANDAR</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Stock & Fertilizer Management System</p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Phone: {createdInvoice.customer.phone}</p>
                <div style={{ borderBottom: '1px dashed #000000', margin: '1rem 0' }} />
              </div>

              <div style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div><strong>Invoice ID:</strong> {createdInvoice._id}</div>
                <div><strong>Date:</strong> {new Date(createdInvoice.date).toLocaleDateString()}</div>
                <div><strong>Customer:</strong> {createdInvoice.customer.name}</div>
                {createdInvoice.customer.address && <div><strong>Address:</strong> {createdInvoice.customer.address}</div>}
                <div><strong>Payment:</strong> {createdInvoice.paymentMode}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px dashed #000000' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {createdInvoice.items.map((it: any, index: number) => (
                    <tr key={index}>
                      <td style={{ padding: '0.5rem 0' }}>
                        <div>{it.name}</div>
                        {(it.brand || it.variety) && (
                          <div style={{ fontSize: '0.75rem', color: '#666666' }}>
                            ({it.brand || 'No Brand'} - {it.variety || 'No Variety'})
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.5rem 0' }}>{it.quantity} {it.unit}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{it.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{(it.quantity * it.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #000000', paddingTop: '0.5rem', textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold' }}>
                GRAND TOTAL: ₹{createdInvoice.totalAmount.toFixed(2)}
              </div>

              {createdInvoice.notes && (
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  Notes: {createdInvoice.notes}
                </div>
              )}

              <div style={{ borderTop: '1px dashed #000000', marginTop: '1.5rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.8rem' }}>
                <p>Thank you for buying with us!</p>
                <p>Kisan Bachao, Kisan Padhao.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  const printContents = document.getElementById('printable-receipt')?.innerHTML;
                  const originalContents = document.body.innerHTML;
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
                }}
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setShowReceipt(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
