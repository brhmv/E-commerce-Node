const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const generateAccessToken = require('../utils/generateAccessToken');
const generateRefreshToken = require('../utils/generateRefreshToken');

router.post('/register', async (req, res) => {
    console.log('Request body:', req.body);

    const { username, email, password } = req.body;

    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);

    if (!username || !email || !password) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already registered');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            passwordHash
        });

        await newUser.save();
        res.status(201).send('User registered successfully');
    } catch (error) {
        res.status(500).send(`Error registering user: ${error.message}`);
    }
});



router.post('/login', async (req, res) => {

    console.log("body" + req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send('Invalid email or password');
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(400).send('Invalid email or password');
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({ accessToken, refreshToken });
    } catch (error) {
        res.status(500).send(`Error logging in: ${error.message}`);
    }
});


router.post('/refresh', (req, res) => {
    const { token } = req.body;

    console.log(token)

    if (!token) {
        return res.status(401).send('Access denied');
    }

    try {
        const verified = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const accessToken = generateAccessToken(verified);
        res.json({ accessToken });
    } catch (err) {
        res.status(400).send('Invalid token');
    }
});

module.exports = router;
