# ProofMint Backend

Certificate Issuance & Verification Backend built with Node.js, Express, Sequelize, and PostgreSQL.

## Prerequisites
- Node.js (v18+)
- PostgreSQL

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   The `.env` file contains example environment variables (commented out) at the top.
   Update `.env` with your specific database credentials and secrets.

3. **Database Setup & Migrations**
   Ensure your PostgreSQL instance is running and the database matches your `DATABASE_URL`.
   The project uses Sequelize. Migrations will run based on your Sequelize setup if configured.

4. **Seed the Database**
   To populate the database with initial demo data:
   ```bash
   npm run db:seed
   ```

## Build and Run

- **Development Mode** (with watch):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```
