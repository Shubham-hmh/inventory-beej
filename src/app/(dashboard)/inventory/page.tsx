'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  X, 
  AlertCircle,
  FolderOpen,
  Package,
  CheckCircle,
  TrendingUp,
  Layers
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

function cleanUnitName(rawUnit?: string): string {
  if (!rawUnit) return '';
  return rawUnit.replace(/^\d+(\.\d+)?\s*/, '').trim();
}

function formatDisplayQty(quantity: number | string, rawUnit?: string): string {
  const qty = Number(quantity) || 0;
  const unitName = cleanUnitName(rawUnit);
  return unitName ? `${qty} ${unitName}` : `${qty}`;
}

export default function Inventory() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Seeds');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [initialStock, setInitialStock] = useState('0');
  const [brand, setBrand] = useState('');
  const [variety, setVariety] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      // Role Guard Check: Employees cannot manage catalog
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.success && dataMe.data.role === 'employee') {
        window.location.href = '/sales/new';
        return;
      }

      const res = await fetch('/api/items');
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch items');
      }
    } catch (err: any) {
      setError('Error loading inventory items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const clearMessages = () => {
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !price) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          stock: Number(initialStock),
          unit,
          brand,
          variety
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.isMerged) {
          setSuccess(data.message || `Existing product found! Stock combined into existing item without duplicate entry.`);
        } else {
          setSuccess('New product successfully cataloged!');
        }
        setIsAddOpen(false);
        // Reset form
        setName('');
        setCategory('Seeds');
        setPrice('');
        setUnit('kg');
        setInitialStock('0');
        setBrand('');
        setVariety('');
        fetchItems();
      } else {
        setError(data.error || 'Failed to add item');
      }
    } catch (err: any) {
      setError('Network error adding item');
    }
    clearMessages();
  };

  const handleEditClick = (item: Item) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    setUnit(item.unit);
    setBrand(item.brand || '');
    setVariety(item.variety || '');
    setIsEditOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const res = await fetch(`/api/items/${selectedItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          unit,
          brand,
          variety
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Item details updated successfully!');
        setIsEditOpen(false);
        setSelectedItem(null);
        setName('');
        setPrice('');
        setBrand('');
        setVariety('');
        fetchItems();
      } else {
        setError(data.error || 'Failed to update item');
      }
    } catch (err) {
      setError('Network error updating item');
    }
    clearMessages();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item from inventory? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Item removed successfully from inventory.');
        fetchItems();
      } else {
        setError(data.error || 'Failed to delete item');
      }
    } catch (err) {
      setError('Network error deleting item');
    }
    clearMessages();
  };

  // Filter & Search logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
                          (item.variety && item.variety.toLowerCase().includes(search.toLowerCase())) ||
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoriesList = ['All', 'Seeds', 'Fertilizer', 'Pesticide', 'Tools', 'Other'];

  const outOfStockCount = items.filter(i => i.stock <= 0).length;
  const lowStockCount = items.filter(i => i.stock > 0 && i.stock < 10).length;

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
      {/* Header Banner */}
      <div className="page-header">
        <div className="page-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Package size={26} style={{ color: '#a855f7' }} />
            Inventory & Products Catalog
          </h1>
          <p>Product pricing, automatic duplicate consolidation, and stock tracking</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={18} />
          <span>Add Product</span>
        </button>
      </div>

      {success && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Search & Category Filter bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by product name, brand, variety or category..." 
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex-gap-2">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category:</span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 500 }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FolderOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Items Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No products match your search. Click "Add Product" above to catalog new items!
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Variety</th>
                <th>Category</th>
                <th>Selling Rate</th>
                <th>Current Stock</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item._id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                  <td>{item.brand || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Brand</span>}</td>
                  <td>{item.variety || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Variety</span>}</td>
                  <td>
                    <span className="badge badge-info">{item.category}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    ₹{item.price.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>per {cleanUnitName(item.unit) || 'unit'}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.stock <= 0 ? 'badge-danger' : item.stock < 10 ? 'badge-warning' : 'badge-success'}`} style={{ fontWeight: 600 }}>
                      {formatDisplayQty(item.stock, item.unit)}
                    </span>
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        onClick={() => handleEditClick(item)}
                        title="Edit Item Details"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-danger btn-icon" 
                        onClick={() => handleDeleteItem(item._id)}
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add / Restock Product</h3>
              <button className="modal-close" onClick={() => setIsAddOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="modal-body">
                <div 
                  style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.25)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '0.65rem 0.9rem', 
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--primary)'
                  }}
                >
                  ⚡ <strong>Auto-Consolidation:</strong> If an item with the same Product Name, Brand, & Variety exists, stock will be automatically added into the existing product without duplicate entries.
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Wheat Seeds Sonalika HD-2" 
                    className="form-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Pioneer, IFFCO" 
                      className="form-control"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Variety</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Lok-1, Neem Coated" 
                      className="form-control"
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-control"
                      style={selectStyle}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Seeds" style={optionStyle}>Seeds</option>
                      <option value="Fertilizer" style={optionStyle}>Fertilizer</option>
                      <option value="Pesticide" style={optionStyle}>Pesticide</option>
                      <option value="Tools" style={optionStyle}>Tools</option>
                      <option value="Other" style={optionStyle}>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. kg, bag, packet, litre" 
                      className="form-control"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Default Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Selling price" 
                      className="form-control"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Starting quantity" 
                      className="form-control"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Product Details</h3>
              <button className="modal-close" onClick={() => setIsEditOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input 
                    type="text" 
                    className="form-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Pioneer, IFFCO" 
                      className="form-control"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Variety</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Lok-1, Neem Coated" 
                      className="form-control"
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-control"
                      style={selectStyle}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Seeds" style={optionStyle}>Seeds</option>
                      <option value="Fertilizer" style={optionStyle}>Fertilizer</option>
                      <option value="Pesticide" style={optionStyle}>Pesticide</option>
                      <option value="Tools" style={optionStyle}>Tools</option>
                      <option value="Other" style={optionStyle}>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Selling Price (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.8rem', margin: 0 }}>
                  <AlertCircle size={16} />
                  <span>Stock levels are modified through Stock Inward and Sales billing.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsEditOpen(false); setSelectedItem(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
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

