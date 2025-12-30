import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiShoppingCart, 
  FiUser, 
  FiSearch,
  FiChevronDown,
  FiPackage,
  FiHeart,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCategories } from '../../contexts/CategoryContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './Header.css';
import logo from '../../assets/logo1.png';

const Header = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const { currentUser, logout, isAdmin, userRole } = useAuth();
  const { cartCount, openCart } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsCollection = collection(db, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          price: doc.data().price,
          image: doc.data().images?.[0]?.url || doc.data().image,
          subcategory: doc.data().subcategory
        }));
        setProducts(productsList);
      } catch (error) {
        console.error('Error fetching products in header:', error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredProducts([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, products]);

  // Debug logging
  console.log('Header - currentUser:', currentUser?.email);
  console.log('Header - userRole:', userRole);
  console.log('Header - isAdmin:', isAdmin);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Navigate to shop with search query
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleCategory = (index) => {
    setExpandedCategories(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const { categories } = useCategories();

  // Map dynamic categories to nav structure, ensuring unique categories by name
  const uniqueCategories = categories.filter((cat, index, self) =>
    index === self.findIndex((c) => c.name === cat.name)
  );

  const navItems = uniqueCategories.map(cat => ({
    name: cat.name,
    path: `/shop?category=${cat.slug}`,
    subcategories: cat.subcategories
  }));

  return (
    <header className="header">
      {/* Top Header (Logo, Search, Actions) */}
      <div className="header-main">
        <div className="container header-container">
          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <FiMenu />
          </button>

          {/* Logo */}
          <Link to="/" className="header-logo">
            <img src={logo} alt="Satva Organics" className="logo-image" />
          </Link>

          {/* Mobile Search (Visible only on mobile) */}
          <form onSubmit={handleSearch} className="header-search-mobile">
            <div className="search-wrapper-mobile">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-mobile"
              />
              <button type="submit" className="search-icon-btn-mobile">
                <FiSearch />
              </button>
            </div>
          </form>

          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearch} className="header-search">
            <div className="search-wrapper">
              <button type="submit" className="search-icon-btn">
                <FiSearch />
              </button>
              <input
                type="text"
                placeholder="Search for Products, Brands and More"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                className="search-input"
              />
              
              {showSuggestions && (searchQuery.length > 0) && (
                <div className="search-suggestions-dropdown">
                  <div className="suggestions-section">
                    <div className="suggestions-left">
                      <h4>Suggestions</h4>
                      <ul className="suggestions-list">
                        {filteredProducts.map(p => (
                          <li key={p.id} onClick={() => {
                            setSearchQuery(p.name);
                            setShowSuggestions(false);
                            navigate(`/product/${p.id}`);
                          }}>
                            {p.name}
                          </li>
                        ))}
                        {filteredProducts.length === 0 && <li>No suggestions found</li>}
                      </ul>
                    </div>
                    <div className="suggestions-right">
                      <h4>Products</h4>
                      <div className="suggested-products">
                        {filteredProducts.map(p => (
                          <div key={p.id} className="suggested-product-item" onClick={() => {
                            setShowSuggestions(false);
                            navigate(`/product/${p.id}`);
                          }}>
                            <img src={p.image} alt={p.name} />
                            <div className="suggested-product-info">
                              <span className="name">{p.name}</span>
                              <span className="price">₹{p.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="suggestions-footer">
                    <Link to={`/shop?search=${searchQuery}`} onClick={() => setShowSuggestions(false)}>
                      View all results
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Login Button */}
            <div 
              className="action-item login-item desktop-only"
              onMouseEnter={() => setActiveMenu('login')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              {currentUser ? (
                <button className="login-btn logged-in">
                  <FiUser />
                  <span>{currentUser.displayName || 'My Account'}</span>
                  <FiChevronDown className={`chevron ${activeMenu === 'login' ? 'rotate' : ''}`} />
                </button>
              ) : (
                <Link to="/login" className="login-btn">
                  Login
                </Link>
              )}

              {/* Login Dropdown */}
              <div className={`action-dropdown ${activeMenu === 'login' ? 'show' : ''}`}>
                {currentUser ? (
                  <>
                    <Link to="/account/profile" className="dropdown-item">
                      My Profile
                    </Link>
                    <Link to="/account/orders" className="dropdown-item">
                      My Orders
                    </Link>
                    <Link to="/account/wishlist" className="dropdown-item">
                      My Wishlist
                    </Link>
                    {isAdmin && (
                      <Link to="/admin/dashboard" className="dropdown-item">
                        Admin Dashboard
                      </Link>
                    )}
                    <button onClick={handleLogout} className="dropdown-item logout">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className="dropdown-header">
                      <span>New customer?</span>
                      <Link to="/signup">Sign Up</Link>
                    </div>
                    <Link to="/login" className="dropdown-item">
                      <FiUser /> My Profile
                    </Link>
                    <Link to="/account/orders" className="dropdown-item">
                      <FiPackage /> Orders
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Wishlist */}
            <Link to="/account/wishlist" className="action-item wishlist-item">
              <FiHeart />
              {wishlistCount > 0 && <span className="wishlist-count">{wishlistCount}</span>}
            </Link>

            {/* Cart */}
            <button 
              className="action-item cart-item" 
              onClick={(e) => {
                e.preventDefault();
                openCart();
              }}
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <FiShoppingCart />
              <span className="cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation (Categories) */}
      <div className="header-categories">
        <div className="container">
          <div className="category-nav">
            {navItems.map((item, index) => (
              <div key={index} className="category-nav-item-wrapper">
                <Link to={item.path} className="category-nav-item text-only">
                  <span className="category-name">
                    {item.name}
                    {item.subcategories && <FiChevronDown className="cat-chevron" />}
                  </span>
                </Link>
                {item.subcategories && (
                  <div className="category-dropdown">
                    {item.subcategories.map((sub, subIndex) => {
                      // Find if there's a product with this name
                      const matchingProduct = products.find(p => 
                        p.name.toLowerCase() === sub.toLowerCase()
                      );
                      
                      const linkTo = matchingProduct 
                        ? `/product/${matchingProduct.id}`
                        : `${item.path}&subcategory=${encodeURIComponent(sub)}`;

                      return (
                        <Link 
                          key={subIndex} 
                          to={linkTo}
                          className="category-dropdown-item"
                        >
                          {sub}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <div className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <h3>Menu</h3>
          <button className="close-sidebar-btn" onClick={() => setMobileMenuOpen(false)}>
            <FiX />
          </button>
        </div>
        
        <div className="mobile-sidebar-content">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="mobile-search-form">
            <div className="mobile-search-wrapper">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-search-input"
              />
              <button type="submit" className="mobile-search-btn">
                <FiSearch />
              </button>
            </div>
          </form>
          
          {/* Auth Section in Sidebar */}
          <div className="mobile-auth-section">
            {currentUser ? (
              <div className="mobile-user-info">
                <div className="user-greeting">
                  <FiUser />
                  <span>Hello, {currentUser.displayName || 'User'}</span>
                </div>
                <div className="mobile-user-links">
                  <Link to="/account/profile" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
                  <Link to="/account/orders" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                  <Link to="/account/wishlist" onClick={() => setMobileMenuOpen(false)}>My Wishlist</Link>
                  {isAdmin && (
                    <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>Admin Dashboard</Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="mobile-auth-buttons">
                <Link to="/login" className="mobile-auth-btn login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link to="/signup" className="mobile-auth-btn signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>

          <div className="mobile-nav-divider"></div>

          {/* Home Link */}
          <Link 
            to="/" 
            className="mobile-home-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>

          <div className="mobile-nav-divider"></div>

          {/* Categories in Sidebar */}
          <div className="mobile-categories">
            <h4>Products</h4>
            {navItems.map((item, index) => (
              <div key={index} className="mobile-category-item">
                <div className="mobile-category-header">
                  <Link 
                    to={item.path} 
                    className="mobile-category-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.subcategories && (
                    <button 
                      className={`mobile-cat-toggle ${expandedCategories[index] ? 'expanded' : ''}`}
                      onClick={() => toggleCategory(index)}
                    >
                      <FiChevronDown />
                    </button>
                  )}
                </div>
                {item.subcategories && (
                  <div className={`mobile-subcategories ${expandedCategories[index] ? 'open' : ''}`}>
                    {item.subcategories.map((sub, subIndex) => {
                      const matchingProduct = products.find(p => 
                        p.name.toLowerCase() === sub.toLowerCase()
                      );
                      
                      const linkTo = matchingProduct 
                        ? `/product/${matchingProduct.id}`
                        : `${item.path}&subcategory=${encodeURIComponent(sub)}`;

                      return (
                        <Link 
                          key={subIndex}
                          to={linkTo}
                          className="mobile-subcategory-link"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {sub}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {currentUser && (
            <div className="mobile-sidebar-footer">
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="mobile-logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
