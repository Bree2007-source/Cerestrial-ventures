import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import './Home.css';

const CATEGORIES = [
  { name: 'Sugar',                    emoji: '🍬' },
  { name: 'Wheat Flour',              emoji: '🌾' },
  { name: 'Maize Flour',              emoji: '🌽' },
  { name: 'Cooking Oil',              emoji: '🫗' },
  { name: 'Milk',                     emoji: '🥛' },
  { name: 'Cereals',                  emoji: '🥣' },
  { name: 'Snacks & Sweets',          emoji: '🍿' },
  { name: 'Spices',                   emoji: '🌶️' },
  { name: 'Bar Soaps',                emoji: '🧼' },
  { name: 'Water',                    emoji: '💧' },
];

const SLIDES = [
  { bg: 'linear-gradient(135deg,#15803d,#4ade80)', title: 'Fresh Groceries 🛒', sub: 'Wholesale & Retail — delivery before 6PM!' },
  { bg: 'linear-gradient(135deg,#b45309,#fbbf24)', title: 'Daily Offers 🔥',    sub: 'Mumias Sugar 2kg — KSh 199 today only!' },
  { bg: 'linear-gradient(135deg,#1d4ed8,#60a5fa)', title: 'Bulk Savings 💰',    sub: 'Buy more, save more on every order.' },
];

export default function Home({ products = [] }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { theme } = useTheme();
  const { addToCart, cartItems } = useCart();

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState(location.state?.category || 'All');
  const [slide,    setSlide]    = useState(0);
  const timerRef = useRef(null);

  const isDark = theme === 'dark';

  // ── auto-advance carousel
  useEffect(() => {
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── pick up category from CategoriesPage navigation
  useEffect(() => {
    if (location.state?.category) setCategory(location.state.category);
  }, [location.state]);

  const filtered = products.filter(p => {
    const matchCat    = category === 'All' || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartCount = cartItems?.reduce((n, i) => n + i.qty, 0) ?? 0;

  const surface  = isDark ? '#111827' : '#ffffff';
  const textMain = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted= isDark ? '#94a3b8' : '#64748b';
  const border   = isDark ? 'rgba(148,163,184,0.15)' : '#e2e8f0';

  return (
    <div className="home-container" style={{ background: isDark ? '#0b1120' : '#f8fafc', color: textMain }}>

      {/* ── HERO CAROUSEL ── */}
      <div className="hero-carousel" aria-label="Promotions">
        <div className="hero-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {SLIDES.map((s, i) => (
            <div key={i} className="hero-slide" style={{ background: s.bg }}>
              <div className="hero-slide-content">
                <h2>{s.title}</h2>
                <p>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="hero-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${slide === i ? ' active' : ''}`}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="home-content">

        {/* ── SEARCH ── */}
        <div className="search-section">
          <div className="search-bar-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              style={{ background: surface, borderColor: border, color: textMain }}
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')} style={{ color: textMuted }}>✕</button>
            )}
          </div>
        </div>

        {/* ── ICON CATEGORY ROW ── */}
        <p className="section-title" style={{ color: textMain }}>Categories</p>
        <div className="icon-categories-row">
          {[{ name: 'All', emoji: '🏪' }, ...CATEGORIES].map(cat => (
            <button
              key={cat.name}
              className="icon-category-tile"
              onClick={() => setCategory(cat.name)}
              style={{ border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <div
                className="icon-category-glyph"
                style={{
                  background: category === cat.name
                    ? (isDark ? 'rgba(74,222,128,0.2)' : 'rgba(21,128,61,0.12)')
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  outline: category === cat.name ? '2px solid #15803d' : 'none',
                }}
              >
                {cat.emoji}
              </div>
              <span className="icon-category-label" style={{ color: category === cat.name ? '#15803d' : textMuted }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* ── PRODUCTS ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', marginBottom: '12px' }}>
          <p className="section-title" style={{ color: textMain, margin: 0 }}>
            {category === 'All' ? '🛍️ All Products' : `${category}`}
          </p>
          <span style={{ fontSize: '12px', color: textMuted }}>{filtered.length} items</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: textMuted }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
            <p>No products found{search ? ` for "${search}"` : ''}.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(product => {
              const inCart = cartItems?.find(i => i._id === product._id);
              return (
                <div
                  key={product._id}
                  className="product-card"
                  style={{ background: surface, border: `1px solid ${border}`, position: 'relative', cursor: 'pointer' }}
                  onClick={() => navigate(`/product/${product._id}`)}
                >
                  {/* ── BADGES ── */}
                  {product.countInStock === 0 && (
                    <span className="badge badge-out-of-stock">Out of stock</span>
                  )}
                  {product.countInStock > 0 && product.countInStock <= 5 && (
                    <span className="badge badge-low-stock">Low stock</span>
                  )}
                  {inCart && (
                    <span className="badge badge-in-cart">✓ In cart</span>
                  )}

                  {/* ── IMAGE ── */}
                  <div className="product-img-wrapper">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="product-img"
                      onError={e => { e.target.src = 'https://placehold.co/400x300?text=No+Image'; }}
                    />
                  </div>

                  {/* ── BODY ── */}
                  <div className="product-card-body">
                    <span className="category-pill" style={{ background: isDark ? 'rgba(74,222,128,0.15)' : '#dcfce7', color: '#15803d' }}>
                      {product.category}
                    </span>
                    <p style={{ margin: '6px 0 2px', fontWeight: 700, fontSize: '13px', color: textMain, lineHeight: 1.3 }}>
                      {product.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: textMuted }}>
                      ★ {product.rating} ({product.numReviews})
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '6px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#15803d' }}>
                          KSh {product.retailPrice}
                        </p>
                        <p style={{ margin: 0, fontSize: '10px', color: textMuted }}>
                          W/S: KSh {product.wholesalePrice}
                        </p>
                      </div>
                      <button
                        className="add-to-cart-btn"
                        style={{ background: product.countInStock === 0 ? '#94a3b8' : '#15803d', flexShrink: 0 }}
                        disabled={product.countInStock === 0}
                        onClick={e => {
                          e.stopPropagation();
                          if (product.countInStock > 0) addToCart(product);
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FLOATING CART ── */}
      {cartCount > 0 && (
        <button className="floating-cart-btn" onClick={() => navigate('/cart')}>
          🛒
          <span className="floating-cart-count">{cartCount}</span>
        </button>
      )}
    </div>
  );
}