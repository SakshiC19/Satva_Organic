import React from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import './ProductSelectionModal.css';
import { useCart } from '../../contexts/CartContext';

const ProductSelectionModal = ({ product, isOpen, onClose }) => {
  const { addToCart, openCart } = useCart();

  if (!isOpen || !product) return null;

  const { name, images, image, price, packingSizes = [] } = product;
  const productImage = images && images.length > 0 ? (images[0].url || images[0]) : image;

  const handleAddVariant = (size) => {
    addToCart({
      ...product,
      selectedSize: size,
      quantity: 1
    });
    onClose();
    openCart();
  };

  // If no packing sizes, we can just show the main price as one option
  const variants = packingSizes.length > 0 ? packingSizes : ['Standard'];

  return (
    <div className="selection-modal-overlay" onClick={onClose}>
      <div className="selection-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <FiX />
        </button>
        
        <h2 className="modal-title">{name}</h2>
        
        <div className="variants-list">
          {variants.map((size, index) => (
            <div key={index} className="variant-item">
              <div className="variant-image">
                <img src={productImage} alt={name} />
              </div>
              <div className="variant-info">
                <span className="variant-size">{size}</span>
                <span className="variant-price">₹{price}</span>
              </div>
              <button 
                className="variant-add-btn"
                onClick={() => handleAddVariant(size)}
              >
                ADD
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSelectionModal;
