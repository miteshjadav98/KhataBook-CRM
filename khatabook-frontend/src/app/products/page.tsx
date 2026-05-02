"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadProducts();
  }, [router]);

  const loadProducts = async () => {
    try {
      const res = await apiFetch("/products");
      setProducts(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const body = { name: formData.name, price: parseFloat(formData.price) };
      if (editId) {
        await apiFetch(`/products/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(body) });
      }
      setFormData({ name: "", price: "" });
      setShowForm(false);
      setEditId(null);
      loadProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (p: Product) => {
    setFormData({ name: p.name, price: p.price.toString() });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete product "${name}"?`)) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Products</h1>
          <p className="page-subtitle">{products.length} products in your shop</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setFormData({ name: "", price: "" }); }}>
          {showForm ? "✕ Cancel" : "+ Add Product"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>{editId ? "Edit Product" : "Add New Product"}</h3>
          {error && <p className="form-error" style={{ marginBottom: "0.75rem" }}>{error}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            <div className="form-group">
              <label>Product Name *</label>
              <input className="form-input" placeholder="e.g. Toor Dal 1kg" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Price (₹) *</label>
              <input className="form-input" type="number" step="0.01" placeholder="150" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>{editId ? "Update" : "Save"} Product</button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      ) : products.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">📦</div>
          <p>No products yet. Add your first product!</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ fontWeight: 600 }}>₹{p.price.toLocaleString("en-IN")}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => handleEdit(p)} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", width: "auto" }}>Edit</button>
                      <button onClick={() => handleDelete(p.id, p.name)} className="btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", width: "auto", color: "#ef4444" }}>Delete</button>
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
