import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import sequelize from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    frameguard: false,
}));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'ProofMint API is running' });
});

import verifyRoutes from './routes/verifyRoutes.js';

app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.use('/verify', verifyRoutes);
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message || err);
    console.error(err.stack);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { detail: err.stack })
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected');
        await sequelize.sync({ alter: true });
        console.log('Database synced');
        app.listen(PORT, () => {
            console.log(`Server is running on port http://localhost:${PORT}`);
        })
    } catch (error) {
        console.log('Database connection failed', error);
    }
}
startServer();

