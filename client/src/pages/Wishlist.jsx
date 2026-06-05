import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useAuth()
  const { addToCart } = useCart()

  if (!wishlist || wishlist.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ marginBottom: '12px' }}>Your wishlist is empty</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          Add products to your wishlist and return when you are ready to buy.
        </p>
        <Link to="/" style={{ color: '#15803d', textDecoration: 'none', fontWeight: 'bold' }}>
          Browse products
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '24px' }}>💖 Your Wishlist</h1>
      <div style={{ display: 'grid', gap: '18px' }}>
        {wishlist.map((product) => (
          <div key={product._id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: '16px', alignItems: 'center', padding: '18px', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
            <img src={product.image} alt={product.name} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '14px' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>{product.name}</h2>
              <p style={{ margin: '10px 0 4px', color: '#4b5563' }}>{product.description || product.category}</p>
              <p style={{ margin: 0, fontWeight: '700', color: '#15803d' }}>KSh {product.retailPrice?.toLocaleString()}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => addToCart(product)} style={{ padding: '10px 18px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                Add to cart
              </button>
              <button onClick={() => removeFromWishlist(product._id)} style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
