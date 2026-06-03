 import Product from '../models/Product.js';

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        return res.status(200).json(products);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Calculate specific item cost based on volume order (Wholesale engine)
// @route   POST /api/products/calculate-price
// @access  Public
export const calculateTierPrice = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || typeof quantity !== 'number' || quantity <= 0) {
            return res.status(400).json({
                message: 'Invalid input. A valid Product ID and positive quantity are required.'
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product item not found' });
        }

        const usesWholesale = quantity >= product.minWholesaleQuantity;
        const finalPricePerUnit = usesWholesale ? product.wholesalePrice : product.retailPrice;

        return res.status(200).json({
            pricePerUnit: finalPricePerUnit,
            totalCost: finalPricePerUnit * quantity,
            isWholesaleApplied: usesWholesale
        });

    } catch (error) {
        console.error('Pricing calculations failed:', error);
        return res.status(500).json({ message: 'Engine processing error' });
    }
};