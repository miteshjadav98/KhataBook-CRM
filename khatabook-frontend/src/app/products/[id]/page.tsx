"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await apiFetch(`/products/${id}`);
      setProduct(res.data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load product");
      router.push("/products");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading product...</p>
      </div>
    );
  }

  if (!product) return null;

  const stockStatus = product.stockQty <= 0 ? "OUT" : product.stockQty <= product.lowStockThreshold ? "LOW" : "OK";

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 {product.name}</h1>
          <p className="page-subtitle">
            {product.unit?.toLowerCase()} • Added {new Date(product.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/products")}>← Back to Products</button>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid" style={{ marginBottom: "2rem" }}>
        <div className="metric-card glass-panel">
          <div className="metric-label">Current Stock</div>
          <div className="metric-value" style={{ color: stockStatus === "OUT" ? "#ef4444" : stockStatus === "LOW" ? "#f59e0b" : "#22c55e" }}>
            {product.stockQty} <span style={{ fontSize: "0.8rem", fontWeight: 400 }}>{product.unit?.toLowerCase()}</span>
          </div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
            {stockStatus === "OUT" ? "⛔ Out of Stock" : stockStatus === "LOW" ? "⚠️ Low Stock" : "✅ In Stock"}
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-label">Purchase Price</div>
          <div className="metric-value">₹{product.defaultPurchasePrice?.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>Cost per {product.unit?.toLowerCase()}</div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-label">Selling Price</div>
          <div className="metric-value">₹{product.defaultSellingPrice?.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>MRP per {product.unit?.toLowerCase()}</div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-label">Profit Margin</div>
          <div className="metric-value" style={{ color: product.margin > 0 ? "#22c55e" : "#ef4444" }}>
            ₹{product.margin?.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>{product.marginPercent}% margin</div>
        </div>
      </div>

      {/* Product Details */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontWeight: 600 }}>Product Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            ["SKU", product.sku || "—"],
            ["Barcode", product.barcode || "—"],
            ["Category", product.category || "—"],
            ["Low Stock Alert", `${product.lowStockThreshold} ${product.unit?.toLowerCase()}`],
            ["Unit", product.unit],
            ["Stock Value", `₹${(product.stockQty * product.defaultPurchasePrice).toLocaleString("en-IN")}`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>{label}</div>
              <div style={{ fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Movement History */}
      <div className="glass-panel" style={{ overflow: "auto" }}>
        <h3 style={{ padding: "1rem 1.5rem 0", fontSize: "1.1rem", fontWeight: 600 }}>📋 Inventory Movement History</h3>
        {product.movements?.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <p style={{ color: "var(--text-secondary)" }}>No inventory movements yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Qty Change</th>
                <th>Before → After</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {product.movements?.map((m: any) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: m.type === "PURCHASE" ? "#dbeafe" : m.type === "SALE" ? "#fef3c7" : "#e0e7ff",
                      color: m.type === "PURCHASE" ? "#2563eb" : m.type === "SALE" ? "#d97706" : "#4338ca",
                    }}>
                      {m.type === "PURCHASE" ? "📥 Purchase" : m.type === "SALE" ? "📤 Sale" : m.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: m.type === "PURCHASE" ? "#22c55e" : "#ef4444" }}>
                    {m.type === "PURCHASE" ? "+" : "−"}{m.qty}
                  </td>
                  <td>
                    {m.beforeQty} → {m.afterQty}
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {m.referenceType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
