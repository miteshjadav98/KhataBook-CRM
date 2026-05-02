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
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
          )}
          {(!user || user?.role === "CUSTOMER") && (
            <Link href="/customers" className="nav-link">Customer Portal</Link>
          )}
          
          {!user ? (
            <Link href="/auth/login" className="btn-primary login-btn">Login</Link>
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
