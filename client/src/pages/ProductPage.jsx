import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import products from '../products';

const ProductPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();

  const product = products.find((p) => p._id === id);

  if (!product) return <div className="p-10 text-center">Product not found</div>;

  const handleAddToCart = () => {
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

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
          <p className="text-3xl font-black text-gray-900 mt-4 font-mono">
            KSH {product.price.toLocaleString()}
          </p>
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

          <div className="mt-10 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <button
              onClick={handleAddToCart}
              disabled={product.countInStock === 0}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {product.countInStock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;