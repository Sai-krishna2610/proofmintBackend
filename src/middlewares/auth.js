// Stub for auth middleware
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import {User} from '../models/index.js';

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log(authHeader);
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        console.log(token);
        const decoded = jwt.verify(token, config.jwt.accessSecret);
        console.log(decoded);
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'email', 'name', 'role', 'is_active'],
        });
        console.log(user);
        if (!user || !user.is_active) {
            return res.status(401).json({ message: 'User not found or deactivated' });
        }

        req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: 'Invalid or expired access token' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};
