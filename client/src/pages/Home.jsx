import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import './Home.css';

const getOptimizedUrl = (url, w = 300, h = 130) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`);
};

const HERO_SLIDES = [
  {
    id: 'slide-1',
    title: 'Stock up and save',
    subtitle: 'Wholesale prices on every product, every day',
    image: '',
    bg: '#15803d',
  },
  {
    id: 'slide-2',
    title: 'New stock, every week',
    subtitle: 'Fresh deliveries across all categories',
    image: '',
    bg: '#166534',
  },
  {
    id: 'slide-3',
    title: 'Bulk orders, better rates',
    subtitle: 'The more you order, the more you save',
    image: '',
    bg: '#0a1f0f',
  },
];

const QUICK_ACTIONS = [
  { id: 'wholesale', label: 'Wholesale Orders', icon: '📦', target: 'wholesale' },
  { id: 'retail',    label: 'Retail Shopping',  icon: '🛒', target: 'retail' },
  { id: 'track',     label: 'Track Orders',     icon: '🚚', target: 'track-order' },
  { id: 'offers',    label: 'Offers & Discounts', icon: '🏷️', target: 'offers' },
];

const BEST_SELLER_NAMES = [];
const SPECIAL_OFFER_NAMES = [];

const Home = ({ selectedCategory }) => {
  const { addToCart, cartItems } = useCart();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [addedItems, setAddedItems] = useState({});
  const [activeCategory, setActiveCategory] = useState(selectedCategory || 'All');
  const [activeSlide, setActiveSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const slideTimer = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await axios.get(`${API_BASE_URL}/products`);
        setProducts(res.data);
      } catch (err) {
        setFetchError('Could not load products. Is the server running?');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    slideTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(slideTimer.current);
  }, []);

  const goToSlide = (index) => {
    setActiveSlide(index);
    clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  useEffect(() => {
    if (location.state?.category) setActiveCategory(location.state.category);
  }, [location.state]);

  useEffect(() => {
    if (selectedCategory) setActiveCategory(selectedCategory);
  }, [selectedCategory]);

  const displayedProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch   = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const bestSellers   = products.filter(p => BEST_SELLER_NAMES.includes(p.name));
  const specialOffers = products.filter(p => SPECIAL_OFFER_NAMES.includes(p.name));

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedItems(prev => ({ ...prev, [product._id]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [product._id]: false })), 1500);
  };

  const getCartQty = (productId) => {
    const found = cartItems.find(item => item._id === productId);
    return found ? (found.qty || found.quantity || 0) : 0;
  };

  const handleQuickAction = (action) => {
    if (action.target === 'wholesale' || action.target === 'retail') {
      setActiveCategory('All');
      window.scrollTo({
        top: document.querySelector('.search-section')?.offsetTop - 80 || 0,
        behavior: 'smooth'
      });
    } else if (action.target === 'track-order') {
      navigate('/orders');
    } else if (action.target === 'offers') {
      window.scrollTo({
        top: document.querySelector('.special-offers-section')?.offsetTop - 80 || 0,
        behavior: 'smooth'
      });
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);

  const cardBg           = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const cardBorder       = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textColor        = theme === 'dark' ? '#e8f0ea' : '#1e293b';
  const mutedColor       = theme === 'dark' ? '#8aab93' : '#64748b';
  const searchBg         = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const searchBorder     = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db';
  const pageBg           = theme === 'dark' ? '#0a1f0f' : '#f8fafc';
  const sectionTitleColor = theme === 'dark' ? '#e8f0ea' : '#1e293b';

  if (loadingProducts) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: mutedColor }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p>Loading products...</p>
    </div>
  );

  if (fetchError) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: '#ef4444' }}>{fetchError}</p>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: 12, padding: '8px 20px', background: '#15803d',
          color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );

  const renderProductCard = (product, compact = false) => {
    const inCart     = getCartQty(product._id);
    const justAdded  = addedItems[product._id];
    const isLowStock = product.countInStock <= 5;

    return (
      <div
        key={product._id}
        className={compact ? 'product-card compact-card' : 'product-card'}
        style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={getOptimizedUrl(product.image)}
            alt={product.name}
            className="product-img"
            loading="lazy"
            onError={e => { e.target.src = 'https://via.placeholder.com/400x180?text=No+Image'; }}
          />
          {isLowStock && product.countInStock > 0 && (
            <span className="badge badge-low-stock">⚠️ Only {product.countInStock} left</span>
          )}
          {product.countInStock === 0 && (
            <span className="badge badge-out-of-stock">Out of stock</span>
          )}
          {inCart > 0 && (
            <span className="badge badge-in-cart">🛒 {inCart} in cart</span>
          )}
        </div>

        <div className="product-card-body">
          <span
            className="category-pill"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(26,107,60,0.3)' : '#dcfce7',
              color: theme === 'dark' ? '#4dbb7a' : '#15803d',
            }}
          >
            {product.category}
          </span>

          <h4 style={{ margin: '8px 0 4px', color: textColor, fontSize: '14px' }}>
            {product.name}
          </h4>

          <p style={{ fontSize: '11px', color: mutedColor, margin: '0 0 10px' }}>
            Wholesale: KSh {product.wholesalePrice}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: mutedColor }}>Retail</span>
              <strong style={{ color: '#15803d', display: 'block', fontSize: '18px' }}>
                KSh {product.retailPrice}
              </strong>
            </div>
            <button
              onClick={() => handleAddToCart(product)}
              disabled={product.countInStock === 0}
              className="add-to-cart-btn"
              style={{
                backgroundColor: product.countInStock === 0 ? '#94a3b8'
                  : justAdded ? '#22c55e' : '#15803d',
                cursor: product.countInStock === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {product.countInStock === 0 ? 'Sold Out' : justAdded ? '✅ Added' : '+ Add'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="home-container" style={{ background: pageBg, minHeight: '100vh' }}>

      {/* HERO BANNER CAROUSEL */}
      <section className="hero-carousel" aria-label="Promotions">
        <div className="hero-track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
          {HERO_SLIDES.map((slide) => (
            <div
              key={slide.id}
              className="hero-slide"
              style={{
                background: slide.image
                  ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${slide.image}) center/cover`
                  : slide.bg,
              }}
            >
              <div className="hero-slide-content">
                <h2>{slide.title}</h2>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="hero-dots">
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              aria-label={`Go to slide ${i + 1}`}
              className={`hero-dot ${i === activeSlide ? 'active' : ''}`}
              onClick={() => goToSlide(i)}
            />
          ))}
        </div>
      </section>

      <div className="home-content">

        {/* SEARCH */}
        <div className="search-section">
          <div className="search-bar-wrap">
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder="Search products e.g. Sugar, Rice, Oil..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search products"
              className="search-input"
              style={{ backgroundColor: searchBg, color: textColor, borderColor: searchBorder }}
              onFocus={e => e.target.style.borderColor = '#15803d'}
              onBlur={e => e.target.style.borderColor = searchBorder}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                style={{ color: mutedColor }}
                aria-label="Clear search"
              >✕</button>
            )}
          </div>
        </div>

        {/* ICON CATEGORY ROW */}
        <section className="icon-categories-section" aria-label="Shop by category">
          <div className="icon-categories-row">
            {categories.filter(c => c !== 'All').slice(0, 8).map(cat => (
              <button
                key={cat}
                className="icon-category-tile"
                onClick={() => setActiveCategory(cat)}
                style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <span className="icon-category-glyph">📦</span>
                <span className="icon-category-label" style={{ color: textColor }}>{cat}</span>
              </button>
            ))}
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="quick-actions-section" aria-label="Quick actions">
          <div className="quick-actions-grid">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                className="quick-action-card"
                style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}
                onClick={() => handleQuickAction(action)}
              >
                <span className="quick-action-icon">{action.icon}</span>
                <span className="quick-action-label" style={{ color: textColor }}>{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* CATEGORY FILTER CHIPS */}
        <section aria-label="Filter by category">
          <h3 className="section-title" style={{ color: sectionTitleColor }}>Browse categories</h3>
          <div className="category-chips">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                style={{
                  border: activeCategory === cat ? 'none' : '1px solid #d1d5db',
                  background: activeCategory === cat ? '#15803d'
                    : (theme === 'dark' ? '#1a2b1f' : '#fff'),
                  color: activeCategory === cat ? '#fff'
                    : (theme === 'dark' ? '#8aab93' : '#475569'),
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* ACTIVE CATEGORY BANNER */}
        {activeCategory !== 'All' && (
          <div
            className="active-category-banner"
            style={{
              backgroundColor: theme === 'dark' ? '#1a2b1f' : '#dcfce7',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#86efac'}`,
            }}
          >
            <span style={{ fontWeight: 'bold', color: theme === 'dark' ? '#4dbb7a' : '#15803d', fontSize: '14px' }}>
              📦 Showing: {activeCategory}
            </span>
            <button
              onClick={() => setActiveCategory('All')}
              style={{ background: 'none', border: 'none', color: mutedColor,
                cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            >
              ✕ Clear
            </button>
          </div>
        )}

        {/* TOP SELLING ITEMS */}
        {bestSellers.length > 0 && (
          <section className="best-sellers-section" aria-label="Top selling items">
            <h3 className="section-title" style={{ color: sectionTitleColor }}>Top selling items</h3>
            <div className="horizontal-scroll-row">
              {bestSellers.map(p => renderProductCard(p, true))}
            </div>
          </section>
        )}

        {/* SPECIAL OFFERS */}
        {specialOffers.length > 0 && (
          <section className="special-offers-section" aria-label="Special offers">
            <h3 className="section-title" style={{ color: sectionTitleColor }}>🏷️ Special offers</h3>
            <div className="horizontal-scroll-row">
              {specialOffers.map(p => renderProductCard(p, true))}
            </div>
          </section>
        )}

        {/* RESULTS COUNT */}
        <h3 className="section-title" style={{ color: sectionTitleColor, marginTop: '8px' }}>
          {searchQuery ? `Results for "${searchQuery}"` : 'All products'}
        </h3>
        <p style={{ fontSize: '13px', color: mutedColor, marginBottom: '16px', marginTop: '-8px' }}>
          {displayedProducts.length} product{displayedProducts.length !== 1 ? 's' : ''}
        </p>

        {/* NO RESULTS */}
        {displayedProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ color: textColor, marginBottom: '8px' }}>No products found</h3>
            <p style={{ color: mutedColor, fontSize: '14px' }}>
              Try searching for something else or{' '}
              <span
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                style={{ color: '#15803d', cursor: 'pointer', fontWeight: 'bold' }}
              >
                clear filters
              </span>
            </p>
          </div>
        )}

        {/* PRODUCTS GRID */}
        <div className="product-grid">
          {displayedProducts.map((product) => renderProductCard(product))}
        </div>

      </div>

      {/* FLOATING CART BUTTON */}
      {cartCount > 0 && (
        <button
          className="floating-cart-btn"
          onClick={() => navigate('/cart')}
          aria-label={`View cart, ${cartCount} items`}
        >
          🛒
          <span className="floating-cart-count">{cartCount}</span>
        </button>
      )}

    </div>
  );
};

export default Home;