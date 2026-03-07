import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pg = require('pg');

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
});


export default sequelize;