import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import products from '../products';

const ProductPage = () => {
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const { addToCart } = useCart();
  const { user, toggleWishlist, isInWishlist } = useAuth();
  const { id } = useParams();

  const product = products.find((p) => p._id === id);

  if (!product) return <div className="p-10 text-center">Product not found</div>;

  const handleAddToCart = () => {
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlist = () => {
    if (!user) {
      return toast.error('Please login first to save wishlist items.')
    }
    toggleWishlist(product)
    toast.success(isInWishlist(product._id) ? 'Removed from wishlist' : 'Added to wishlist')
  }

  const handleReviewSubmit = (e) => {
    e.preventDefault()
    if (!user) return toast.error('Log in to leave a review')
    if (!reviewComment.trim()) return toast.error('Add a comment before submitting')
    toast.success('Review added locally. Backend review support is also available.')
    setReviewComment('')
  }

  const ratingValue = product.rating || 0

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Link to="/" className="text-blue-600 hover:underline mb-6 inline-block">
        ← Back to Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-white p-4 rounded-xl shadow">
          <img src={product.image} alt={product.name} className="w-full rounded-lg" />
        </div>

        <div>
          <h1 className="text-4xl font-bold text-gray-900">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <p className="text-3xl font-black text-gray-900 font-mono">KSH {product.retailPrice.toLocaleString()}</p>
            <div className="inline-flex items-center gap-1 text-yellow-500 font-semibold">
              {'★'.repeat(Math.round(ratingValue))}
              {'☆'.repeat(5 - Math.round(ratingValue))}
              <span className="text-xs text-gray-500">({product.numReviews || 0})</span>
            </div>
          </div>
          <p className="text-gray-600 mt-6 leading-relaxed text-lg">{product.description}</p>

          <div className="mt-4 text-sm text-gray-500">
            Category: <span className="font-semibold text-gray-700">{product.category}</span>
          </div>

          <div className="mt-2 text-sm text-gray-500">
            In Stock:{' '}
            <span className={`font-semibold ${product.countInStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {product.countInStock > 0 ? `${product.countInStock} units` : 'Out of Stock'}
            </span>
          </div>

          <div className="mt-8 grid gap-4">
            <button
              onClick={handleAddToCart}
              disabled={product.countInStock === 0}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {product.countInStock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              onClick={handleWishlist}
              className="w-full bg-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-pink-700 transition-all active:scale-95 shadow-lg shadow-pink-100"
            >
              {isInWishlist(product._id) ? '💔 Remove from wishlist' : '💖 Add to wishlist'}
            </button>
          </div>

          <div className="mt-10 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Leave a review</h2>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rating</label>
                <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-gray-300 p-3">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} stars</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-300 p-3"
                  placeholder="Share your experience with this product..."
                />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all">
                Submit Review
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;