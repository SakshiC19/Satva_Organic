import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiSearch, FiSave } from 'react-icons/fi';
import './DiscountsAndDeals.css';

const DiscountsAndDeals = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'));
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Initialize local state for editing if needed, though we'll edit directly
        editDiscount: doc.data().discount || 0,
        editDealType: doc.data().deal?.type || '',
        editDealDiscount: doc.data().deal?.discount || 0
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (productId, data) => {
    try {
      setSaving(prev => ({ ...prev, [productId]: true }));
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, data);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, ...data } : p
      ));
      
      alert('Updated successfully');
    } catch (error) {
      console.error('Error updating:', error);
      alert('Failed to update');
    } finally {
      setSaving(prev => ({ ...prev, [productId]: false }));
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="header-title-section">
          <h1 className="admin-page-title">Discounts & Deals</h1>
          <p className="header-subtitle">Manage product discounts and promotional deals</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="search-bar">
          <FiSearch />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Base Price</th>
              <th>Discount (%)</th>
              <th>Deal Settings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id}>
                <td>
                  <div className="product-cell">
                    {product.images?.[0]?.url && (
                      <img src={product.images[0].url} alt={product.name} className="product-thumb" />
                    )}
                    <span>{product.name}</span>
                  </div>
                </td>
                <td>₹{product.price}</td>
                <td>
                  <div className="input-group" style={{ maxWidth: '100px' }}>
                    <input
                      type="number"
                      defaultValue={product.discount || 0}
                      min="0"
                      max="100"
                      id={`disc-${product.id}`}
                      className="form-input-small"
                    />
                  </div>
                </td>
                <td>
                  <div className="deal-controls" style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    <select 
                      defaultValue={product.deal?.type || ''}
                      id={`deal-type-${product.id}`}
                      className="form-select-small"
                    >
                      <option value="">No Deal</option>
                      <option value="flash">Flash Deal</option>
                      <option value="special">Special Offer</option>
                      <option value="festival">Festival Deal</option>
                    </select>
                    {/* Additional deal fields could go here */}
                  </div>
                </td>
                <td>
                  <button 
                    className="btn-icon"
                    disabled={saving[product.id]}
                    onClick={() => {
                      const discVal = parseFloat(document.getElementById(`disc-${product.id}`).value) || 0;
                      const dealType = document.getElementById(`deal-type-${product.id}`).value;
                      
                      const updateData = {
                        discount: discVal,
                        deal: dealType ? {
                          ...product.deal,
                          type: dealType,
                          // Default values if new deal
                          discount: product.deal?.discount || discVal, // Use product discount as default deal discount?
                          start: product.deal?.start || new Date().toISOString(),
                          end: product.deal?.end || new Date(Date.now() + 86400000).toISOString()
                        } : null
                      };
                      
                      handleUpdate(product.id, updateData);
                    }}
                  >
                    <FiSave /> {saving[product.id] ? '...' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiscountsAndDeals;
