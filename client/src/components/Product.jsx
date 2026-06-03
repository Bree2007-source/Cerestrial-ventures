import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { CartContext } from '../context/CartContext'
import toast from 'react-hot-toast'

function Product({ product }) {
  const navigate = useNavigate()
  const { addToCart } = useContext(CartContext)

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addToCart(product)
    toast.success(`${product.name} added to cart! 🛒`)
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      onClick={() => navigate(`/product/${product._id}`)}
      className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer border border-gray-100 hover:shadow-xl transition-all"
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {product.category}
        </div>
        {product.countInStock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-bold">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-2">{product.name}</h3>

        <div className="flex items-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-xs ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
              ★
            </span>
          ))}
          <span className="text-xs text-gray-500">({product.numReviews})</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-600 font-bold text-lg">KSh {product.retailPrice}</p>
            <p className="text-gray-400 text-xs">Wholesale: KSh {product.wholesalePrice}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            + Add
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default Product