import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingCart, Package, User } from 'lucide-react';
import { useCart } from '../context/CartContext';

const navItems = [
  { to: '/',          icon: Home,         label: 'Home'       },
  { to: '/categories',icon: Grid,         label: 'Categories' },
  { to: '/cart',      icon: ShoppingCart, label: 'Cart',  badge: true },
  { to: '/orders',    icon: Package,      label: 'Orders'     },
  { to: '/profile',   icon: User,         label: 'Profile'    },
];

export default function BottomNav() {
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav style={styles.nav}>
      {navItems.map(({ to, icon: Icon, label, badge }) => (
        <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
          ...styles.item,
          ...(isActive ? styles.active : {}),
        })}>
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative' }}>
                <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                {badge && cartCount > 0 && (
                  <span style={styles.badge}>{cartCount > 9 ? '9+' : cartCount}</span>
                )}
              </div>
              <span style={{ ...styles.label, ...(isActive ? styles.activeLabel : {}) }}>
                {label}
              </span>
              {isActive && <div style={styles.dot} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    height: 64, display: 'flex', alignItems: 'stretch',
    backgroundColor: 'var(--nav-bg)', borderTop: '0.5px solid var(--nav-border)',
    padding: '0 4px', zIndex: 1000,
    boxShadow: '0 -2px 20px rgba(0,0,0,0.08)',
  },
  item: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 3, textDecoration: 'none',
    color: 'var(--text-muted)', borderRadius: 12, margin: '6px 2px',
    transition: 'all 0.2s', fontSize: 10, fontWeight: 500, position: 'relative',
  },
  active: { backgroundColor: 'var(--active-bg)', color: 'var(--brand)' },
  label: { fontSize: 10, fontWeight: 500 },
  activeLabel: { fontWeight: 600 },
  badge: {
    position: 'absolute', top: -6, right: -8,
    background: '#e24b4a', color: '#fff', fontSize: 9, fontWeight: 700,
    minWidth: 16, height: 16, borderRadius: 8, display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '0 3px',
    border: '2px solid var(--nav-bg)',
  },
  dot: {
    position: 'absolute', bottom: 4, left: '50%',
    transform: 'translateX(-50%)', width: 4, height: 4,
    borderRadius: 2, background: '#1a6b3c',
  },
};