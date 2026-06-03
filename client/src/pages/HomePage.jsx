import { motion } from 'framer-motion'
import Product from '../components/Product'
import products from '../products'

function HomePage() {
  return (
    <main>
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-green-700 to-green-500 text-white py-14 px-4"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <motion.h2
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl font-black mb-3"
            >
              Fresh Groceries 🛒
            </motion.h2>
            <p className="text-green-100 text-xl mb-6">
              Wholesale & Retail prices — Same day delivery before 6PM!
            </p>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black px-8 py-3 rounded-2xl text-lg shadow-lg"
              >
                Shop Now →
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="border-2 border-white text-white font-bold px-6 py-3 rounded-2xl text-lg hover:bg-white hover:text-green-700 transition-colors"
              >
                Wholesale Prices
              </motion.button>
            </div>
          </div>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-9xl"
          >
            🌾
          </motion.div>
        </div>
      </motion.div>

      {/* Daily Offer Banner */}
      <motion.div
        animate={{ opacity: [1, 0.8, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="bg-red-500 text-white py-3 px-4 text-center"
      >
        <p className="font-bold">
          🔥 DAILY OFFER: Mumias Sugar 2kg — KSh 230 →{' '}
          <span className="text-yellow-300 text-lg">KSh 199</span>{' '}
          | Ends tonight at midnight! ⏰
        </p>
      </motion.div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-gray-800">
            🛍️ All Products
          </h2>
          <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
            {products.length} items
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          {products.map((product, index) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Product product={product} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  )
}

export default HomePage