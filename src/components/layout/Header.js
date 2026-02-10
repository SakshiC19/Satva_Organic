import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FiShoppingCart,
  FiUser,
  FiSearch,
  FiChevronDown,
  FiPackage,
  FiHeart,
  FiMenu,
  FiX,
  FiHome,
  FiPhone,
  FiTruck,
  FiHelpCircle,
  FiLogOut,
  FiGrid,
  FiChevronRight,
  FiDroplet,
  FiLayers,
  FiDisc,
  FiStar,
  FiClock
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCategories } from '../../contexts/CategoryContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import './Header.css';
import logo from '../../assets/logo-new.png';

const Header = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const { currentUser, logout, isAdmin } = useAuth();
  const { cartCount, openCart } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If menu is active and we click outside the ref, close it
      if (activeMenu && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
      
      // Close search suggestions if clicking outside search component
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsSearchFocused(false);
      }
    };

    if (activeMenu || showSuggestions || isSearchFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu, showSuggestions, isSearchFocused]);

  // Close dropdown when navigating
  useEffect(() => {
    setActiveMenu(null);
    setShowSuggestions(false);
    setIsSearchFocused(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredProducts([]);
      // Show default suggestions if focused
      if (isSearchFocused) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  }, [searchQuery, products, isSearchFocused]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };



  const { categories } = useCategories();

  // Map dynamic categories to nav structure, ensuring unique categories by name
  const uniqueCategories = categories.filter((cat, index, self) => {
    if (!cat || !cat.name) return false;

    const normalizedName = cat.name.trim().toLowerCase();

    // List of legacy/old category names to ALWAYS exclude
    const legacyNamesToExclude = [
      'organic exotic products',
      'organic wood cold press oils products',
      'organic woodcold press oils products',
      'organic powder',
      'organic iteams',
      'organic items ', // with trailing space
      'organic powders'
    ];

    // Exclude if it's a legacy name
    if (legacyNamesToExclude.includes(normalizedName)) {
      return false;
    }

    // Check if it's a unique name (case-insensitive)
    const isFirstOccurrence = index === self.findIndex((c) =>
      c && c.name && c.name.trim().toLowerCase() === normalizedName
    );

    return isFirstOccurrence;
  });

  const navItems = uniqueCategories.map(cat => ({
    name: cat.name,
    path: `/shop?category=${cat.slug}`,
    subcategories: cat.subcategories
  }));

  return (
    <header className="header">
      {/* Top Header (Logo, Search, Actions) */}
      <div className="header-main">
        <div className="header-container">
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
            <div className={`search-wrapper ${showSuggestions ? 'active' : ''}`} ref={searchRef}>
              <button type="submit" className="search-icon-btn">
                <FiSearch />
              </button>
              <input
                type="text"
                placeholder="Search for Millets, Oils, Seeds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="search-input"
              />

              {showSuggestions && (
                <div className="search-suggestions-dropdown" onMouseDown={(e) => e.preventDefault()}> {/* Prevent blur on click */}
                  {searchQuery.trim().length > 0 ? (
                    /* Existing Search Results Logic */
                    <>
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
                    </>
                  ) : (
                    /* New Default Suggestions (Popular & Recent) */
                    <div className="default-suggestions">
                      <div className="suggestions-group">
                        <div className="group-header">
                          <FiStar className="group-icon" />
                          <h4>Popular Searches</h4>
                        </div>
                        <div className="chips-container">
                          {['A2 Cow Ghee', 'Cold Pressed Oils', 'Millets', 'Honey', 'Organic Rice'].map((term, index) => (
                            <button
                              key={index}
                              type="button"
                              className="search-chip"
                              onClick={() => {
                                setSearchQuery(term);
                                navigate(`/shop?search=${encodeURIComponent(term)}`);
                                setShowSuggestions(false);
                              }}
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="suggestions-group">
                        <div className="group-header">
                          <FiClock className="group-icon" />
                          <h4>Recent Searches</h4>
                        </div>
                         <div className="chips-container">
                          {['Mustard Oil', 'Jaggery Powder', 'Turmeric'].map((term, index) => (
                            <button
                              key={index}
                              type="button"
                              className="search-chip recent"
                              onClick={() => {
                                setSearchQuery(term);
                                navigate(`/shop?search=${encodeURIComponent(term)}`);
                                setShowSuggestions(false);
                              }}
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Login Button */}
            <div className="action-item login-item desktop-only" ref={dropdownRef}>
              {currentUser ? (
                <button
                  className="login-btn logged-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === 'login' ? null : 'login');
                  }}
                >
                  <FiUser />
                  <span>{currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Account'}</span>
                  <FiChevronDown className={`chevron ${activeMenu === 'login' ? 'rotate' : ''}`} />
                </button>
              ) : (
                <Link to="/login" className="login-btn">
                  Login
                </Link>
              )}

              {/* Login Dropdown */}
              <div className={`header-dropdown ${activeMenu === 'login' ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
                {currentUser ? (
                  <>
                    <Link to="/account/profile" className="header-dropdown-item" onClick={() => setActiveMenu(null)}>
                      My Profile
                    </Link>
                    <Link to="/account/orders" className="header-dropdown-item" onClick={() => setActiveMenu(null)}>
                      My Orders
                    </Link>
                    <Link to="/account/wishlist" className="header-dropdown-item" onClick={() => setActiveMenu(null)}>
                      My Wishlist
                    </Link>
                    {isAdmin && (
                      <Link to="/admin/dashboard" className="header-dropdown-item" onClick={() => setActiveMenu(null)}>
                        Admin Dashboard
                      </Link>
                    )}
                    <button onClick={() => { handleLogout(); setActiveMenu(null); }} className="header-dropdown-item logout">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className="header-dropdown-header">
                      <span>New customer?</span>
                      <Link to="/signup" onClick={() => setActiveMenu(null)}>Sign Up</Link>
                    </div>
                    <Link to="/login" className="header-dropdown-item" onClick={() => setActiveMenu(null)}>
                      <FiUser /> My Profile
                    </Link>
                    <Link to="/account/orders" className="header-dropdown-item" onClick={() => setActiveMenu(null)}>
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
      {location.pathname !== '/account/wishlist' && (
        <div className="header-categories">
          <div className="container">
            <div className="category-nav">
              {navItems.map((item, index) => (
                <div key={index} className="category-nav-item-wrapper">
                  <Link to={item.path} className="category-nav-item text-only">
                    <span className="category-name">
                      {item.name}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Mobile Sidebar */}
      <div className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <div className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div className="sidebar-brand">
            <img src={logo} alt="Satva" className="sidebar-logo" />
            <span className="sidebar-brand-name">Satva Organics</span>
          </div>
          <button className="close-sidebar-btn" onClick={() => setMobileMenuOpen(false)}>
            <FiX />
          </button>
        </div>

        <div className="mobile-sidebar-content">
          {/* Auth Section in Sidebar */}
          <div className="mobile-auth-section">
            {currentUser ? (
              <div className="mobile-user-info">
                <div className="user-profile-summary" onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/account/profile" className="user-avatar-link">
                    <div className="user-avatar">
                      <FiUser />
                    </div>
                  </Link>
                  <div className="user-details">
                    <span className="user-name">Hello, {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'User'}</span>
                    <Link to="/account/profile" className="view-profile-link">
                      View Profile <FiChevronRight />
                    </Link>
                  </div>
                </div>
                <div className="mobile-user-links">
                  <Link to="/account/orders" className="user-link-item" onClick={() => setMobileMenuOpen(false)}>
                    My Orders
                  </Link>
                  <Link to="/account/wishlist" className="user-link-item" onClick={() => setMobileMenuOpen(false)}>
                    My Wishlist
                  </Link>
                  {isAdmin && (
                    <Link to="/admin/dashboard" className="user-link-item" onClick={() => setMobileMenuOpen(false)}>
                      Admin Dashboard
                    </Link>
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

          {/* Menu Items */}
          <div className="mobile-menu-items">
            <Link
              to="/"
              className="mobile-menu-item home-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="menu-item-content">
                Home
              </span>
            </Link>

            {/* Products Dropdown */}
            <div className="mobile-products-section">
              <div className={`mobile-menu-item products-toggle ${productsOpen ? 'active' : ''}`}>
                <div
                  className="menu-item-content"
                  onClick={() => {
                    navigate('/shop');
                    setMobileMenuOpen(false);
                  }}
                  style={{ cursor: 'pointer', flex: 1 }}
                >
                  Products
                </div>
                <span
                  className="mobile-toggle-icon"
                  onClick={() => setProductsOpen(!productsOpen)}
                  style={{ cursor: 'pointer', padding: '10px' }}
                >
                  <FiChevronDown className={`products-chevron ${productsOpen ? 'rotate' : ''}`} />
                </span>
              </div>

              <div className={`mobile-products-list ${productsOpen ? 'open' : ''}`}>
                {navItems.map((item, index) => (
                  <div key={index} className="mobile-category-item">
                    <div className="mobile-category-header">
                      <div
                        className="category-label"
                        onClick={() => {
                          navigate(item.path);
                          setMobileMenuOpen(false);
                        }}
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <span className="category-text">{item.name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mobile-nav-divider"></div>

            {/* Utility Menu */}
            <div className="mobile-utility-menu">
              <Link to="/contact" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                <span className="menu-item-content">
                  Contact Us
                </span>
              </Link>
              <Link to="/track-order" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                <span className="menu-item-content">
                  Track Order
                </span>
              </Link>
            </div>
          </div>
        </div>

        {currentUser && (
          <div className="mobile-sidebar-footer">
            <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="mobile-logout-btn-subtle">
              <FiLogOut /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
