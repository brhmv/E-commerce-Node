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
        const user = await User.findById(req.user.id).populate({
            path: 'basket',
            populate: { path: 'items.productId' }
        });
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

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let user = await User.findById(req.user.id).populate('basket');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.basket) {
            // Create new basket if the user doesn't have one
            const basket = new Basket({
                userId: user._id,
                items: [{ productId, quantity }]
            });
            await basket.save();
            user.basket = basket._id;
        } else {
            // Update the existing basket
            const basket = await Basket.findById(user.basket);
            const existingItemIndex = basket.items.findIndex(item => item.productId.equals(productId));

            if (existingItemIndex > -1) {
                basket.items[existingItemIndex].quantity += quantity;
            } else {
                basket.items.push({ productId, quantity });
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
        basket.items = basket.items.filter(item => !item.productId.equals(productId));
        await basket.save();

        res.send('Product removed from basket');
    } catch (error) {
        res.status(500).send(`Error removing product from basket: ${error.message}`);
    }
});

module.exports = router;