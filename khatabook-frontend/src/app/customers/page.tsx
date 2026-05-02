"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface CustomerData {
  id: string;
  name: string;
  phone: string;
  totalBalance: number;
  balanceStatus: string;
  amountOwed: number;
  shopName: string;
  shopInterestRate: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  purchaseDate: string;
  product?: { name: string; price: number };
}

export default function CustomersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Login State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [shopCode, setShopCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard State
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminWarning, setIsAdminWarning] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // If an ADMIN is trying to access this, show warning
      if (parsedUser.role === 'ADMIN' || parsedUser.role === 'STAFF') {
        setIsAdminWarning(true);
        setLoading(false);
        return;
      }
      setToken(storedToken);
      setUser(parsedUser);
    } else {
      setLoading(false);
    }
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

  const fetchCustomerData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [balanceRes, txRes] = await Promise.all([
        authFetch("/customers/me/balance"),
        authFetch("/customers/me/transactions?limit=5"), // just showing recent 5
      ]);
      console.log("[Customer Dashboard] Balance:", balanceRes);
      console.log("[Customer Dashboard] Tx:", txRes);
      
      setCustomerData(balanceRes?.data || null);
      setTransactions(txRes?.data || []);
    } catch (err: any) {
      console.error("[Customer Dashboard] Error:", err);
      if (err.message?.includes("Unauthorized") || err.message?.includes("token")) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (token) {
      fetchCustomerData();
    }
  }, [token, fetchCustomerData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_URL}/customers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, shopCode }),
      });

      const data = await res.json();
      console.log("[Customer Login] Response:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to login");
      }

      // Store token
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify({ ...data.data.customer, role: 'CUSTOMER' }));
      
      setToken(data.data.token);
      setUser({ ...data.data.customer, role: 'CUSTOMER' });
    } catch (err: any) {
      console.error("[Customer Login] Error:", err);
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setCustomerData(null);
    setTransactions([]);
  };

  // If loading and we have a token, show loading state
  if (loading && token) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  // If admin is viewing this page
  if (isAdminWarning) {
    return (
      <div className={styles.container}>
        <div className={`${styles.authCard} glass-panel`} style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Testing Customer Portal?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You are currently logged in as an Admin. To test the Customer Portal flow, please log out of your admin account or open an Incognito window.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn-primary" style={{ display: 'inline-block', padding: '0.5rem 1rem' }}>
              Back to Dashboard
            </Link>
            <button 
              onClick={() => {
                handleLogout();
                window.location.reload();
              }} 
              className="btn-secondary"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If no token, show login form
  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Customer Portal</h1>
          <p className={styles.subtitle}>Log in to view your balance and transactions</p>
        </div>

        <div className={`${styles.authCard} glass-panel animate-fade-in`}>
          {loginError && <div className={styles.error}>{loginError}</div>}

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="shopCode">Shop Code</label>
              <input
                id="shopCode"
                type="text"
                className={styles.input}
                placeholder="Ask your shopkeeper for this"
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="identifier">Email or Phone</label>
              <input
                id="identifier"
                type="text"
                className={styles.input}
                placeholder="Your email or 10-digit phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoggingIn}
              style={{ marginTop: '1rem' }}
            >
              {isLoggingIn ? "Logging in..." : "Access My Khata"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If logged in, show dashboard
  if (!customerData) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Hello, {customerData.name}</h1>
        <p className={styles.subtitle}>Welcome to your Khata for <strong>{customerData.shopName}</strong></p>
      </div>

      <div className={`${styles.balanceCard} glass-panel animate-fade-in`}>
        <div className={styles.balanceLabel}>Your Current Balance</div>
        <div className={`${styles.balanceAmount} ${customerData.totalBalance < 0 ? styles.balanceOwed : styles.balanceClear}`}>
          ₹{customerData.amountOwed.toFixed(2)}
        </div>
        <div className={`${styles.balanceStatus} ${customerData.totalBalance < 0 ? styles.statusOutstanding : styles.statusClear}`}>
          {customerData.totalBalance < 0 ? "You Owe Shop" : customerData.totalBalance > 0 ? "Shop Owes You" : "All Clear"}
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </div>

      <div className={styles.txSection}>
        <h2 className={styles.txTitle}>Recent Transactions</h2>
        {transactions.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No recent transactions found.
          </div>
        ) : (
          <div className={styles.txList}>
            {transactions.map((tx) => (
              <div key={tx.id} className={`${styles.txItem} glass-panel animate-fade-in delay-100`}>
                <div className={styles.txInfo}>
                  <span className={`${styles.txType} ${tx.type === 'CREDIT' ? styles.txCredit : styles.txDebit}`}>
                    {tx.type === 'CREDIT' ? 'Borrowed' : 'Paid'}
                  </span>
                  <span className={styles.txDate}>{new Date(tx.purchaseDate).toLocaleDateString()}</span>
                  {tx.product && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Item: {tx.product.name}</span>}
                </div>
                <div className={`${styles.txAmount} ${tx.type === 'CREDIT' ? styles.txCredit : styles.txDebit}`}>
                  {tx.type === 'CREDIT' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
