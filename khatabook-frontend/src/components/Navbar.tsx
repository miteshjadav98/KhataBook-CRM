"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      } else {
        setUser(null);
      }
    };

    handleStorageChange(); // Initial check
    
    // Poll for changes in case localStorage is modified in the same tab
    const interval = setInterval(handleStorageChange, 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <header className="navbar glass-panel">
      <div className="nav-container">
        <Link href="/" className="logo">
          Khata<span className="text-gradient">Book</span>
        </Link>
        <nav className="nav-links">
          {user?.role === "ADMIN" && (
            <>
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <Link href="/customers" className="nav-link">Customers</Link>
              <Link href="/products" className="nav-link">Products</Link>
              <Link href="/transactions" className="nav-link">Transactions</Link>
            </>
          )}
          {user?.type === "CUSTOMER" && (
            <Link href="/my-khata" className="nav-link">My Khata</Link>
          )}
          
          {!user ? (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Link href="/auth/login" className="btn-primary login-btn">Shop Login</Link>
              <Link href="/auth/customer-login" className="btn-secondary login-btn">Customer Login</Link>
            </div>
          ) : (
            <button 
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setUser(null);
                window.location.href = "/auth/login";
              }}
              className="btn-secondary login-btn"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
