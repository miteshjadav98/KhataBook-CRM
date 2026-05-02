# KhataBook CRM - Project Context Prompt

*You can copy and paste the following prompt to any AI coding assistant to give them immediate context about your project architecture and flow.*

---

## 📌 Project Overview
I am building **KhataBook CRM**, a multi-tenant SaaS application designed to help shop owners manage their customers, track credit/debit transactions, and maintain ledgers. The project is structured as a **Monorepo** containing a NestJS backend and a Next.js frontend, both connected to a Supabase Postgres database via Prisma ORM.

## 🏗️ Project Structure
The repository is a monorepo located at the root directory. It contains a root `package.json` that uses `concurrently` to run both applications simultaneously.

```text
KhatabookCRM/              # Monorepo Root
├── package.json           # Contains scripts like `npm run start`, `npm run install:all`
├── khatabook-api/         # Backend (NestJS)
└── khatabook-frontend/    # Frontend (Next.js)
```

---

## ⚙️ Backend Architecture (`khatabook-api`)

### Tech Stack
- **Framework:** NestJS (TypeScript)
- **Database:** Supabase PostgreSQL
- **ORM:** Prisma v7
- **Authentication:** JWT & bcrypt
- **API Documentation:** Swagger UI (`@nestjs/swagger`)

### Directory Structure & Flow
The backend strictly follows NestJS's modular, dependency-injection architecture:
- `src/main.ts`: Entry point, sets up Swagger and global pipes.
- `src/app.module.ts`: The root module that imports all feature modules.
- `src/prisma/`: Contains `PrismaService` (a singleton extending `PrismaClient`). It connects to the Supabase connection pool (`DATABASE_URL` port 6543) for runtime queries, while migrations use `DIRECT_URL` (port 5432) via `prisma.config.ts`.
- **Feature Modules (`src/<feature>/`)**:
  - `auth/`: Handles JWT generation, login, and registration.
  - `customer/`: Manages shop customers, including logic for shop codes and balance tracking.
  - `product/`: Manages the shop's inventory/products.
  - `transaction/`: Handles the core ledger logic (credits, debits, interest).

### Data Flow
1. **Request:** Client hits a REST endpoint.
2. **Controller:** Receives the request, validates DTOs (Data Transfer Objects).
3. **Service:** Contains the core business logic (e.g., calculating balances, validating shop codes).
4. **PrismaService:** Executes the transaction against the Supabase Postgres DB.
5. **Response:** Data is formatted and returned to the client.

---

## 🎨 Frontend Architecture (`khatabook-frontend`)

### Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** CSS Modules (`*.module.css`) + Global CSS
- **Design Paradigm:** Modern, dynamic, glassmorphism, with micro-animations.

### Directory Structure & Flow
The frontend uses the modern Next.js App Router paradigm.
- `src/app/layout.tsx`: The root layout wrapping the application.
- `src/app/page.tsx`: The landing page with a beautiful, modern hero section.
- `src/app/auth/`: Contains `login` and `register` pages.
- `src/app/dashboard/`: The main authenticated view for shop owners.
- `src/app/customers/`: The customer management interface.
- `src/components/`: Reusable UI components (like `Navbar.tsx`).

### Data Flow
1. **Routing:** Handled entirely by the file system in the `src/app/` directory.
2. **Components:** Pages are divided into modular React components.
3. **Styling:** Scoped CSS is applied using `page.module.css` to prevent global conflicts.
4. **API Integration:** The frontend will communicate with the `khatabook-api` (running on port 3001) using standard HTTP requests (fetch/axios) to retrieve and mutate data.

---

## 🚶‍♂️ User Journey & Core Business Logic

### 1. Shopkeeper Registration & Shop Code
- When a shop owner registers, a new `Shop` entity is created.
- The system generates a unique **Shop Code** (a 6-character alphanumeric string) for that shop.
- The shopkeeper shares this `shopCode` with their customers so the customers know which ledger they are interacting with.

### 2. Customer Registration & Login
- The shopkeeper can register customers into their shop.
- Customers log into the customer portal using the **Shop Code** alongside their personal credentials (email or phone number + password). 
- This ensures customers are correctly routed to the specific isolated tenant/shop environment.

### 3. Products & Inventory
- Shopkeepers can add **Products** to their shop's inventory. 
- Products have a defined `price`. When a transaction occurs, the transaction can optionally be linked to a specific `productId`.

### 4. Transactions & Ledger Logic (Credit vs. Debit)
The core of KhataBook is the ledger system that tracks what is owed.
- **CREDIT Transaction:** The customer takes goods "on credit" (khata). This *increases the customer's debt* to the shop.
- **DEBIT Transaction:** The customer pays the shop (clears their debt). This *reduces the customer's debt*.
- **Total Balance Logic (`totalBalance`):** 
  - `Negative Balance`: The customer owes money to the shop (Debt). A CREDIT transaction pushes this further into the negative.
  - `Positive Balance`: The shop owes money to the customer (Advance payment). A DEBIT transaction pushes this balance towards the positive.
- The backend ensures that every transaction automatically and atomically updates the customer's `totalBalance` using Prisma transactions.

---

## 🛠️ Important Commands (Run from Monorepo Root)
- `npm run start` - Starts both backend and frontend concurrently.
- `npm run start:api` - Starts only the backend.
- `npm run start:frontend` - Starts only the frontend.
- `npm run install:all` - Installs dependencies across the entire monorepo.
- `npx prisma db push` (Run inside `khatabook-api`) - Pushes schema changes to the Supabase database.
