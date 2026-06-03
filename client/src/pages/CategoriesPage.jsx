import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const CategoriesPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchCat, setSearchCat] = useState('');

  const categories = [
    { name: 'Sugar',                    emoji: '🍬', color: '#fef9c3', border: '#fbbf24', text: '#92400e' },
    { name: 'Wheat Flour',              emoji: '🌾', color: '#fef3c7', border: '#f59e0b', text: '#78350f' },
    { name: 'Maize Flour',              emoji: '🌽', color: '#fefce8', border: '#eab308', text: '#713f12' },
    { name: 'Salad',                    emoji: '🥗', color: '#dcfce7', border: '#22c55e', text: '#14532d' },
    { name: 'Cooking Fat',              emoji: '🫙', color: '#fff7ed', border: '#fb923c', text: '#7c2d12' },
    { name: 'Cereals',                  emoji: '🥣', color: '#fef3c7', border: '#f59e0b', text: '#78350f' },
    { name: 'Packed Rice',              emoji: '📦', color: '#f0fdf4', border: '#4ade80', text: '#166534' },
    { name: 'Basmati Sindano',          emoji: '🍚', color: '#f0fdf4', border: '#16a34a', text: '#14532d' },
    { name: 'White Sindano',            emoji: '🍚', color: '#f8fafc', border: '#94a3b8', text: '#1e293b' },
    { name: 'Biryani',                  emoji: '🍛', color: '#fff7ed', border: '#f97316', text: '#7c2d12' },
    { name: 'Milk',                     emoji: '🥛', color: '#f0f9ff', border: '#38bdf8', text: '#0c4a6e' },
    { name: 'Pastry & Food Products',   emoji: '🥐', color: '#fef9c3', border: '#fbbf24', text: '#92400e' },
    { name: 'Coffee, Chocolates & Tea', emoji: '☕', color: '#fdf4ff', border: '#c084fc', text: '#581c87' },
    { name: 'Tea Bags',                 emoji: '🍵', color: '#f0fdf4', border: '#86efac', text: '#166534' },
    { name: 'Salt',                     emoji: '🧂', color: '#f8fafc', border: '#cbd5e1', text: '#334155' },
    { name: 'Spreads',                  emoji: '🧈', color: '#fefce8', border: '#facc15', text: '#713f12' },
    { name: 'Yeast',                    emoji: '🫧', color: '#fff7ed', border: '#fdba74', text: '#7c2d12' },
    { name: 'Spices',                   emoji: '🌶️', color: '#fef2f2', border: '#f87171', text: '#7f1d1d' },
    { name: 'Bar Soaps',                emoji: '🧼', color: '#eff6ff', border: '#60a5fa', text: '#1e3a8a' },
    { name: 'Powder Soaps',             emoji: '🫧', color: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e' },
    { name: 'Diapers',                  emoji: '👶', color: '#fdf4ff', border: '#e879f9', text: '#701a75' },
    { name: 'Sanitary Pads',            emoji: '🌸', color: '#fff1f2', border: '#fb7185', text: '#881337' },
    { name: 'Wipes',                    emoji: '🤍', color: '#f8fafc', border: '#94a3b8', text: '#1e293b' },
    { name: 'Snacks & Sweets',          emoji: '🍿', color: '#fff7ed', border: '#fb923c', text: '#7c2d12' },
    { name: 'Edible Chocolate',         emoji: '🍫', color: '#fdf4ff', border: '#a855f7', text: '#581c87' },
    { name: 'Tomato Sauce',             emoji: '🍅', color: '#fef2f2', border: '#ef4444', text: '#7f1d1d' },
    { name: 'Chilli Sauce',             emoji: '🌶️', color: '#fef2f2', border: '#dc2626', text: '#7f1d1d' },
    { name: 'Plastic Packaging',        emoji: '📦', color: '#f0f9ff', border: '#38bdf8', text: '#0c4a6e' },
    { name: 'Water',                    emoji: '💧', color: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
    { name: 'Juices & Energy Drinks',   emoji: '🧃', color: '#f0fdf4', border: '#4ade80', text: '#14532d' },
    { name: 'Medicine',                 emoji: '💊', color: '#fef2f2', border: '#f87171', text: '#7f1d1d' },
    { name: 'Stationery',               emoji: '✏️', color: '#eff6ff', border: '#93c5fd', text: '#1e3a8a' },
    { name: 'Tissue Papers',            emoji: '🧻', color: '#f8fafc', border: '#cbd5e1', text: '#334155' },
    { name: 'Cooking Oil',              emoji: '🫗', color: '#fefce8', border: '#eab308', text: '#713f12' },
  ];

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchCat.toLowerCase())
  );

  const bgPage   = theme === 'dark' ? '#0f1a13' : '#f8fafc';
  const bgCard   = theme === 'dark' ? '#1a2b1f' : null;
  const textMain = theme === 'dark' ? '#e8f0ea' : '#1e293b';
  const textMuted = theme === 'dark' ? '#8aab93' : '#64748b';
  const searchBg = theme === 'dark' ? '#1a2b1f' : '#ffffff';
  const searchBorder = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bgPage, padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', color: textMain, fontSize: '24px' }}>
            📦 All Categories
          </h2>
          <p style={{ margin: 0, color: textMuted, fontSize: '14px' }}>
            {categories.length} categories available · tap to browse products
          </p>
        </div>

        {/* ── SEARCH CATEGORIES ── */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none'
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchCat}
            onChange={e => setSearchCat(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              borderRadius: '12px',
              border: `1.5px solid ${searchBorder}`,
              backgroundColor: searchBg,
              color: textMain,
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#15803d'}
            onBlur={e => e.target.style.borderColor = searchBorder}
          />
          {searchCat && (
            <button
              onClick={() => setSearchCat('')}
              style={{
                position: 'absolute', right: '14px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                fontSize: '16px', cursor: 'pointer', color: textMuted,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* ── NO RESULTS ── */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>😕</div>
            <p style={{ color: textMuted }}>No category found for "{searchCat}"</p>
          </div>
        )}

        {/* ── CATEGORY GRID ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '14px',
        }}>
          {filtered.map((cat) => (
            <div
              key={cat.name}
              onClick={() => navigate('/', { state: { category: cat.name } })}
              style={{
                backgroundColor: theme === 'dark' ? bgCard : cat.color,
                border: `2px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : cat.border}`,
                borderRadius: '16px',
                padding: '20px 12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>{cat.emoji}</div>
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: theme === 'dark' ? '#e8f0ea' : cat.text,
                lineHeight: '1.3',
              }}>
                {cat.name}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default CategoriesPage;