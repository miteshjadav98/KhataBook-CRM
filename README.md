# KhataBook CRM

A modern, multi-tenant SaaS application built for shopkeepers to manage customers, track inventory, and maintain a robust ledger (Udhar/Jama) with compound interest tracking. 

## Technology Stack
- **Frontend**: Next.js (App Router), React, CSS Modules
- **Backend**: NestJS, Prisma ORM, JWT Authentication
- **Database**: PostgreSQL (via Supabase)

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account (for the database)

### 2. Clone the Repository
```bash
git clone https://github.com/miteshjadav98/KhataBook-CRM.git
cd KhataBook-CRM
```

### 3. Install Dependencies
This project uses a monorepo setup. You can install dependencies for both the frontend and backend using a single command from the root directory:
```bash
npm run install:all
```

*(Alternatively, you can navigate into `khatabook-frontend` and `khatabook-api` and run `npm install` manually in both).*

---

## 🗄️ Database Setup (Supabase & Prisma)

KhataBook CRM uses Prisma ORM connected to a Supabase PostgreSQL database. 

1. **Create a Supabase Project**: Go to [Supabase](https://supabase.com/), create a new project, and wait for the database to provision.
2. **Get Connection Strings**: Go to **Project Settings -> Database**. You need two connection strings:
   - **Transaction (Pooled)**: Ends with port `6543` and `?pgbouncer=true`.
   - **Session (Direct)**: Ends with port `5432`.
3. **Configure Environment Variables**:
   Navigate to the backend directory and create a `.env` file:
   ```bash
   cd khatabook-api
   touch .env
   ```
   Add the following variables to `khatabook-api/.env`:
   ```env
   # Used for runtime queries (Connection Pooling)
   DATABASE_URL="postgres://[db-user]:[password]@[host]:6543/[db-name]?pgbouncer=true"

   # Used ONLY for CLI migrations (Direct Connection)
   DIRECT_URL="postgres://[db-user]:[password]@[host]:5432/[db-name]"

   # JWT Secret for authentication
   JWT_SECRET="your_super_secret_jwt_key_here"
   ```

4. **Push Schema to Database**:
   From inside the `khatabook-api` folder, run Prisma to push the schema to your Supabase database:
   ```bash
   npx prisma db push
   ```

---

## 🏃‍♂️ Running the Application

### Option 1: Run Both Simultaneously
From the **root directory** of the project, you can start both the NestJS backend and Next.js frontend concurrently:
```bash
npm run start
```
- Frontend will run on: `http://localhost:3001`
- Backend API will run on: `http://localhost:3000`

### Option 2: Run Separately
If you prefer to run them in separate terminal windows:

**Terminal 1 (Backend)**:
```bash
cd khatabook-api
npm run start:dev
```

**Terminal 2 (Frontend)**:
```bash
cd khatabook-frontend
npm run dev
```

---

## 🔑 Initial Usage
1. Open `http://localhost:3001` in your browser.
2. Click **Shop Login** and register a new shop.
3. You can now add customers, manage products, and record Udhar/Jama transactions!
