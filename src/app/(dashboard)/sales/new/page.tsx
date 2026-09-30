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
  UserCheck,
  Search,
  Sparkles,
  DollarSign,
  Package,
  Receipt
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
  category?: string;
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
  const [itemMode, setItemMode] = useState<'catalog' | 'custom'>('catalog');
  
  // Catalog item fields
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedVariety, setSelectedVariety] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [saleQty, setSaleQty] = useState('');
  const [itemDiscount, setItemDiscount] = useState('');

  // Custom item fields (not in stock)
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Other');
  const [customUnit, setCustomUnit] = useState('kg');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customDiscount, setCustomDiscount] = useState('');

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

  // Direct item selection helper
  const handleDirectItemSelect = (itemId: string) => {
    if (!itemId) {
      setSelectedItemId('');
      setSelectedProductName('');
      setSelectedBrand('');
      setSelectedVariety('');
      setSalePrice('');
      setSaleQty('');
      return;
    }

    const match = items.find(it => it._id === itemId);
    if (match) {
      setSelectedItemId(match._id);
      setSelectedProductName(match.name);
      setSelectedBrand(match.brand || 'No Brand');
      setSelectedVariety(match.variety || 'No Variety');
      setSalePrice(match.price.toString());
      setSaleQty('1');
    }
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
        setSalePrice(match.price.toString());
        if (!saleQty) setSaleQty('1');
        return;
      }
    }
  }, [selectedProductName, selectedBrand, selectedVariety, items]);

  const handleAddToInvoice = () => {
    if (!selectedItemId || !saleQty || !salePrice) {
      setError('Please select a product, quantity, and unit price.');
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

  const handleAddCustomToInvoice = () => {
    if (!customName.trim() || !customPrice || !customQty) {
      setError('Please enter product name, selling rate, and quantity for custom product.');
      return;
    }

    const qty = Number(customQty);
    const rawPrice = Number(customPrice);
    const disc = Math.max(0, Number(customDiscount) || 0);
    const finalPrice = Math.max(0, rawPrice - disc);

    if (qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    setCart([
      ...cart,
      {
        itemId: '',
        name: customName.trim(),
        category: customCategory,
        unit: customUnit || 'kg',
        brand: '',
        variety: '',
        quantity: qty,
        price: finalPrice,
        maxStock: 999999,
      },
    ]);

    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
    setCustomDiscount('');
    setError('');
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const subtotalVal = cart.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
  const discountVal = Math.max(0, Number(billDiscount) || 0);
  const totalInvoiceVal = Math.max(0, subtotalVal - discountVal);

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
      setError('Invoice must contain at least one product in the cart.');
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
          itemId: c.itemId || undefined,
          name: c.name,
          category: c.category,
          unit: c.unit,
          brand: c.brand,
          variety: c.variety,
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

  // Common dark select option styling for crisp text contrast across all browsers
  const selectStyle = {
    backgroundColor: '#111827',
    color: '#f3f4f6',
    borderColor: 'rgba(255, 255, 255, 0.15)'
  };
  const optionStyle = {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    padding: '8px'
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={26} style={{ color: 'var(--primary)' }} />
            New Sale / POS Counter
          </h1>
          <p>Create bills, apply item/bill discounts, auto-link customer history & issue receipts</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid-split-pos">
        {/* Left Side: Customer Info & Product Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Customer Card */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1. Buyer Information</h3>
              </div>
              {detectedCustomer && !isNewCustomer && (
                <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                  ✓ Existing Customer
                </span>
              )}
            </div>

            {/* Quick Customer Dropdown */}
            {!isNewCustomer && customers.length > 0 && (
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Quick Select Registered Customer</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({customers.length} in database)</span>
                </label>
                <select
                  className="form-control"
                  style={selectStyle}
                  value={detectedCustomer?._id || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (!selectedId) {
                      setDetectedCustomer(null);
                      setExistingInvoice(null);
                      return;
                    }
                    const cust = customers.find(c => c._id === selectedId);
                    if (cust) selectCustomer(cust);
                  }}
                >
                  <option value="" style={optionStyle}>-- Pick Existing Customer (or type below) --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id} style={optionStyle}>
                      {c.name} — Phone: {c.phone} {c.address ? `(${c.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Name input with autosearch */}
            <div className="form-group" style={{ position: 'relative' }} ref={suggestionRef}>
              <label className="form-label">Customer Name *</label>
              <input 
                type="text" 
                placeholder="Type name (e.g. Ramesh Kumar)" 
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
                    zIndex: 30,
                    backgroundColor: '#1f2937',
                    border: '1px solid var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}
                >
                  <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    Matching Customers:
                  </div>
                  {nameSuggestions.map((cust) => (
                    <div
                      key={cust._id}
                      onClick={() => selectCustomer(cust)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f9fafb' }}>
                          {cust.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
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

            {/* Checkbox: New Customer */}
            <div style={{ margin: '0.5rem 0 1rem 0' }}>
              <label 
                htmlFor="isNewCustomerCheckbox" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: '0.85rem',
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
                      setCustomerPhone('');
                      setCustomerAddress('');
                    } else {
                      handleNameChange(customerName);
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <span>Register as a new customer profile (if same name exists)</span>
              </label>
            </div>

            {/* Existing Customer Auto-Detected Banner */}
            {detectedCustomer && !isNewCustomer && (
              <div 
                style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.12)', 
                  border: '1px solid rgba(16, 185, 129, 0.35)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '0.75rem 1rem', 
                  marginBottom: '1.25rem' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <UserCheck size={18} />
                  <span>Linked Customer: {detectedCustomer.name}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {existingInvoice ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                      <FileText size={14} className="text-primary" />
                      <span>
                        Existing invoice <strong>#{existingInvoice.invoiceNumber}</strong> found. New items will be automatically appended.
                      </span>
                    </div>
                  ) : (
                    <span>Customer profile linked. A new invoice will be generated.</span>
                  )}
                </div>
              </div>
            )}

            {/* Phone & Address Inputs */}
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number *</label>
                <input 
                  type="tel"
                  placeholder="10 digit phone"
                  maxLength={12}
                  className="form-control"
                  required
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Address (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Village / Town" 
                  className="form-control"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Product Selector Card */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} style={{ color: '#a855f7' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2. Select Products</h3>
              </div>
              <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                {items.length} Items Available
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setItemMode('catalog')}
                className={`btn ${itemMode === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.6rem' }}
              >
                <Package size={15} />
                <span>Catalog Stock Items</span>
              </button>
              <button
                type="button"
                onClick={() => setItemMode('custom')}
                className={`btn ${itemMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.6rem' }}
              >
                <Plus size={15} />
                <span>+ Custom Direct Item</span>
              </button>
            </div>

            {itemMode === 'catalog' ? (
              <>
                {/* Direct 1-Click Product Selector Dropdown */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#f3f4f6' }}>
                    ⚡ Instant Product Dropdown (1-Click Selection)
                  </label>
                  <select
                    className="form-control"
                    style={selectStyle}
                    value={selectedItemId}
                    onChange={(e) => handleDirectItemSelect(e.target.value)}
                  >
                    <option value="" style={optionStyle}>-- Direct Search & Choose Item --</option>
                    {items.map(it => (
                      <option key={it._id} value={it._id} style={optionStyle}>
                        {it.name} {it.brand ? `[${it.brand}]` : ''} {it.variety ? `(${it.variety})` : ''} — ₹{it.price}/{cleanUnitName(it.unit) || 'unit'} (Stock: {it.stock} {cleanUnitName(it.unit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
                  — OR FILTER BY CATEGORY / BRAND —
                </div>

                {/* Cascading Filter Selection */}
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <select
                    className="form-control"
                    style={selectStyle}
                    value={selectedProductName}
                    onChange={(e) => {
                      setSelectedProductName(e.target.value);
                      setSelectedBrand('');
                      setSelectedVariety('');
                      setSelectedItemId('');
                    }}
                  >
                    <option value="" style={optionStyle}>-- Choose Product Name --</option>
                    {distinctProductNames.map(name => (
                      <option key={name} value={name} style={optionStyle}>{name}</option>
                    ))}
                  </select>
                </div>

                {selectedProductName && (
                  <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Brand</label>
                      <select
                        className="form-control"
                        style={selectStyle}
                        value={selectedBrand}
                        onChange={(e) => {
                          setSelectedBrand(e.target.value);
                          setSelectedVariety('');
                          setSelectedItemId('');
                        }}
                      >
                        <option value="" style={optionStyle}>-- Choose Brand --</option>
                        {availableBrands.map(b => (
                          <option key={b} value={b} style={optionStyle}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Variety</label>
                      <select
                        className="form-control"
                        style={selectStyle}
                        value={selectedVariety}
                        disabled={!selectedBrand}
                        onChange={(e) => setSelectedVariety(e.target.value)}
                      >
                        <option value="" style={optionStyle}>-- Choose Variety --</option>
                        {availableVarieties.map(v => (
                          <option key={v} value={v} style={optionStyle}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Quantity, Unit Price, Item Discount Input */}
                {activeItem && (
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginTop: '1rem'
                  }}>
                    <div className="flex-between" style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Selected: <span style={{ color: 'var(--primary)' }}>{activeItem.name}</span>
                        {activeItem.variety ? ` (${activeItem.variety})` : ''}
                      </div>
                      <span className={`badge ${activeItem.stock > 10 ? 'badge-success' : 'badge-danger'}`}>
                        Available Stock: {activeItem.stock} {cleanUnitName(activeItem.unit) || 'units'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
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

                      <div className="form-group" style={{ margin: 0 }}>
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

                      <div className="form-group" style={{ margin: 0 }}>
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
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.75rem', fontWeight: 600 }}>
                        ✓ Net Unit Rate: ₹{Math.max(0, Number(salePrice || 0) - Number(itemDiscount))} / {cleanUnitName(activeItem.unit) || 'unit'} (Discount: ₹{itemDiscount})
                      </div>
                    )}

                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem' }}
                      onClick={handleAddToInvoice}
                    >
                      <Plus size={18} />
                      <span>Add Product to Cart</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Custom Direct Non-Catalog Item Form */
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--primary)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '1rem' }}>
                  ✨ Sell Direct / Non-Catalog Product (No stock entry required)
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Custom Hybrid Seeds or Special Fertilizer" 
                    className="form-control"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div className="grid-2col" style={{ marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Category</label>
                    <select 
                      className="form-control" 
                      style={selectStyle} 
                      value={customCategory} 
                      onChange={(e) => setCustomCategory(e.target.value)}
                    >
                      <option value="Seeds" style={optionStyle}>Seeds</option>
                      <option value="Fertilizer" style={optionStyle}>Fertilizer</option>
                      <option value="Pesticide" style={optionStyle}>Pesticide</option>
                      <option value="Tools" style={optionStyle}>Tools</option>
                      <option value="Other" style={optionStyle}>Other</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Unit of Measure</label>
                    <input 
                      type="text" 
                      placeholder="e.g. kg, bag, pkt, litre" 
                      className="form-control"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Quantity *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0.1"
                      className="form-control"
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Selling Rate / Unit (₹) *</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      placeholder="Price per unit" 
                      className="form-control"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Discount (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      min="0"
                      placeholder="0" 
                      className="form-control"
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem' }}
                  onClick={handleAddCustomToInvoice}
                >
                  <Plus size={18} />
                  <span>Add Custom Product to Cart</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Billing Cart & Final Checkout */}
        <div>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={22} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>3. Billing Summary</h3>
              </div>
              {existingInvoice && !isNewCustomer ? (
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  Appending to #{existingInvoice.invoiceNumber}
                </span>
              ) : (
                <span className="badge badge-primary">{cart.length} items</span>
              )}
            </div>

            {/* Cart Items Table */}
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                <ShoppingBag size={48} style={{ margin: '0 auto 0.75rem auto', opacity: 0.3 }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Your cart is empty.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Select products from the left panel to begin billing.</p>
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
                        <td className="text-right" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          ₹{(cItem.quantity * cItem.price).toLocaleString('en-IN')}
                        </td>
                        <td className="text-right">
                          <button 
                            className="btn btn-danger btn-icon" 
                            onClick={() => handleRemoveFromCart(idx)}
                            title="Remove item"
                            style={{ padding: '0.35rem 0.5rem' }}
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

            {/* Payment Mode Selector Buttons */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Payment Method *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {(['Cash', 'UPI', 'Credit'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    style={{
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      border: paymentMode === mode ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: paymentMode === mode ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.03)',
                      color: paymentMode === mode ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {mode === 'Credit' ? 'Credit (Udhaar)' : mode === 'UPI' ? 'UPI / Online' : 'Cash'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sale Date & Notes */}
            <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Sale Date</label>
                <input 
                  type="date"
                  className="form-control"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Remarks / Notes</label>
                <input 
                  type="text"
                  placeholder="e.g. Due date or promo"
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Bill Level Discount */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Overall Bill Discount (₹)</span>
                {discountVal > 0 && (
                  <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                    -₹{discountVal.toLocaleString('en-IN')} off bill
                  </span>
                )}
              </label>
              <input 
                type="number"
                step="any"
                min="0"
                placeholder="Enter discount in ₹ (optional)"
                className="form-control"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
              />
            </div>

            {/* Grand Total Box & Checkout Button */}
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div className="flex-between">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {discountVal > 0 ? (
                      <span>Subtotal: ₹{subtotalVal.toLocaleString('en-IN')} | Discount: -₹{discountVal.toLocaleString('en-IN')}</span>
                    ) : (
                      <span>Net Payable Amount</span>
                    )}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                    ₹{totalInvoiceVal.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div>Items in Cart: {cart.length}</div>
                  <div>Payment: {paymentMode}</div>
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', fontWeight: 700 }}
                disabled={submitting || cart.length === 0}
                onClick={handleSubmitInvoice}
              >
                <CreditCard size={20} />
                <span>
                  {submitting 
                    ? 'Processing Invoice...' 
                    : existingInvoice && !isNewCustomer 
                      ? 'Append Items to Existing Invoice' 
                      : 'Complete Sale & Issue Bill'}
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
                <div><strong>Payment:</strong> {createdInvoice.paymentMode === 'Credit' ? 'Credit / Udhaar' : createdInvoice.paymentMode}</div>
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

