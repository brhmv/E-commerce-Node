const jwt = require('jsonwebtoken');

const generateRefreshToken = (user) => {
    return jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

module.exports = generateRefreshToken;


