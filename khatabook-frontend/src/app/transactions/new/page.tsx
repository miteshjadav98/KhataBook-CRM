"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function NewTransactionPage() {
  const router = useRouter();
  const [type, setType] = useState<"UDHAR" | "JAMA">("UDHAR");
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    totalAmount: "",
    paidAmount: "",
    discountAmount: "0",
    dueDate: "",
    interestRate: "",
    description: "",
  });
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }

    Promise.all([apiFetch("/customers"), apiFetch("/products")])
      .then(([custRes, prodRes]) => {
        setCustomers(custRes.data);
        setProducts(prodRes.data);
      })
      .catch(console.error);
  }, [router]);

  // Calculate remaining amount dynamically
  useEffect(() => {
    if (type === "UDHAR") {
      const total = parseFloat(form.totalAmount) || 0;
      const paid = parseFloat(form.paidAmount) || 0;
      const discount = parseFloat(form.discountAmount) || 0;
      setRemaining(Math.max(0, total - paid - discount));
    }
  }, [form.totalAmount, form.paidAmount, form.discountAmount, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const body: any = {
        customerId: form.customerId,
        type,
        totalAmount: parseFloat(form.totalAmount),
        description: form.description || undefined,
      };

      if (type === "UDHAR") {
        body.productId = form.productId || undefined;
        body.paidAmount = parseFloat(form.paidAmount) || 0;
        body.discountAmount = parseFloat(form.discountAmount) || 0;
        body.dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : undefined;
        body.interestRate = parseFloat(form.interestRate) || undefined;
      }

      const res = await apiFetch("/transactions", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccess(res.message);
      setForm({ customerId: "", productId: "", totalAmount: "", paidAmount: "", discountAmount: "0", dueDate: "", interestRate: "", description: "" });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 New Transaction</h1>
          <p className="page-subtitle">Record उधार (Udhar) or जमा (Jama)</p>
        </div>
      </div>

      {/* Type Selector */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          className={type === "UDHAR" ? "btn-primary" : "btn-secondary"}
          onClick={() => setType("UDHAR")}
          style={{ flex: 1, fontSize: "1.1rem", padding: "1rem" }}
        >
          📕 उधार (Udhar) — Given on credit
        </button>
        <button
          className={type === "JAMA" ? "btn-primary" : "btn-secondary"}
          onClick={() => setType("JAMA")}
          style={{ flex: 1, fontSize: "1.1rem", padding: "1rem" }}
        >
          📗 जमा (Jama) — Payment received
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "1.5rem" }}>
        {error && <p className="form-error" style={{ marginBottom: "1rem" }}>❌ {error}</p>}
        {success && <p style={{ color: "#22c55e", marginBottom: "1rem" }}>✅ {success}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          {/* Customer */}
          <div className="form-group">
            <label>Customer *</label>
            <select className="form-select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} — Bal: ₹{c.totalBalance}
                </option>
              ))}
            </select>
          </div>

          {/* Product (only for UDHAR) */}
          {type === "UDHAR" && (
            <div className="form-group">
              <label>Product (Optional)</label>
              <select className="form-select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">No product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
                ))}
              </select>
            </div>
          )}

          {/* Total Amount */}
          <div className="form-group">
            <label>{type === "UDHAR" ? "Total Bill Amount (₹) *" : "Payment Amount (₹) *"}</label>
            <input className="form-input" type="number" step="0.01" placeholder="1500" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} required />
          </div>

          {/* Paid Amount (only UDHAR) */}
          {type === "UDHAR" && (
            <>
              <div className="form-group">
                <label>Amount Paid Now (₹)</label>
                <input className="form-input" type="number" step="0.01" placeholder="1200" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Discount (₹)</label>
                <input className="form-input" type="number" step="0.01" placeholder="0" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Interest Rate (%/month)</label>
                <input className="form-input" type="number" step="0.1" placeholder="3" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
              </div>
            </>
          )}

          {/* Description */}
          <div className="form-group">
            <label>Description / Note</label>
            <input className="form-input" placeholder="e.g. Toor Dal 2kg" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        {/* Remaining Amount Preview (for UDHAR) */}
        {type === "UDHAR" && parseFloat(form.totalAmount) > 0 && (
          <div className="glass-panel" style={{ padding: "1rem", marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Remaining Amount (बकाया)</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: remaining > 0 ? "#ef4444" : "#22c55e", fontFamily: "Outfit" }}>
                ₹{remaining.toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {remaining > 0 ? "This will be marked as DUE" : "This will be marked as PAID ✅"}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ marginTop: "1.5rem", fontSize: "1.1rem", padding: "1rem 2rem" }}>
          {type === "UDHAR" ? "📕 Record उधार (Udhar)" : "📗 Record जमा (Jama)"}
        </button>
      </form>
    </div>
  );
}
