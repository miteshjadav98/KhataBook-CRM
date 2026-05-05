"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="navbar glass-panel">
      <div className="nav-container">
        <Link href="/" className="logo">
          Khata<span className="text-gradient">Book</span>
        </Link>

        {/* Hamburger button – visible only on mobile */}
        <button
          className={`hamburger${menuOpen ? " hamburger--open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span className="hamburger__line" />
          <span className="hamburger__line" />
          <span className="hamburger__line" />
        </button>

        <nav className={`nav-links${menuOpen ? " nav-links--open" : ""}`}>
          {user?.role === "ADMIN" && (
            <>
              <Link href="/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link href="/customers" className="nav-link" onClick={() => setMenuOpen(false)}>Customers</Link>
              <Link href="/products" className="nav-link" onClick={() => setMenuOpen(false)}>Products</Link>
              <Link href="/transactions" className="nav-link" onClick={() => setMenuOpen(false)}>Transactions</Link>
            </>
          )}
          {user?.type === "CUSTOMER" && (
            <Link href="/my-khata" className="nav-link" onClick={() => setMenuOpen(false)}>My Khata</Link>
          )}
          
          {!user ? (
            <div className="nav-auth-buttons">
              <Link href="/auth/login" className="btn-primary login-btn" onClick={() => setMenuOpen(false)}>Shop Login</Link>
              <Link href="/auth/customer-login" className="btn-secondary login-btn" onClick={() => setMenuOpen(false)}>Customer Login</Link>
            </div>
          ) : (
            <button 
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setUser(null);
                setMenuOpen(false);
                window.location.href = "/auth/login";
              }}
              className="btn-secondary login-btn"
            >
              Logout
            </button>
          )}
        </nav>
      </div>

      {/* Overlay for mobile menu */}
      {menuOpen && (
        <div
          className="nav-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}
