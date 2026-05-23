"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function CustomerSaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).type !== "CUSTOMER") {
      router.push("/auth/customer-login");
      return;
    }
    loadSale();
  }, [id]);

  const loadSale = async () => {
    try {
      const res = await apiFetch(`/customers/me/sale/${id}`);
      setSale(res.data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load invoice");
      router.push("/my-khata");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading invoice...</p>
      </div>
    );
  }

  if (!sale) return null;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 Invoice</h1>
          <p className="page-subtitle">
            {sale.invoiceNumber ? `#${sale.invoiceNumber}` : `ID: ...${sale.id.slice(-6)}`}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/my-khata")}>← Back</button>
      </div>

      {/* Edit Warning Banner */}
      {sale.isEdited && (
        <div style={{
          background: "rgba(245, 158, 11, 0.12)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}>
          <div style={{ fontWeight: 600, color: "#d97706", marginBottom: "0.25rem" }}>
            ⚠️ This invoice was modified {sale.editCount} time{sale.editCount > 1 ? "s" : ""}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Last edit: {new Date(sale.lastEditedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Reason: <strong>{sale.lastEditReason}</strong>
          </div>
        </div>
      )}

      {/* Invoice Header */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Shop</div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>🏪 {sale.shopName}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Date</div>
            <div style={{ fontWeight: 500 }}>
              {new Date(sale.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Payment Mode</div>
            <span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{sale.paymentMode}</span>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Status</div>
            {sale.dueAmount > 0 ? (
              <span className="badge badge-due" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>₹{sale.dueAmount} Due</span>
            ) : (
              <span className="badge badge-paid" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>Paid</span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="glass-panel" style={{ overflow: "auto", marginBottom: "1.5rem" }}>
        <h3 style={{ padding: "1rem 1.25rem 0", fontSize: "1rem", fontWeight: 600 }}>Items Purchased</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>{item.productName}</td>
                <td>{item.qty} {item.unit?.toLowerCase()}</td>
                <td>₹{item.price?.toLocaleString("en-IN")}</td>
                <td style={{ fontWeight: 600 }}>₹{item.total?.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>₹{sale.subtotal?.toLocaleString("en-IN")}</span>
          </div>
          {(sale.discount || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#22c55e" }}>Discount</span>
              <span style={{ fontWeight: 600, color: "#22c55e" }}>−₹{sale.discount?.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Paid</span>
            <span style={{ fontWeight: 600, color: "#22c55e" }}>₹{sale.paidAmount?.toLocaleString("en-IN")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{sale.dueAmount > 0 ? "Balance Due (बकाया)" : "Total"}</span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: sale.dueAmount > 0 ? "#ef4444" : "#22c55e" }}>
              ₹{sale.dueAmount > 0 ? sale.dueAmount?.toLocaleString("en-IN") : sale.paidAmount?.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {sale.notes && (
        <div className="glass-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Notes</div>
          <div>{sale.notes}</div>
        </div>
      )}

      {/* Edit History */}
      {sale.editHistory?.length > 0 && (
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>📝 Modification History</h3>
          {sale.editHistory.map((edit: any, idx: number) => (
            <div key={idx} style={{
              padding: "0.75rem",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "8px",
              marginBottom: idx < sale.editHistory.length - 1 ? "0.5rem" : 0,
              borderLeft: "3px solid #f59e0b",
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {new Date(edit.editedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ fontWeight: 500, marginTop: "0.15rem" }}>Reason: {edit.reason}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>{edit.changesSummary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
