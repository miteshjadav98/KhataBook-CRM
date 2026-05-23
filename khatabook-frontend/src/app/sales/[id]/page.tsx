"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ invoiceNumber: "", discount: "", notes: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadSale();
  }, [id]);

  const loadSale = async () => {
    try {
      const [saleRes, histRes] = await Promise.all([
        apiFetch(`/sales/${id}`),
        apiFetch(`/sales/${id}/edit-history`).catch(() => ({ data: [] })),
      ]);
      setSale(saleRes.data);
      setEditHistory(histRes.data || []);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load sale");
      router.push("/sales");
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = () => {
    setEditData({
      invoiceNumber: sale.invoiceNumber || "",
      discount: sale.discount?.toString() || "0",
      notes: sale.notes || "",
      reason: "",
    });
    setEditing(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.reason.trim()) {
      alert("Edit reason is mandatory");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/sales/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          invoiceNumber: editData.invoiceNumber,
          discount: parseFloat(editData.discount) || 0,
          notes: editData.notes,
          reason: editData.reason,
        }),
      });
      setEditing(false);
      loadSale();
    } catch (err: any) {
      alert(err.message || "Failed to edit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const hoursSinceCreation = sale ? (Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60) : 0;

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading invoice...</p>
      </div>
    );
  }

  if (!sale) return null;

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 Sales Invoice</h1>
          <p className="page-subtitle">
            {sale.invoiceNumber ? `#${sale.invoiceNumber}` : `ID: ${sale.id.slice(-8)}`}
            {" • "}
            {new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-primary" onClick={openEditForm} style={{ fontSize: "0.85rem" }}>
            ✏️ Edit Invoice
          </button>
          <button className="btn-secondary" onClick={() => router.push("/sales")}>← Back</button>
        </div>
      </div>

      {/* Edit Badge */}
      {(sale.editCount || 0) > 0 && (
        <div style={{
          background: "rgba(245, 158, 11, 0.12)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "12px",
          padding: "0.75rem 1.25rem",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
        }}>
          🔄 <strong>Edited {sale.editCount} time{sale.editCount > 1 ? "s" : ""}</strong>
          {" • Last: "}{new Date(sale.lastEditedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {" • Reason: "}<em>{sale.lastEditReason}</em>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <form onSubmit={handleEditSubmit} className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: "4px solid #f59e0b" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>✏️ Edit Invoice</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ⚠️ This edit will be logged and visible to the customer. Provide a clear reason.
            {hoursSinceCreation > 24 && (
              <span style={{ color: "#ef4444", display: "block", marginTop: "0.25rem" }}>
                ⛔ Financial edits (discount) are locked after 24 hours.
              </span>
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label>Invoice Number</label>
              <input className="form-input" value={editData.invoiceNumber} onChange={e => setEditData({ ...editData, invoiceNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Discount (₹) {hoursSinceCreation > 24 && "🔒"}</label>
              <input className="form-input" type="number" step="any" value={editData.discount}
                onChange={e => setEditData({ ...editData, discount: e.target.value })}
                disabled={hoursSinceCreation > 24}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input className="form-input" value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: "#ef4444" }}>Reason for Edit * (visible to customer)</label>
              <input className="form-input" required placeholder="e.g. Corrected discount amount" value={editData.reason}
                onChange={e => setEditData({ ...editData, reason: e.target.value })}
                style={{ borderColor: "#f59e0b" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Invoice Header */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Customer</div>
            <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>👤 {sale.customer?.name || "—"}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{sale.customer?.phone || sale.customer?.email || ""}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Invoice Number</div>
            <div style={{ fontWeight: 600 }}>{sale.invoiceNumber || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Payment Mode</div>
            <div><span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{sale.paymentMode}</span></div>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Status</div>
            <div>
              {sale.dueAmount > 0 ? (
                <span className="badge badge-due" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>₹{(sale.dueAmount || 0).toLocaleString("en-IN")} Pending</span>
              ) : (
                <span className="badge badge-paid" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>Fully Paid</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-panel" style={{ overflow: "auto", marginBottom: "1.5rem" }}>
        <h3 style={{ padding: "1rem 1.5rem 0", fontSize: "1rem", fontWeight: 600 }}>Items</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>{item.productName || item.productId.slice(-6)}</td>
                <td>{item.qty} {item.unit?.toLowerCase() || ""}</td>
                <td>₹{(item.sellingPrice || 0).toLocaleString("en-IN")}</td>
                <td style={{ fontWeight: 600 }}>₹{(item.total || 0).toLocaleString("en-IN")}</td>
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
            <span style={{ fontWeight: 600 }}>₹{(sale.subtotal || 0).toLocaleString("en-IN")}</span>
          </div>
          {(sale.discount || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#22c55e" }}>Discount (Chhoot)</span>
              <span style={{ fontWeight: 600, color: "#22c55e" }}>−₹{(sale.discount || 0).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Paid Amount</span>
            <span style={{ fontWeight: 600, color: "#22c55e" }}>₹{(sale.paidAmount || 0).toLocaleString("en-IN")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{sale.dueAmount > 0 ? "Pending Due" : "Net Amount"}</span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: sale.dueAmount > 0 ? "#ef4444" : "#22c55e" }}>
              ₹{sale.dueAmount > 0 ? (sale.dueAmount || 0).toLocaleString("en-IN") : (sale.subtotal || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Profit</span>
            <span style={{ fontWeight: 600, color: (sale.profit || 0) > 0 ? "#22c55e" : "#ef4444" }}>₹{(sale.profit || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {sale.notes && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Notes</div>
          <div>{sale.notes}</div>
        </div>
      )}

      {/* Edit History */}
      {editHistory.length > 0 && (
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>📝 Edit History ({editHistory.length})</h3>
          {editHistory.map((log: any, idx: number) => (
            <div key={log.id || idx} style={{
              padding: "0.75rem",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "8px",
              marginBottom: idx < editHistory.length - 1 ? "0.5rem" : 0,
              borderLeft: "3px solid #f59e0b",
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {new Date(log.editedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div style={{ fontWeight: 500, marginTop: "0.15rem" }}>Reason: {log.reason}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>{log.changesSummary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
