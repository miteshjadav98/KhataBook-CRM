# Recent Project Changes Summary

This document outlines the recent major architectural and feature updates across the Khatabook CRM project, specifically focusing on the transition from a simple transaction system to a comprehensive, audit-ready business management tool.

## 1. Database Schema Updates (`prisma/schema.prisma`)
- **Deprecated `Transaction` Model**: The generic `Transaction` model was removed to provide better separation of concerns.
- **Added `SalesTransaction` & `Purchase` Models**: Introduced dedicated models for Sales and Purchases to support itemized billing, subtotals, discounts, and payment modes.
- **Added `Supplier` Model**: Implemented party-based system by adding a `Supplier` entity alongside `Customer`.
- **Enhanced `Product` Model**: Added robust inventory features including `stockQty`, `sku`, `barcode`, `defaultPurchasePrice`, `defaultSellingPrice`, `lowStockThreshold`, and an enum for units (e.g., `KG`, `L`, `PIECES`).
- **Added `InventoryMovement` Model**: Created a ledger for tracking stock changes (Purchases, Sales, Returns, Adjustments) with references to the triggering transaction.
- **Added `Payment` & `Expense` Models**: Formed the basis for a functional Cashbook to track customer/supplier payments and shop expenses separately.
- **Added `InvoiceEditLog`**: Implemented an audit-ready logging system to track who, when, and why an invoice was edited (stores before/after snapshots and the reason for edit).

## 2. Backend Architecture (`khatabook-newbackend`)
- **Removed Old Modules**: Deleted `transaction.module`, `transaction.controller`, and `transaction.service`.
- **New Feature Modules Added**:
  - `sales`: Handles itemized sales creation, editing, and retrieval.
  - `purchase`: Manages supplier purchases and stock additions.
  - `supplier`: Manages supplier CRUD operations.
  - `payment`: Handles recording of incoming and outgoing payments.
- **Updated Existing Modules**:
  - `customer`: Updated customer controllers/services and simplified the customer login DTO.
  - `product`: Refactored to support the new stock tracking and advanced metadata attributes.

## 3. Frontend Application (`khatabook-frontend`)
- **Deprecations**: Removed the legacy `/transactions` and `/transactions/new` routes.
- **New Feature Routes**:
  - `/purchases`: Interface for managing supplier purchases.
  - `/sales`: Interface for managing customer sales.
  - `/suppliers`: Interface for managing the list of suppliers.
  - `/my-khata/sale/[id]`: Added detailed, customer-facing, abstract view for a specific sale.
- **Updated Existing Routes**:
  - `/products`: Upgraded to display stock quantities, units, and new pricing structure.
  - `/customers`: Enhanced to show specific sales and payments instead of generic transactions.
  - `/dashboard`: Updated metrics and layout to reflect the new separated sales, purchases, and expense data.
  - `/auth/customer-login`: Streamlined the login flow to automatically look up and map shop relationships based on user credentials, removing the need for explicit shop codes.
- **Component Updates**: Modified `Navbar.tsx` to include the new navigation structure for Sales, Purchases, and Suppliers.

## 4. Multi-Shop Customer Login & Switch-Shop Feature (Latest Update)
- **Shared Customer Credentials Globally**: Updated customer registration so that if a customer already exists in the system (by phone or email) under another shop, their existing `passwordHash`, `isTemporaryPassword` state, and `passwordUpdatedAt` are reused. This prevents duplicate storage of passwords and different credentials across shops.
- **Synchronized Password Changes**: Refactored password modification (`changePassword`) to automatically synchronize password updates across all customer accounts sharing the same email or phone number in the system, maintaining single-sign-on credentials.
- **Secure Shop Switching Endpoints**:
  - `GET /customers/me/shops`: Lists all shops linked to the customer's phone/email with active receivables.
  - `POST /customers/me/switch-shop`: Generates a new, authenticated customer JWT token for the target shop using their active session, without re-entering passwords.
- **Seamless Frontend Shop Switcher**:
  - Embedded a "Switch Shop" selector panel directly into the `/my-khata` customer portal.
  - Displays all registered shops alongside their respective outstanding balance and a clean, premium "Active" status indicator.
  - Clicking a shop securely updates credentials in `localStorage` and reloads the viewport in less than a second.
- **Fixed Metric Data-binding**: Resolved a client-side bug where `totalBalance` was read from the balance endpoint response; unified it to map correctly to `totalReceivable` or fallback gracefully to 0.

## Next Steps for Development
- Complete the integration of the `Expense` module in the frontend.
- Finalize the Cashbook view with date and mode filters using the new `Payment` and `Expense` models.
- Ensure the 24-hour edit restriction logic is strictly enforced in the Sales/Purchase controllers.
- Test the automated discount and profit calculation logic during Sales/Purchase creation.
