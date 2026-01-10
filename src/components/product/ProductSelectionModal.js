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
    packingSizes,
    weightOptions = ['250g', '500g', '1kg'],
    stock = 10
  } = product;

  const availableOptions = packingSizes && packingSizes.length > 0 ? packingSizes : weightOptions;

  const calculateDynamicPrice = (prod, size) => {
    if (!size || !prod) return prod?.price || 0;
    
    // Check for explicit price override first
    if (prod.sizePrices && prod.sizePrices[size]) {
      return parseFloat(prod.sizePrices[size]);
    }

    const match = size.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    if (!match) return prod.price;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    let multiplier = 1;
    
    if (unit === 'g' || unit === 'gm' || unit === 'ml') {
      multiplier = value / 100;
    } else if (unit === 'kg' || unit === 'l' || unit === 'liter') {
      multiplier = (value * 1000) / 100;
    } else if (unit === 'pc' || unit === 'pcs' || unit === 'pack') {
       multiplier = value;
    } else {
      return prod.price;
    }

    let finalPrice = prod.price * multiplier;

    if (prod.sizeDiscounts && prod.sizeDiscounts[size]) {
      const discount = parseFloat(prod.sizeDiscounts[size]);
      if (!isNaN(discount) && discount > 0) {
        finalPrice = finalPrice * (1 - discount / 100);
      }
    }

    return Math.round(finalPrice);
  };

  const currentPrice = calculateDynamicPrice(product, selectedWeight);

  const productImage = images && images.length > 0 
    ? (images[0].url || images[0]) 
    : image;

  const handleAddToCart = () => {
    addToCart({
      ...product,
      price: currentPrice,
      selectedWeight,
      selectedSize: selectedWeight, // Ensure compatibility
      quantity,
      basePrice: product.price
    });
    onClose();
    if (window.innerWidth > 768) {
      openCart();
    }
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
              <span className="current">₹{currentPrice}</span>
              <span className="unit-info" style={{fontSize: '0.8em', color: '#666', marginLeft: '8px'}}>
                (₹{price}/100{product.unit === 'ml' || product.unit === 'l' ? 'ml' : 'g'})
              </span>
            </div>

            <div className="selection-group">
              <label>Select Weight</label>
              <div className="weight-options">
                {availableOptions.map(w => (
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
              <FiShoppingCart /> Add to Basket
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductSelectionModal;
