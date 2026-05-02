"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalBalance: number;
  isTemporaryPassword: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadCustomers();
  }, [router]);

  const loadCustomers = async () => {
    try {
      const res = await apiFetch("/customers");
      setCustomers(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/customers", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setFormData({ name: "", phone: "", email: "", password: "" });
      setShowForm(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await apiFetch(`/customers/${id}`, { method: "DELETE" });
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Customers</h1>
          <p className="page-subtitle">{customers.length} total customers</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Add New Customer</h3>
          {error && <p className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            <div className="form-group">
              <label>Name *</label>
              <input className="form-input" placeholder="Customer name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" placeholder="9876543210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Temp Password *</label>
              <input className="form-input" type="password" placeholder="Min 6 chars" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>Save Customer</button>
        </form>
      )}

      <div className="filters-bar">
        <input className="form-input" placeholder="🔍 Search by name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: "100%" }} />
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">👥</div>
          <p>No customers found</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Balance (बकाया)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>
                    <div>{c.phone || "—"}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{c.email || ""}</div>
                  </td>
                  <td>
                    <span style={{ color: c.totalBalance > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                      ₹{Math.abs(c.totalBalance).toLocaleString("en-IN")}
                    </span>
                    {c.totalBalance > 0 && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}> due</span>}
                  </td>
                  <td>
                    {c.isTemporaryPassword && <span className="badge badge-due">Temp Pass</span>}
                    {c.totalBalance > 0 && <span className="badge badge-udhar" style={{ marginLeft: "0.25rem" }}>Udhar</span>}
                    {c.totalBalance <= 0 && !c.isTemporaryPassword && <span className="badge badge-paid">Clear</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Link href={`/customers/${c.id}`} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", width: "auto" }}>Khata</Link>
                      <button onClick={() => handleDelete(c.id, c.name)} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", width: "auto", color: "#ef4444" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
