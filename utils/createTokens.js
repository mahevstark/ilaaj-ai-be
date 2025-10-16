const jwt = require('jsonwebtoken');

/**
 * Creates access and refresh tokens for user authentication
 * @param {Object} userInfo - User information
 * @param {number} userInfo.userId - User ID
 * @param {string} userInfo.role - User role
 * @returns {Object} Object containing access and refresh tokens
 * @throws {Error} Custom error object with statusCode property
 */
const createTokens = ({ userId, role }) => {
    // Validate user ID
    if (!userId) {
        const error = new Error('User ID is required for token creation');
        error.statusCode = 400;
        throw error;
    }

    // Validate role
    if (!role) {
        const error = new Error('Role is required for token creation');
        error.statusCode = 400;
        throw error;
    }

    // Validate role values
    if (!['ADMIN', 'PATIENT'].includes(role)) {
        const error = new Error('Invalid role specified for token creation');
        error.statusCode = 400;
        throw error;
    }

    try {
        const accessToken = jwt.sign(
            { userId, role },
            process.env.JWT_SECRET,
            { 
                expiresIn: '1d',
                algorithm: 'HS256'
            }
        );

        const refreshToken = jwt.sign(
            { userId, role },
            process.env.JWT_REFRESH_SECRET,
            { 
                expiresIn: '7d',
                algorithm: 'HS256'
            }
        );

        return { accessToken, refreshToken };
    } catch (err) {
        const error = new Error(`Token creation failed: ${err.message}`);
        error.statusCode = 500;
        throw error;
    }
};

module.exports = createTokens;