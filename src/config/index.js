import 'dotenv/config';

const config = {
    port: parseInt(process.env.PORT, 10) || 4000,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
        accessTtl: process.env.JWT_ACCESS_TTL || '15m',
        refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    }
};
export default config;