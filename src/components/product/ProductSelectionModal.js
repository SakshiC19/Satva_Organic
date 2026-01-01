import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiShoppingCart, FiMinus, FiPlus } from 'react-icons/fi';
import { useCart } from '../../contexts/CartContext';
import './ProductSelectionModal.css';

const ProductSelectionModal = ({ product, isOpen, onClose }) => {
  const { addToCart, openCart } = useCart();
  const [selectedWeight, setSelectedWeight] = useState(product.weight || '500g');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const {
    name,
    image,
    images,
    price,
    originalPrice,
    discount,
    weightOptions = ['250g', '500g', '1kg'],
    stock = 10
  } = product;

  const productImage = images && images.length > 0 
    ? (images[0].url || images[0]) 
    : image;

  const handleAddToCart = () => {
    addToCart({
      ...product,
      selectedWeight,
      quantity
    });
    onClose();
    openCart();
  };

  return createPortal(
    <div className="selection-modal-overlay" onClick={onClose}>
      <div className="selection-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}><FiX /></button>
        
        <div className="modal-body">
          <div className="product-preview">
            <img src={productImage} alt={name} />
          </div>
          
          <div className="product-details">
            <h3>{name}</h3>
            <div className="modal-price">
              <span className="current">₹{price}</span>
              {originalPrice && <span className="original">₹{originalPrice}</span>}
            </div>

            <div className="selection-group">
              <label>Select Weight</label>
              <div className="weight-options">
                {weightOptions.map(w => (
                  <button 
                    key={w}
                    className={`weight-btn ${selectedWeight === w ? 'active' : ''}`}
                    onClick={() => setSelectedWeight(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="selection-group">
              <label>Quantity</label>
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><FiMinus /></button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(stock, quantity + 1))}><FiPlus /></button>
              </div>
            </div>

            <button className="modal-add-btn" onClick={handleAddToCart}>
              <FiShoppingCart /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductSelectionModal;
