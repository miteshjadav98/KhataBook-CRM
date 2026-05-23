"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface ShopOption {
  shopId: string;
  shopName: string;
  shopCode: string;
  totalReceivable: number;
  customerName: string;
}

export default function CustomerLoginPage() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<ShopOption[] | null>(null);
  const [selectingShop, setSelectingShop] = useState(false);
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

      // Multiple shops found — show shop picker
      if (res.multipleShops) {
        setShops(res.shops);
        setSelectingShop(true);
        setLoading(false);
        return;
      }

      // Single shop — auto-login
      completeLogin(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShopSelect = async (shopId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/customers/login", {
        method: "POST",
        body: JSON.stringify({ ...form, shopId }),
      });
      completeLogin(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data: any) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({ ...data.customer, type: "CUSTOMER" }));

    if (data.customer.isTemporaryPassword) {
      router.push("/auth/change-password");
    } else {
      router.push("/my-khata");
    }
  };

  // Shop Selection Screen
  if (selectingShop && shops) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
        <div className="glass-panel animate-fade-in" style={{ padding: "2rem", width: "100%", maxWidth: "500px" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", textAlign: "center" }}>
            🏪 Select Your Shop
          </h1>
          <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
            Your account is linked to {shops.length} shops. Choose one to view your Khata.
          </p>

          {error && <p className="form-error" style={{ marginBottom: "1rem", textAlign: "center" }}>❌ {error}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {shops.map((shop) => (
              <button
                key={shop.shopId}
                onClick={() => handleShopSelect(shop.shopId)}
                disabled={loading}
                className="glass-panel"
                style={{
                  padding: "1.25rem",
                  cursor: "pointer",
                  textAlign: "left",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  transition: "all 0.2s",
                  background: "var(--bg-secondary)",
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--accent-blue)")}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>🏪 {shop.shopName}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      Welcome, {shop.customerName}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {shop.totalReceivable > 0 ? (
                      <div>
                        <div style={{ fontWeight: 700, color: "#ef4444", fontSize: "1.1rem" }}>
                          ₹{(shop.totalReceivable || 0).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>due</div>
                      </div>
                    ) : (
                      <span className="badge badge-paid" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>Clear ✓</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button 
            className="btn-secondary" 
            style={{ width: "100%", marginTop: "1rem" }} 
            onClick={() => { setSelectingShop(false); setShops(null); }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Login Form
  return (
    <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
      <div className="glass-panel animate-fade-in" style={{ padding: "2rem", width: "100%", maxWidth: "420px" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", textAlign: "center" }}>
          🏪 Customer Login
        </h1>
        <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          Enter your phone/email and password
        </p>

        {error && <p className="form-error" style={{ marginBottom: "1rem", textAlign: "center" }}>❌ {error}</p>}

        <form onSubmit={handleSubmit}>
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
