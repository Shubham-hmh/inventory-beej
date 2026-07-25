'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  X, 
  AlertCircle,
  FolderOpen
} from 'lucide-react';

interface Item {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
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
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
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
    }, 4000);
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
          unit
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Item successfully added to inventory!');
        setIsAddOpen(false);
        // Reset form
        setName('');
        setCategory('Seeds');
        setPrice('');
        setUnit('kg');
        setInitialStock('0');
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
          unit
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Item successfully updated!');
        setIsEditOpen(false);
        setSelectedItem(null);
        setName('');
        setPrice('');
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
        setSuccess('Item deleted successfully.');
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
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoriesList = ['All', 'Seeds', 'Fertilizer', 'Pesticide', 'Tools', 'Other'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Inventory Catalog</h1>
          <p>Configure product pricing, details, and initial stock registry</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Search & Category Filter bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search items by name or category..." 
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex-gap-2">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category:</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 500 }}
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
            No products match your filters. Try adding a new product to begin tracking!
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Available Stock</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item._id}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <span className="badge badge-info">{item.category}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{item.price.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>per {item.unit}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.stock < 10 ? 'badge-danger' : 'badge-success'}`} style={{ fontWeight: 600 }}>
                      {item.stock} {item.unit}
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
              <h3 className="modal-title">Add New Product</h3>
              <button className="modal-close" onClick={() => setIsAddOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddItem}>
              <div className="modal-body">
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
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Seeds">Seeds</option>
                      <option value="Fertilizer">Fertilizer</option>
                      <option value="Pesticide">Pesticide</option>
                      <option value="Tools">Tools</option>
                      <option value="Other">Other</option>
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
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Seeds">Seeds</option>
                      <option value="Fertilizer">Fertilizer</option>
                      <option value="Pesticide">Pesticide</option>
                      <option value="Tools">Tools</option>
                      <option value="Other">Other</option>
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
                  <span>Stock levels are modified only through Stock Inward and Sales billing.</span>
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
