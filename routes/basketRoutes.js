const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/product');
const Basket = require('../models/basket');
const authenticateAccessToken = require('../middleware/authenticateAccessToken');
const mongoose = require('mongoose');

// Get Basket
router.get('/', authenticateAccessToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate({
                path: 'basket',
                populate: { path: 'items.productId', select: 'name price image modelName rating reviews' }
            })
            .lean();

        console.log(user.basket);

        if (!user || !user.basket) {
            return res.status(404).send('Basket not found');
        }
        res.json(user.basket);
    } catch (error) {
        res.status(500).send(`Error fetching basket: ${error.message}`);
    }
});


// Add to Basket
router.post('/add', authenticateAccessToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        if (typeof quantity !== 'number' || quantity <= 0) {
            return res.status(400).json({ error: 'Quantity must be a positive number' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (typeof product.price !== 'number' || product.price <= 0) {
            return res.status(400).json({ error: 'Invalid product price' });
        }

        let user = await User.findById(req.user.id).populate('basket');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let basket;
        if (!user.basket) {
            basket = new Basket({
                userId: user._id,
                items: [{ productId, quantity, price: product.price * quantity }],
                totalPrice: product.price * quantity
            });
            await basket.save();
            user.basket = basket._id;
        } else {
            basket = await Basket.findById(user.basket);
            const existingItemIndex = basket.items.findIndex(item => item.productId.equals(productId));

            if (existingItemIndex > -1) {
                basket.items[existingItemIndex].quantity += quantity;
                basket.items[existingItemIndex].price = product.price * basket.items[existingItemIndex].quantity;
            } else {
                basket.items.push({ productId, quantity, price: product.price * quantity });
            }

            basket.totalPrice = basket.items.reduce((total, item) => {
                const itemPrice = (typeof item.price === 'number' && !isNaN(item.price)) ? item.price : 0;
                return total + itemPrice;
            }, 0);

            if (isNaN(basket.totalPrice)) {
                return res.status(400).json({ error: 'Total price is invalid' });
            }

            await basket.save();
        }

        await user.save();

        res.status(200).json({ message: 'Product added to basket' });
    } catch (error) {
        console.error('Error adding product to basket:', error.message);
        res.status(500).json({ error: `Error adding product to basket: ${error.message}` });
    }
});


// Remove from Basket
router.delete('/remove/:productId', authenticateAccessToken, async (req, res) => {
    try {
        const { productId } = req.params;

        const user = await User.findById(req.user.id).populate('basket');

        if (!user || !user.basket) {
            return res.status(404).send('User or basket not found');
        }

        const basket = await Basket.findById(user.basket);

        console.log('User ID:', req.user.id);
        console.log('Basket:', basket);
        console.log('Product ID:', productId);
        console.log('Items in Basket:', basket.items);

        const itemIndex = basket.items.findIndex(item => item.productId.equals(productId));
        if (itemIndex === -1) {
            return res.status(404).send('Product not found in basket');
        }

        basket.items.splice(itemIndex, 1);
        await basket.save();

        res.send('Product removed from basket');
    } catch (error) {
        res.status(500).send(`Error removing product from basket: ${error.message}`);
    }
});


module.exports = router;