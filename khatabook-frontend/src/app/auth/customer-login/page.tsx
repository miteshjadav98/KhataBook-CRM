"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function CustomerLoginPage() {
  const [form, setForm] = useState({ shopCode: "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/customers/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify({ ...res.data.customer, type: "CUSTOMER" }));

      // Force password change if temporary
      if (res.data.customer.isTemporaryPassword) {
        router.push("/auth/change-password");
      } else {
        router.push("/customers");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
      <div className="glass-panel animate-fade-in" style={{ padding: "2rem", width: "100%", maxWidth: "420px" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", textAlign: "center" }}>
          🏪 Customer Login
        </h1>
        <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          Enter your Shop Code and credentials
        </p>

        {error && <p className="form-error" style={{ marginBottom: "1rem", textAlign: "center" }}>❌ {error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Shop Code *</label>
            <input className="form-input" placeholder="e.g. ABC123" value={form.shopCode} onChange={(e) => setForm({ ...form, shopCode: e.target.value })} required style={{ textTransform: "uppercase" }} />
          </div>
          <div className="form-group">
            <label>Phone or Email *</label>
            <input className="form-input" placeholder="9876543210 or email" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input className="form-input" type="password" placeholder="••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "0.5rem", fontSize: "1.05rem", padding: "0.85rem" }} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
