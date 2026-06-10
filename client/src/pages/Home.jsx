import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';

const Home = ({ selectedCategory }) => {
  const { addToCart, cartItems } = useCart();
  const { theme } = useTheme();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItems, setAddedItems] = useState({});
  const [activeCategory, setActiveCategory] = useState(selectedCategory || 'All');

  // ── Products from backend ──
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // ── Fetch all products from backend ──
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

  // ── Build category list dynamically from products ──
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  // ── Sync category from navigation state ──
  useEffect(() => {
    if (location.state?.category) {
      setActiveCategory(location.state.category);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedCategory) setActiveCategory(selectedCategory);
  }, [selectedCategory]);

  // ── Filter products by category + search ──
  const displayedProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch   = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedItems(prev => ({ ...prev, [product._id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [product._id]: false }));
    }, 1500);
  };

  const getCartQty = (productId) => {
    const found = cartItems.find(item => item._id === productId);
    return found ? (found.qty || found.quantity || 0) : 0;
  };

  // ── Theme colours ──
  const cardBg      = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const cardBorder  = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textColor   = theme === 'dark' ? '#e8f0ea' : '#1e293b';
  const mutedColor  = theme === 'dark' ? '#8aab93' : '#64748b';
  const searchBg    = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const searchBorder = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db';
  const pageBg      = theme === 'dark' ? '#0a1f0f' : '#f8fafc';

  // ── Loading state ──
  if (loadingProducts) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: mutedColor }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <p>Loading products...</p>
    </div>
  );

  // ── Error state ──
  if (fetchError) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: '#ef4444' }}>{fetchError}</p>
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: 12, padding: '8px 20px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', background: pageBg, minHeight: '100vh' }}>

      {/* ── SEARCH BAR ── */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none' }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search products e.g. Sugar, Rice, Oil..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px 14px 48px',
            borderRadius: '12px', border: `1.5px solid ${searchBorder}`,
            backgroundColor: searchBg, color: textColor,
            fontSize: '15px', boxSizing: 'border-box', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#15803d'}
          onBlur={e => e.target.style.borderColor = searchBorder}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: mutedColor }}
          >✕</button>
        )}
      </div>

      {/* ── CATEGORY CHIPS ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 13, cursor: 'pointer',
              border: activeCategory === cat ? 'none' : '1px solid #d1d5db',
              background: activeCategory === cat ? '#15803d' : (theme === 'dark' ? '#1a2b1f' : '#fff'),
              color: activeCategory === cat ? '#fff' : (theme === 'dark' ? '#8aab93' : '#475569'),
              fontWeight: activeCategory === cat ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── ACTIVE CATEGORY BANNER ── */}
      {activeCategory !== 'All' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: theme === 'dark' ? '#1a2b1f' : '#dcfce7',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#86efac'}`,
          borderRadius: '10px', padding: '10px 16px', marginBottom: '16px',
        }}>
          <span style={{ fontWeight: 'bold', color: theme === 'dark' ? '#4dbb7a' : '#15803d', fontSize: '14px' }}>
            📦 Showing: {activeCategory}
          </span>
          <button
            onClick={() => setActiveCategory('All')}
            style={{ background: 'none', border: 'none', color: mutedColor, cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── RESULTS COUNT ── */}
      <p style={{ fontSize: '13px', color: mutedColor, marginBottom: '16px' }}>
        {searchQuery
          ? `${displayedProducts.length} result${displayedProducts.length !== 1 ? 's' : ''} for "${searchQuery}"`
          : `${displayedProducts.length} product${displayedProducts.length !== 1 ? 's' : ''}`}
      </p>

      {/* ── NO RESULTS ── */}
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

      {/* ── PRODUCT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {displayedProducts.map((product) => {
          const inCart    = getCartQty(product._id);
          const justAdded = addedItems[product._id];
          const isLowStock = product.countInStock <= 5;

          return (
            <div
              key={product._id}
              style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Image */}
              <div style={{ position: 'relative' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  onError={e => { e.target.src = 'https://via.placeholder.com/400x180?text=No+Image'; }}
                />
                {isLowStock && product.countInStock > 0 && (
                  <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '20px' }}>
                    ⚠️ Only {product.countInStock} left
                  </span>
                )}
                {product.countInStock === 0 && (
                  <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#64748b', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '20px' }}>
                    Out of stock
                  </span>
                )}
                {inCart > 0 && (
                  <span style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#15803d', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '3px 10px', borderRadius: '20px' }}>
                    🛒 {inCart} in cart
                  </span>
                )}
              </div>

              {/* Card body */}
              <div style={{ padding: '14px' }}>
                <span style={{ backgroundColor: theme === 'dark' ? 'rgba(26,107,60,0.3)' : '#dcfce7', color: theme === 'dark' ? '#4dbb7a' : '#15803d', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '20px' }}>
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
                    style={{
                      backgroundColor: product.countInStock === 0 ? '#94a3b8' : justAdded ? '#22c55e' : '#15803d',
                      color: 'white', border: 'none', padding: '10px 18px',
                      borderRadius: '8px', fontWeight: 'bold',
                      cursor: product.countInStock === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '14px', transition: 'background 0.3s', minWidth: '80px',
                    }}
                  >
                    {product.countInStock === 0 ? 'Sold Out' : justAdded ? '✅ Added' : '+ Add'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;