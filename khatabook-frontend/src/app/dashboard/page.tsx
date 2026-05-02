"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalBalance: number;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

type ModalType = null | "customer" | "product" | "transaction";

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form states
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [productForm, setProductForm] = useState({ name: "", price: "" });
  const [txForm, setTxForm] = useState({ customerId: "", productId: "", amount: "", type: "CREDIT", dueDate: "" });

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!storedToken || !storedUser) {
      router.push("/auth/login");
      return;
    }

    setToken(storedToken);
    setUser(JSON.parse(storedUser));
  }, [router]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!token) return null;
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        authFetch("/customers"),
        authFetch("/products"),
      ]);
      console.log("[Dashboard] Customers:", custRes);
      console.log("[Dashboard] Products:", prodRes);
      setCustomers(custRes?.data || []);
      setProducts(prodRes?.data || []);
    } catch (err: any) {
      console.error("[Dashboard] Fetch error:", err);
      if (err.message?.includes("Unauthorized") || err.message?.includes("token")) {
        router.push("/auth/login");
      }
    } finally {
      setLoading(false);
    }
  }, [token, authFetch, router]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!customerForm.phone && !customerForm.email) {
      setError("Please provide either a phone number or an email.");
      return;
    }

    try {
      const payload: any = { name: customerForm.name, password: customerForm.password };
      if (customerForm.phone) payload.phone = customerForm.phone;
      if (customerForm.email) payload.email = customerForm.email;

      const res = await authFetch("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("[Dashboard] Customer added:", res);
      setModal(null);
      setCustomerForm({ name: "", phone: "", email: "", password: "" });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await authFetch("/products", {
        method: "POST",
        body: JSON.stringify({ name: productForm.name, price: parseFloat(productForm.price) }),
      });
      console.log("[Dashboard] Product added:", res);
      setModal(null);
      setProductForm({ name: "", price: "" });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload: any = {
        customerId: txForm.customerId,
        amount: parseFloat(txForm.amount),
        type: txForm.type,
      };
      if (txForm.productId) payload.productId = txForm.productId;
      if (txForm.dueDate) {
        // Convert local date string to full ISO-8601 format
        payload.dueDate = new Date(txForm.dueDate).toISOString();
      }

      const res = await authFetch("/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("[Dashboard] Transaction created:", res);
      setModal(null);
      setTxForm({ customerId: "", productId: "", amount: "", type: "CREDIT", dueDate: "" });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  if (!token || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⏳</div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalOwed = customers.reduce((sum, c) => sum + (c.totalBalance < 0 ? Math.abs(c.totalBalance) : 0), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Shop Code: <code style={{ userSelect: 'all', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1.1em', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{user?.shopCode}</code> (Share with customers to login)
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span className={styles.shopBadge}>🏪 {user?.shopName}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass-panel`}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statLabel}>Total Customers</span>
          <span className={styles.statValue}>{customers.length}</span>
        </div>
        <div className={`${styles.statCard} glass-panel`}>
          <span className={styles.statIcon}>📦</span>
          <span className={styles.statLabel}>Total Products</span>
          <span className={styles.statValue}>{products.length}</span>
        </div>
        <div className={`${styles.statCard} glass-panel`}>
          <span className={styles.statIcon}>💰</span>
          <span className={styles.statLabel}>Total Outstanding</span>
          <span className={styles.statValue}>₹{totalOwed.toFixed(2)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button className={`btn-primary ${styles.actionBtn}`} onClick={() => { setError(""); setModal("customer"); }}>
          ➕ Add Customer
        </button>
        <button className={`btn-primary ${styles.actionBtn}`} onClick={() => { setError(""); setModal("product"); }}>
          ➕ Add Product
        </button>
        <button className={`btn-primary ${styles.actionBtn}`} onClick={() => { setError(""); setModal("transaction"); }}>
          ➕ New Transaction
        </button>
      </div>

      {/* Customers Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Customers</h2>
        </div>
        {customers.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <div className={styles.emptyIcon}>👥</div>
            <p>No customers yet. Add your first customer!</p>
          </div>
        ) : (
          <div className="glass-panel" style={{ overflow: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact Info</th>
                  <th>Balance</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      {c.phone && <div>📞 {c.phone}</div>}
                      {c.email && <div>✉️ {c.email}</div>}
                    </td>
                    <td className={c.totalBalance >= 0 ? styles.balancePositive : styles.balanceNegative}>
                      ₹{Math.abs(c.totalBalance).toFixed(2)}
                      {c.totalBalance < 0 ? " (owes)" : c.totalBalance > 0 ? " (credit)" : ""}
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Products</h2>
        </div>
        {products.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <div className={styles.emptyIcon}>📦</div>
            <p>No products yet. Add your first product!</p>
          </div>
        ) : (
          <div className="glass-panel" style={{ overflow: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>₹{p.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* Add Customer Modal */}
      {modal === "customer" && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Customer</h3>
            {error && <div className={styles.error}>{error}</div>}
            <form className={styles.modalForm} onSubmit={handleAddCustomer}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Name *</label>
                <input className={styles.input} required placeholder="Rahul Sharma" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Phone</label>
                <input className={styles.input} placeholder="9876543210" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input className={styles.input} type="email" placeholder="rahul@example.com" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password * (for customer login)</label>
                <input className={styles.input} type="password" required placeholder="••••••" value={customerForm.password} onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Customer</button>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {modal === "product" && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add Product</h3>
            {error && <div className={styles.error}>{error}</div>}
            <form className={styles.modalForm} onSubmit={handleAddProduct}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Product Name</label>
                <input className={styles.input} required placeholder="Toor Dal 1kg" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Price (₹)</label>
                <input className={styles.input} type="number" step="0.01" required placeholder="150" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Product</button>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Transaction Modal */}
      {modal === "transaction" && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>New Transaction</h3>
            {error && <div className={styles.error}>{error}</div>}
            <form className={styles.modalForm} onSubmit={handleAddTransaction}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Customer</label>
                <select className={styles.select} required value={txForm.customerId} onChange={(e) => setTxForm({ ...txForm, customerId: e.target.value })}>
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Product (optional)</label>
                <select className={styles.select} value={txForm.productId} onChange={(e) => setTxForm({ ...txForm, productId: e.target.value })}>
                  <option value="">None</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Amount (₹)</label>
                <input className={styles.input} type="number" step="0.01" required placeholder="500" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Type</label>
                <select className={styles.select} value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
                  <option value="CREDIT">CREDIT (Customer took on credit)</option>
                  <option value="DEBIT">DEBIT (Customer paid)</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Due Date (optional)</label>
                <input className={styles.input} type="date" value={txForm.dueDate} onChange={(e) => setTxForm({ ...txForm, dueDate: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Transaction</button>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
