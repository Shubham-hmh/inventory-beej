'use client';

import { useState, useEffect, useRef } from 'react';
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
  Plus,
  FileText,
  UserCheck
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

interface ExistingSale {
  _id: string;
  customerId: any;
  invoiceNumber: string;
  totalAmount: number;
  items: any[];
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

export default function NewSale() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [existingSales, setExistingSales] = useState<ExistingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [detectedCustomer, setDetectedCustomer] = useState<Customer | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<ExistingSale | null>(null);
  const [nameSuggestions, setNameSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Cart Build State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleQty, setSaleQty] = useState('');
  const [itemDiscount, setItemDiscount] = useState('');
  const [billDiscount, setBillDiscount] = useState('');

  // Sale metadata
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Credit'>('Cash');
  const [notes, setNotes] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  // Receipts / Modals
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const resItems = await fetch('/api/items');
      const dataItems = await resItems.json();
      if (dataItems.success) setItems(dataItems.data || []);

      const resCust = await fetch('/api/customers');
      const dataCust = await resCust.json();
      if (dataCust.success) setCustomers(dataCust.data || []);

      const resSales = await fetch('/api/sales');
      const dataSales = await resSales.json();
      if (dataSales.success) setExistingSales(dataSales.data || []);
    } catch (err) {
      setError('Error loading inventory and customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL query param: e.g. /sales/new?customerId=123
  useEffect(() => {
    if (typeof window !== 'undefined' && customers.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const cId = params.get('customerId');
      if (cId) {
        const match = customers.find(c => c._id === cId);
        if (match) {
          selectCustomer(match);
        }
      }
    }
  }, [customers, existingSales]);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find latest existing sale for a customer
  const findCustomerExistingSale = (customerId: string): ExistingSale | null => {
    const custSale = existingSales.find(sale => {
      if (!sale.customerId) return false;
      const sId = typeof sale.customerId === 'object' ? sale.customerId._id : sale.customerId;
      return sId === customerId;
    });
    return custSale || null;
  };

  // Helper to select an existing customer
  const selectCustomer = (cust: Customer) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setCustomerAddress(cust.address || '');
    setDetectedCustomer(cust);
    setIsNewCustomer(false);
    setShowSuggestions(false);

    const sale = findCustomerExistingSale(cust._id);
    setExistingInvoice(sale);
  };

  // Handle customer name change with auto-detection
  const handleNameChange = (val: string) => {
    setCustomerName(val);

    if (isNewCustomer) {
      setNameSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setDetectedCustomer(null);
      setExistingInvoice(null);
      setNameSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter matching customers for suggestions
    const matches = customers.filter(c => 
      c.name.toLowerCase().includes(trimmed.toLowerCase()) || (c.phone && c.phone.includes(trimmed))
    );
    setNameSuggestions(matches);
    setShowSuggestions(matches.length > 0);

    // Exact name match auto-detection (case-insensitive)
    const exactMatch = customers.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exactMatch) {
      setCustomerPhone(exactMatch.phone);
      setCustomerAddress(exactMatch.address || '');
      setDetectedCustomer(exactMatch);
      const sale = findCustomerExistingSale(exactMatch._id);
      setExistingInvoice(sale);
    } else {
      // If no exact name match, check if phone matches an existing customer
      const phoneMatch = customers.find(c => customerPhone && c.phone && c.phone.trim() === customerPhone.trim());
      if (phoneMatch) {
        setDetectedCustomer(phoneMatch);
        const sale = findCustomerExistingSale(phoneMatch._id);
        setExistingInvoice(sale);
      } else {
        setDetectedCustomer(null);
        setExistingInvoice(null);
      }
    }
  };

  // Monitor phone input to auto-associate existing customer immediately
  const handlePhoneChange = (val: string) => {
    setCustomerPhone(val);

    if (isNewCustomer) return;

    const clean = val.trim();
    if (clean) {
      const match = customers.find(c => c.phone && c.phone.trim() === clean);
      if (match) {
        setCustomerName(match.name);
        setCustomerAddress(match.address || '');
        setDetectedCustomer(match);
        const sale = findCustomerExistingSale(match._id);
        setExistingInvoice(sale);
        return;
      }
    }

    // If phone doesn't match directly, check if current name matches
    if (customerName.trim()) {
      const nameMatch = customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
      if (nameMatch) {
        setDetectedCustomer(nameMatch);
        const sale = findCustomerExistingSale(nameMatch._id);
        setExistingInvoice(sale);
        return;
      }
    }

    setDetectedCustomer(null);
    setExistingInvoice(null);
  };

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
    const rawPrice = Number(salePrice);
    const disc = Math.max(0, Number(itemDiscount) || 0);
    const finalPrice = Math.max(0, rawPrice - disc);
    const matchItem = items.find(it => it._id === selectedItemId);

    if (!matchItem) return;
    if (qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(c => c.itemId === selectedItemId && c.price === finalPrice);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += qty;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          itemId: matchItem._id,
          name: matchItem.name,
          brand: matchItem.brand,
          variety: matchItem.variety,
          quantity: qty,
          price: finalPrice,
          unit: matchItem.unit,
          maxStock: matchItem.stock,
        },
      ]);
    }

    // Reset item selector
    setSelectedProductName('');
    setSelectedBrand('');
    setSelectedVariety('');
    setSelectedItemId('');
    setSaleQty('');
    setSalePrice('');
    setItemDiscount('');
    setError('');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const subtotalVal = cart.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
  const discountVal = Math.max(0, Number(billDiscount) || 0);
  const totalInvoiceVal = Math.max(0, subtotalVal - discountVal);

  const calculateTotal = () => totalInvoiceVal;

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) {
      setError('Customer name is required.');
      return;
    }
    if (isNewCustomer && !customerPhone) {
      setError('Phone number is required when registering as a new customer.');
      return;
    }
    if (cart.length === 0) {
      setError('Invoice must contain at least one product.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      // Auto-resolve customer ID if not already explicitly linked and not isNewCustomer
      let targetCustId = !isNewCustomer && detectedCustomer ? detectedCustomer._id : undefined;
      if (!targetCustId && !isNewCustomer) {
        const cleanN = customerName.trim().toLowerCase();
        const cleanP = customerPhone.trim();
        const matched = customers.find(c => 
          (cleanP && c.phone && c.phone.trim() === cleanP) ||
          (cleanN && c.name && c.name.trim().toLowerCase() === cleanN)
        );
        if (matched) {
          targetCustId = matched._id;
        }
      }

      const payload = {
        customer: {
          id: targetCustId,
          name: customerName,
          phone: customerPhone,
          address: customerAddress
        },
        isNewCustomer,
        discount: discountVal,
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
        if (data.isAppended) {
          setSuccess(`Items successfully added to existing invoice #${data.data.invoiceNumber}!`);
        } else {
          setSuccess(`Sale registered successfully (Invoice #${data.data.invoiceNumber})!`);
        }

        setCreatedInvoice({
          ...data.data,
          customer: { name: customerName, phone: customerPhone, address: customerAddress },
          items: data.data.items || cart,
          isAppended: data.isAppended
        });

        // Reset inputs
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setNotes('');
        setBillDiscount('');
        setItemDiscount('');
        setIsNewCustomer(false);
        setDetectedCustomer(null);
        setExistingInvoice(null);
        setShowReceipt(true);

        // Reload data to get latest sales and customer state
        loadData();
      } else {
        setError(data.error || 'Failed to complete checkout');
      }
    } catch (err) {
      setError('Network error checking out invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Distinct product names for cascading selector
  const distinctProductNames = Array.from(new Set(items.map(it => it.name)));
  
  // Brands available for selected product
  const availableBrands = selectedProductName
    ? Array.from(
        new Set(
          items
            .filter(it => it.name === selectedProductName)
            .map(it => it.brand || 'No Brand')
        )
      )
    : [];

  // Varieties available for selected product and brand
  const availableVarieties = (selectedProductName && selectedBrand)
    ? Array.from(
        new Set(
          items
            .filter(it => 
              it.name === selectedProductName && 
              (it.brand || 'No Brand') === selectedBrand
            )
            .map(it => it.variety || 'No Variety')
        )
      )
    : [];

  const activeItem = items.find(it => it._id === selectedItemId);

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

            {/* Quick Customer Picker */}
            {!isNewCustomer && customers.length > 0 && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Quick Select Existing Customer</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({customers.length} registered)</span>
                </label>
                <select
                  className="form-control"
                  value={detectedCustomer?._id || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) {
                      setDetectedCustomer(null);
                      setExistingInvoice(null);
                      return;
                    }
                    const cust = customers.find(c => c._id === selectedId);
                    if (cust) {
                      selectCustomer(cust);
                    }
                  }}
                  style={{ borderColor: detectedCustomer ? 'var(--primary)' : undefined }}
                >
                  <option value="">-- Choose Existing Customer (or type below) --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} — Phone: {c.phone}{c.address ? ` (${c.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Name with Autocomplete & Datalist */}
            <div className="form-group" style={{ position: 'relative' }} ref={suggestionRef}>
              <label className="form-label">Customer Name *</label>
              <input 
                type="text" 
                placeholder="Type customer name (e.g. Ramesh Singh)" 
                className="form-control"
                required
                list="existing-customers-datalist"
                value={customerName}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => {
                  if (nameSuggestions.length > 0 && !isNewCustomer) {
                    setShowSuggestions(true);
                  }
                }}
                autoComplete="off"
              />

              <datalist id="existing-customers-datalist">
                {customers.map(c => (
                  <option key={c._id} value={c.name}>
                    {c.phone}{c.address ? ` • ${c.address}` : ''}
                  </option>
                ))}
              </datalist>

              {/* Suggestions Dropdown */}
              {showSuggestions && nameSuggestions.length > 0 && !isNewCustomer && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-hover)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}
                >
                  <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    Matching Existing Customers:
                  </div>
                  {nameSuggestions.map((cust) => (
                    <div
                      key={cust._id}
                      onClick={() => selectCustomer(cust)}
                      style={{
                        padding: '0.6rem 0.85rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {cust.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Phone: {cust.phone} {cust.address ? `• ${cust.address}` : ''}
                        </div>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkbox: Create as New Customer */}
            <div style={{ margin: '0.5rem 0 1rem 0' }}>
              <label 
                htmlFor="isNewCustomerCheckbox" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: isNewCustomer ? 'var(--accent)' : 'var(--text-secondary)'
                }}
              >
                <input 
                  type="checkbox"
                  id="isNewCustomerCheckbox"
                  checked={isNewCustomer}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsNewCustomer(checked);
                    if (checked) {
                      setDetectedCustomer(null);
                      setExistingInvoice(null);
                      setShowSuggestions(false);
                      // Clear phone if it was auto-filled from an existing customer
                      setCustomerPhone('');
                      setCustomerAddress('');
                    } else {
                      // Re-check detection with current name
                      handleNameChange(customerName);
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <span>Create as new customer (if same name exists already)</span>
              </label>
            </div>

            {/* Existing Customer Auto-Detected Banner */}
            {detectedCustomer && !isNewCustomer && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.75rem 1rem', 
                  marginBottom: '1.25rem' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <UserCheck size={18} />
                  <span>Existing Customer Linked: {detectedCustomer.name}</span>
                </div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {existingInvoice ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                      <FileText size={14} className="text-primary" />
                      <span>
                        Existing Invoice <strong>#{existingInvoice.invoiceNumber}</strong> detected. New items will be automatically appended into this existing record.
                      </span>
                    </div>
                  ) : (
                    <span>Customer profile linked. A new initial invoice will be created for this customer.</span>
                  )}
                </div>
              </div>
            )}

            {/* New Customer Flag Banner */}
            {isNewCustomer && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  border: '1px solid rgba(245, 158, 11, 0.25)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.6rem 0.9rem', 
                  marginBottom: '1.25rem' 
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 500 }}>
                  Treating as a separate new customer profile. Please enter their unique phone number. A new invoice ID will be generated.
                </span>
              </div>
            )}

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                type="tel"
                placeholder="Type phone (10 digits)"
                maxLength={12}
                className="form-control"
                required
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
            </div>

            {/* Address */}
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

            {/* Product selection */}
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
                {distinctProductNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Brand & Variety */}
            {selectedProductName && (
              <div className="grid-2col">
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <select
                    className="form-control"
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      setSelectedVariety('');
                    }}
                  >
                    <option value="">-- Select Brand --</option>
                    {availableBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Variety</label>
                  <select
                    className="form-control"
                    value={selectedVariety}
                    disabled={!selectedBrand}
                    onChange={(e) => setSelectedVariety(e.target.value)}
                  >
                    <option value="">-- Select Variety --</option>
                    {availableVarieties.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Quantity and Price */}
            {activeItem && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Available Stock:</span>
                  <span className={`badge ${activeItem.stock > 10 ? 'badge-success' : 'badge-danger'}`}>
                    {activeItem.stock} {cleanUnitName(activeItem.unit) || 'units'} in stock
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Quantity {cleanUnitName(activeItem.unit) ? `(${cleanUnitName(activeItem.unit)})` : ''} *
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      min="0.1"
                      className="form-control"
                      value={saleQty}
                      onChange={(e) => setSaleQty(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Price / Unit (₹) *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      className="form-control"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Item Discount (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      placeholder="0"
                      className="form-control"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(e.target.value)}
                    />
                  </div>
                </div>

                {itemDiscount && Number(itemDiscount) > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 500 }}>
                    ✓ Net Unit Price: ₹{Math.max(0, Number(salePrice || 0) - Number(itemDiscount))} / {cleanUnitName(activeItem.unit) || 'unit'} (₹{itemDiscount} off)
                  </div>
                )}

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  onClick={handleAddToInvoice}
                >
                  <Plus size={16} />
                  <span>Add Product to Bill</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Summary & Bill Finalization */}
        <div>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Billing Cart</h3>
                {existingInvoice && !isNewCustomer && (
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                    Appending to #{existingInvoice.invoiceNumber}
                  </span>
                )}
              </div>
              <span className="badge badge-primary">{cart.length} items</span>
            </div>

            {/* Cart Table */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <ShoppingBag size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No products added yet. Pick from left panel.</p>
              </div>
            ) : (
              <div className="table-container" style={{ margin: '0 0 1.5rem 0', border: 'none', backgroundColor: 'transparent' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((cItem, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{cItem.name}</div>
                          {(cItem.brand || cItem.variety) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {cItem.brand} - {cItem.variety}
                            </div>
                          )}
                        </td>
                        <td>{formatDisplayQty(cItem.quantity, cItem.unit)}</td>
                        <td>₹{cItem.price}</td>
                        <td className="text-right" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          ₹{(cItem.quantity * cItem.price).toLocaleString('en-IN')}
                        </td>
                        <td className="text-right">
                          <button 
                            className="btn btn-danger btn-icon" 
                            onClick={() => handleRemoveFromCart(idx)}
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sale metadata */}
            <div className="grid-2col" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment Mode</label>
                <select 
                  className="form-control"
                  value={paymentMode}
                  onChange={(e: any) => setPaymentMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / Online</option>
                  <option value="Credit">Credit (Udhaar)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Sale Date</label>
                <input 
                  type="date"
                  className="form-control"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Notes / Remarks (Optional)</label>
              <input 
                type="text"
                placeholder="e.g. Due next month, or discount notes"
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Bill-level Discount */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Bill Discount (₹)</span>
                {discountVal > 0 && (
                  <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                    -₹{discountVal.toLocaleString('en-IN')} off total
                  </span>
                )}
              </label>
              <input 
                type="number"
                step="any"
                min="0"
                placeholder="Enter overall discount in ₹ (optional)"
                className="form-control"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
              />
            </div>

            <div className="flex-between" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {discountVal > 0 ? (
                    <span>Subtotal: ₹{subtotalVal.toLocaleString('en-IN')} | Discount: -₹{discountVal.toLocaleString('en-IN')}</span>
                  ) : (
                    <span>{existingInvoice && !isNewCustomer ? 'New Items Total' : 'Grand Total Amount'}</span>
                  )}
                </div>
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
                <span>
                  {submitting 
                    ? 'Saving...' 
                    : existingInvoice && !isNewCustomer 
                      ? 'Append to Existing Invoice' 
                      : 'Check Out / Save'}
                </span>
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
                <span>
                  {createdInvoice.isAppended 
                    ? `Existing Invoice #${createdInvoice.invoiceNumber} Updated` 
                    : 'Sale Completed Successfully'}
                </span>
              </h3>
              <button className="modal-close" onClick={() => setShowReceipt(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" id="printable-receipt" style={{ color: '#000000', backgroundColor: '#ffffff', borderRadius: 'var(--radius-md)', padding: '2rem', fontFamily: 'Courier, monospace' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>KISAN BEEJ BHANDAR</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Stock & Fertilizer Management System</p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Phone: {createdInvoice.customer?.phone || 'N/A'}</p>
                <div style={{ borderBottom: '1px dashed #000000', margin: '1rem 0' }} />
              </div>

              {createdInvoice.isAppended && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', color: '#166534', textAlign: 'center' }}>
                  ✓ Existing Customer: New items added to ledger invoice #{createdInvoice.invoiceNumber}
                </div>
              )}

              <div style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div><strong>Invoice No:</strong> {createdInvoice.invoiceNumber || createdInvoice._id}</div>
                <div><strong>Date:</strong> {new Date(createdInvoice.date).toLocaleDateString()}</div>
                <div><strong>Customer:</strong> {createdInvoice.customer?.name}</div>
                {createdInvoice.customer?.address && <div><strong>Address:</strong> {createdInvoice.customer.address}</div>}
                <div><strong>Payment:</strong> {createdInvoice.paymentMode}</div>
                <div><strong>Cashier Initials:</strong> {createdInvoice.invoiceNumber ? createdInvoice.invoiceNumber.replace(/[0-9]/g, '') : 'N/A'}</div>
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
                  {createdInvoice.items.map((it: any, index: number) => {
                    const itemName = it.itemId?.name || it.name || 'Product';
                    const itemBrand = it.itemId?.brand || it.brand;
                    const itemVariety = it.itemId?.variety || it.variety;
                    const itemUnit = it.itemId?.unit || it.unit || 'kg';

                    return (
                      <tr key={index}>
                        <td style={{ padding: '0.5rem 0' }}>
                          <div>{itemName}</div>
                          {(itemBrand || itemVariety) && (
                            <div style={{ fontSize: '0.75rem', color: '#666666' }}>
                              ({itemBrand || 'No Brand'} - {itemVariety || 'No Variety'})
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.5rem 0' }}>{formatDisplayQty(it.quantity, itemUnit)}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{it.price.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>₹{(it.quantity * it.price).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #000000', paddingTop: '0.5rem' }}>
                {createdInvoice.discount && createdInvoice.discount > 0 ? (
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span>₹{(createdInvoice.totalAmount + createdInvoice.discount).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 600 }}>
                      <span>Discount:</span>
                      <span>-₹{createdInvoice.discount.toFixed(2)}</span>
                    </div>
                  </div>
                ) : null}
                <div style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  GRAND TOTAL: ₹{createdInvoice.totalAmount.toFixed(2)}
                </div>
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
