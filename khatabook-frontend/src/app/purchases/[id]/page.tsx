"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function PurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadPurchase();
  }, [id]);

  const loadPurchase = async () => {
    try {
      const res = await apiFetch(`/purchase/${id}`);
      setPurchase(res.data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load purchase");
      router.push("/purchases");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading purchase...</p>
      </div>
    );
  }

  if (!purchase) return null;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Purchase Invoice</h1>
          <p className="page-subtitle">
            {purchase.invoiceNumber ? `#${purchase.invoiceNumber}` : `ID: ${purchase.id.slice(-8)}`}
            {" • "}
            {new Date(purchase.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/purchases")}>← Back to Purchases</button>
      </div>

      {/* Invoice Header */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Supplier</div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>🏢 {purchase.supplier?.name || "—"}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{purchase.supplier?.phone || purchase.supplier?.email || ""}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Invoice Number</div>
            <div style={{ fontWeight: 600 }}>{purchase.invoiceNumber || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Payment Mode</div>
            <div><span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{purchase.paymentMode}</span></div>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Status</div>
            <div>
              {purchase.dueAmount > 0 ? (
                <span className="badge badge-due" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>₹{(purchase.dueAmount || 0).toLocaleString("en-IN")} Payable</span>
              ) : (
                <span className="badge badge-paid" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>Fully Paid</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-panel" style={{ overflow: "auto", marginBottom: "1.5rem" }}>
        <h3 style={{ padding: "1rem 1.5rem 0", fontSize: "1rem", fontWeight: 600 }}>Items Received</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Purchase Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items?.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>{item.productName || item.productId.slice(-6)}</td>
                <td>{item.qty} {item.unit?.toLowerCase() || ""}</td>
                <td>₹{(item.purchasePrice || 0).toLocaleString("en-IN")}</td>
                <td style={{ fontWeight: 600 }}>₹{((item.qty || 0) * (item.purchasePrice || 0)).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "350px", marginLeft: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>₹{(purchase.subtotal || 0).toLocaleString("en-IN")}</span>
          </div>
          {(purchase.discount || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#22c55e" }}>Discount Received</span>
              <span style={{ fontWeight: 600, color: "#22c55e" }}>−₹{(purchase.discount || 0).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Paid Amount</span>
            <span style={{ fontWeight: 600, color: "#22c55e" }}>₹{(purchase.paidAmount || 0).toLocaleString("en-IN")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{purchase.dueAmount > 0 ? "Pending Payable" : "Net Amount"}</span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: purchase.dueAmount > 0 ? "#ef4444" : "#22c55e" }}>
              ₹{purchase.dueAmount > 0 ? (purchase.dueAmount || 0).toLocaleString("en-IN") : (purchase.subtotal || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Notes</div>
          <div>{purchase.notes}</div>
        </div>
      )}
    </div>
  );
}
