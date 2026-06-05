import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: 'retail',
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      await register(formData.name, formData.email, formData.password, formData.phone)
      toast.success(`Welcome to Cerestrial Ventures, ${formData.name}! 🎉`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌾</div>
          <h1 className="text-2xl font-black text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Cerestrial Ventures today</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, accountType: 'retail' })}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              formData.accountType === 'retail' ? 'bg-white text-green-700 shadow' : 'text-gray-500'
            }`}
          >
            🛒 Retail Customer
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, accountType: 'wholesale' })}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              formData.accountType === 'wholesale' ? 'bg-white text-green-700 shadow' : 'text-gray-500'
            }`}
          >
            🏪 Wholesale Business
          </button>
        </div>

        {formData.accountType === 'wholesale' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4"
          >
            <p className="text-yellow-700 text-xs font-medium">
              🎉 Wholesale accounts get special pricing on bulk orders!
              Our team will verify your business within 24 hours.
            </p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Brendah Kathure" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📧 Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📱 Phone Number (M-Pesa)</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0712 345 678" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">🔒 Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="At least 6 characters" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">🔒 Confirm Password</label>
            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat your password" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-black py-3 rounded-xl text-lg transition-colors shadow-lg mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </motion.button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 font-bold hover:text-green-800 transition-colors">Sign in →</Link>
        </p>
      </motion.div>
    </div>
  )
}

export default RegisterPage
