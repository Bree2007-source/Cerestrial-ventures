import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';

const Home = ({ selectedCategory }) => {
  const { addToCart, cartItems } = useCart();
  const { theme } = useTheme();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItems, setAddedItems] = useState({});
  const [activeCategory, setActiveCategory] = useState(selectedCategory || 'All');

  // When someone taps a category card from CategoriesPage
  useEffect(() => {
    if (location.state?.category) {
      setActiveCategory(location.state.category);
    }
  }, [location.state]);

  // When parent changes category from header chips
  useEffect(() => {
    setActiveCategory(selectedCategory);
  }, [selectedCategory]);

  const products = [
    { _id: '1',  name: 'Premium Sugar 1kg',        category: 'Sugar',                    retailPrice: 150,  wholesalePrice: 135, stock: 12, image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400' },
    { _id: '2',  name: 'Basmati Rice 5kg',          category: 'Basmati Sindano',          retailPrice: 1200, wholesalePrice: 1050, stock: 4, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
    { _id: '3',  name: 'Vegetable Cooking Oil 2L',  category: 'Cooking Oil',              retailPrice: 650,  wholesalePrice: 600, stock: 15, image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400' },
    { _id: '4',  name: 'Quaker Oats 500g',          category: 'Cereals',                  retailPrice: 280,  wholesalePrice: 250, stock: 8,  image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400' },
    { _id: '5',  name: 'Lays Crisps 100g',          category: 'Snacks & Sweets',          retailPrice: 150,  wholesalePrice: 130, stock: 45, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },
    { _id: '6',  name: 'Mumias Sugar 2kg',          category: 'Sugar',                    retailPrice: 230,  wholesalePrice: 210, stock: 50, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { _id: '7',  name: 'Jogoo Maize Flour 2kg',     category: 'Maize Flour',              retailPrice: 180,  wholesalePrice: 160, stock: 60, image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400' },
    { _id: '8',  name: 'Exe Wheat Flour 2kg',       category: 'Wheat Flour',              retailPrice: 210,  wholesalePrice: 190, stock: 45, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
    { _id: '9',  name: 'Brookside Milk 500ml',      category: 'Milk',                     retailPrice: 60,   wholesalePrice: 50,  stock: 100, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400' },
    { _id: '10', name: 'Royco Mchuzi Mix',          category: 'Spices',                   retailPrice: 25,   wholesalePrice: 20,  stock: 200, image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400' },
    { _id: '11', name: 'Ariel Detergent 1kg',       category: 'Powder Soaps',             retailPrice: 320,  wholesalePrice: 290, stock: 25, image: 'https://images.unsplash.com/photo-1585441695325-14c2aa6b8e23?w=400' },
    { _id: '12', name: 'Pampers Diapers Size 3',    category: 'Diapers',                  retailPrice: 950,  wholesalePrice: 900, stock: 20, image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400' },
    { _id: '13', name: 'Dettol Bar Soap',           category: 'Bar Soaps',                retailPrice: 85,   wholesalePrice: 70,  stock: 80, image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400' },
    { _id: '14', name: 'Ketepa Tea Bags 50s',       category: 'Tea Bags',                 retailPrice: 120,  wholesalePrice: 100, stock: 60, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
    { _id: '15', name: 'Nescafe Classic 50g',       category: 'Coffee, Chocolates & Tea', retailPrice: 280,  wholesalePrice: 250, stock: 35, image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400' },
    { _id: '16', name: 'Tusker Water 500ml',        category: 'Water',                    retailPrice: 50,   wholesalePrice: 40,  stock: 200, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400' },
    { _id: '17', name: 'Minute Maid Juice 300ml',   category: 'Juices & Energy Drinks',   retailPrice: 80,   wholesalePrice: 65,  stock: 90, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400' },
    { _id: '18', name: 'Kenchic Tissue 6 Pack',     category: 'Tissue Papers',            retailPrice: 220,  wholesalePrice: 190, stock: 40, image: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400' },
    { _id: '19', name: 'Blue Band Spread 250g',     category: 'Spreads',                  retailPrice: 130,  wholesalePrice: 110, stock: 55, image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
    { _id: '20', name: 'Kensalt Fine Salt 1kg',     category: 'Salt',                     retailPrice: 50,   wholesalePrice: 40,  stock: 120, image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400' },
  ];

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

  const cardBg      = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const cardBorder  = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textColor   = theme === 'dark' ? '#e8f0ea' : '#1e293b';
  const mutedColor  = theme === 'dark' ? '#8aab93' : '#64748b';
  const searchBg    = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const searchBorder = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db';

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* ── SEARCH BAR ── */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{
          position: 'absolute', left: '16px', top: '50%',
          transform: 'translateY(-50%)', fontSize: '18px', pointerEvents: 'none'
        }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search products e.g. Sugar, Rice, Oil..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px 14px 48px',
            borderRadius: '12px',
            border: `1.5px solid ${searchBorder}`,
            backgroundColor: searchBg,
            color: textColor,
            fontSize: '15px',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#15803d'}
          onBlur={e => e.target.style.borderColor = searchBorder}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: '14px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              fontSize: '18px', cursor: 'pointer', color: mutedColor,
            }}
          >
            ✕
          </button>
        )}
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
            style={{
              background: 'none', border: 'none',
              color: theme === 'dark' ? '#8aab93' : '#64748b',
              cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
            }}
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        {displayedProducts.map((product) => {
          const inCart    = getCartQty(product._id);
          const justAdded = addedItems[product._id];
          const isLowStock = product.stock <= 5;

          return (
            <div
              key={product._id}
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative' }}>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                />
                {isLowStock && (
                  <span style={{
                    position: 'absolute', top: '10px', left: '10px',
                    backgroundColor: '#ef4444', color: 'white',
                    fontSize: '10px', fontWeight: 'bold',
                    padding: '3px 8px', borderRadius: '20px',
                  }}>
                    ⚠️ Only {product.stock} left
                  </span>
                )}
                {inCart > 0 && (
                  <span style={{
                    position: 'absolute', top: '10px', right: '10px',
                    backgroundColor: '#15803d', color: 'white',
                    fontSize: '11px', fontWeight: 'bold',
                    padding: '3px 10px', borderRadius: '20px',
                  }}>
                    🛒 {inCart} in cart
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '14px' }}>
                <span style={{
                  backgroundColor: theme === 'dark' ? 'rgba(26,107,60,0.3)' : '#dcfce7',
                  color: theme === 'dark' ? '#4dbb7a' : '#15803d',
                  fontSize: '10px', fontWeight: 'bold',
                  padding: '2px 8px', borderRadius: '20px',
                }}>
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
                    style={{
                      backgroundColor: justAdded ? '#22c55e' : '#15803d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background 0.3s',
                      minWidth: '80px',
                    }}
                  >
                    {justAdded ? '✅ Added' : '+ Add'}
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