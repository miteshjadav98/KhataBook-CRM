"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalReceivable: number;
  isTemporaryPassword: boolean;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", phone: "", email: "", password: "", 
    gstin: "", billingAddress: "", shippingAddress: "" 
  });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
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
      setCustomers(res.data || []);
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
      if (editId) {
        await apiFetch(`/customers/${editId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            gstin: formData.gstin || undefined,
            billingAddress: formData.billingAddress || undefined,
            shippingAddress: formData.shippingAddress || undefined,
          }),
        });
      } else {
        await apiFetch("/customers", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setFormData({ 
        name: "", phone: "", email: "", password: "", 
        gstin: "", billingAddress: "", shippingAddress: "" 
      });
      setShowForm(false);
      setEditId(null);
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

  const handleEdit = (c: Customer) => {
    setFormData({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      password: "",
      gstin: c.gstin || "",
      billingAddress: c.billingAddress || "",
      shippingAddress: c.shippingAddress || "",
    });
    setEditId(c.id);
    setShowForm(true);
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
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setFormData({ name: "", phone: "", email: "", password: "", gstin: "", billingAddress: "", shippingAddress: "" }); }}>
          {showForm ? "✕ Cancel" : "+ Add Customer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>{editId ? "Edit Customer" : "Add New Customer"}</h3>
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
            {!editId && (
              <div className="form-group">
                <label>Temp Password *</label>
                <input className="form-input" type="password" placeholder="Min 6 chars" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
            )}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>GSTIN (Optional)</label>
              <input className="form-input" placeholder="GSTIN Number" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Billing Address (Optional)</label>
              <input className="form-input" placeholder="Flat / Building, Area, City, State, PIN" value={formData.billingAddress} onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>{editId ? "Update" : "Save"} Customer</button>
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
                  <td>
                    <div 
                      style={{ fontWeight: 500, color: "var(--accent-blue)", cursor: "pointer", textDecoration: "underline" }} 
                      onClick={() => router.push(`/customers/${c.id}`)}
                    >
                      {c.name}
                    </div>
                  </td>
                  <td>
                    <div>{c.phone || "—"}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{c.email || ""}</div>
                  </td>
                  <td>
                    <span style={{ color: c.totalReceivable > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                      ₹{Math.abs(c.totalReceivable || 0).toLocaleString("en-IN")}
                    </span>
                    {c.totalReceivable > 0 && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}> due</span>}
                  </td>
                  <td>
                    {c.isTemporaryPassword && <span className="badge badge-due">Temp Pass</span>}
                    {c.totalReceivable > 0 && <span className="badge badge-udhar" style={{ marginLeft: "0.25rem" }}>Udhar</span>}
                    {c.totalReceivable <= 0 && !c.isTemporaryPassword && <span className="badge badge-paid">Clear</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => handleEdit(c)} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", width: "auto" }}>Edit</button>
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
