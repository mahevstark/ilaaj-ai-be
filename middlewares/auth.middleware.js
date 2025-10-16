const jwt = require('jsonwebtoken');

// Supported roles based on prisma/schema.prisma
const VALID_ROLES = ['ADMIN', 'PATIENT'];

/**
 * Extracts the bearer token from the Authorization header
 * @param {import('express').Request} req
 * @returns {string|null}
 */
const extractBearerToken = (req) => {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
};

/**
 * Middleware: Authenticate request via JWT access token
 * - Reads token from Authorization: Bearer <token>
 * - Verifies with JWT_SECRET
 * - Validates payload shape and role
 * - Attaches req.user = { id, role }
 */
const authenticate = (req, res, next) => {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            const error = new Error('Authorization token missing');
            error.statusCode = 401;
            throw error;
        }

        if (!process.env.JWT_SECRET) {
            const error = new Error('JWT secret not configured');
            error.statusCode = 500;
            throw error;
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch (err) {
            const error = new Error(
                err.name === 'TokenExpiredError'
                    ? 'Authorization token expired'
                    : 'Invalid authorization token'
            );
            error.statusCode = 401;
            throw error;
        }

        const { userId, role } = payload || {};
        if (!userId) {
            const error = new Error('Token payload missing userId');
            error.statusCode = 401;
            throw error;
        }
        if (!role || !VALID_ROLES.includes(role)) {
            const error = new Error('Token payload has invalid role');
            error.statusCode = 401;
            throw error;
        }

        req.user = { id: userId, role };
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Factory: Authorize by one or more allowed roles
 * @param {('ADMIN'|'PATIENT')[]} allowedRoles
 */
const authorize = (...allowedRoles) => {
    // Normalize unique roles and validate inputs early
    const uniqueRoles = Array.from(new Set(allowedRoles));
    uniqueRoles.forEach((r) => {
        if (!VALID_ROLES.includes(r)) {
            throw new Error(`authorize(): unknown role '${r}'`);
        }
    });

    return (req, res, next) => {
        try {
            if (!req.user) {
                const error = new Error('Unauthenticated');
                error.statusCode = 401;
                throw error;
            }

            if (uniqueRoles.length > 0 && !uniqueRoles.includes(req.user.role)) {
                const error = new Error('Forbidden: insufficient permissions');
                error.statusCode = 403;
                throw error;
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};

/**
 * Convenience middleware for ADMIN-only routes
 */
const requireAdmin = authorize('ADMIN');

module.exports = {
    authenticate,
    authorize,
    requireAdmin,
};


