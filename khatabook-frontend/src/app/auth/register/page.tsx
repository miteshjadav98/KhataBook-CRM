"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    shopName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log("[Register] Response:", data);

      if (!res.ok) {
        throw new Error(data.message || "Failed to register");
      }

      // Store token and user info, then go to dashboard
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      router.push("/dashboard");
    } catch (err: any) {
      console.error("[Register] Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.authCard} glass-panel animate-fade-in`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Start managing your shop today</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleRegister}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="shopName">Shop Name</label>
            <input
              id="shopName"
              type="text"
              className={styles.input}
              placeholder="My Awesome Shop"
              value={formData.shopName}
              onChange={handleChange}
              required
              minLength={2}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              className={styles.input}
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
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
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className={`btn-primary ${styles.submitBtn}`}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?{" "}
          <Link href="/auth/login" className={styles.link}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
