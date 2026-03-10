import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import config from '../config/index.js';
import { User } from '../models/index.js';
import { logAction } from '../services/auditService.js';

const router = Router();

const generateAccessToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl });
const generateRefreshToken = (user) => jwt.sign({ id: user.id }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTtl });

const registerSchema = Joi.object({
    name: Joi.string().max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid('admin', 'issuer').default('issuer'),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

router.post('/register', async (req, res, next) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if(error){
            console.log(`Error Occurred while Registering ${error}`);
        }
        if (error) return res.status(400).json({ message: error.details[0].message});

        const existing = await User.findOne({ where: { email: value.email } });
        if (existing) return res.status(409).json({ message: `Email already registered with this email id: ${value.email}`});

        const password_hash = await bcrypt.hash(value.password, 12);
        // console.log(`Values of Users : ${JSON.stringify(value)}`);
        const user = await User.create({ ...value, password_hash });

        logAction(user.id, null, 'register', { email: user.email });
        res.status(201).json({ accessToken: generateAccessToken(user), refreshToken: generateRefreshToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        console.log(`Error Occurred while Login ${error}`);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const user = await User.findOne({ where: { email: value.email } });
        if (!user || !(await bcrypt.compare(value.password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        logAction(user.id, null, 'login', { email: user.email });
        res.json({ accessToken: generateAccessToken(user), refreshToken: generateRefreshToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) { next(err); }
});

export default router;