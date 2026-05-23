"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // For Add Supplier Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", email: "", gstin: "", billingAddress: "" });
  const [submitting, setSubmitting] = useState(false);

  // For Pay Supplier Modal
  const [payModal, setPayModal] = useState<{ open: boolean; supplier: any | null }>({ open: false, supplier: null });
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMode, setPayMode] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const res = await apiFetch("/supplier");
      setSuppliers(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/supplier", {
        method: "POST",
        body: JSON.stringify(newSupplier),
      });
      setIsModalOpen(false);
      setNewSupplier({ name: "", phone: "", email: "", gstin: "", billingAddress: "" });
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || "Failed to add supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (supplier: any) => {
    setPayModal({ open: true, supplier });
    setPayAmount("");
    setPayMode("CASH");
    setPayNotes("");
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal.supplier || !payAmount) return;
    setPaying(true);
    try {
      await apiFetch("/payment", {
        method: "POST",
        body: JSON.stringify({
          type: "SUPPLIER_PAYMENT",
          supplierId: payModal.supplier.id,
          amount: Number(payAmount),
          paymentMode: payMode,
          notes: payNotes || `Payment to ${payModal.supplier.name}`,
        }),
      });
      setPayModal({ open: false, supplier: null });
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏢 Suppliers</h1>
          <p className="page-subtitle">Manage your suppliers and total payables</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Supplier</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading suppliers...</p>
      ) : suppliers.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">🏢</div>
          <p>No suppliers found. Add one to start tracking inventory purchases!</p>
        </div>
      ) : (
        <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {suppliers.map((sup: any) => (
            <div key={sup.id} className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--accent-purple)" }}>{sup.name}</h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    {sup.phone || "No phone"} • {sup.gstin || "No GSTIN"}
                  </div>
                </div>
              </div>
              
              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontWeight: 500 }}>Total Payable</span>
                <span style={{ fontSize: "1.3rem", fontWeight: 700, color: sup.totalPayable > 0 ? "var(--danger)" : "var(--success)" }}>
                  ₹{sup.totalPayable?.toLocaleString("en-IN") || 0}
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {sup.totalPayable > 0 && (
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem" }}
                    onClick={() => openPayModal(sup)}
                  >
                    💰 Pay Now
                  </button>
                )}
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem" }}
                  onClick={() => router.push(`/purchases`)}
                >
                  📦 View Purchases
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-in">
            <h2 className="modal-title">Add New Supplier</h2>
            <form onSubmit={handleCreateSupplier} className="form-container">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input type="text" className="form-input" required value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" className="form-input" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input type="text" className="form-input" value={newSupplier.gstin} onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Adding..." : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {payModal.open && payModal.supplier && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-scale-in">
            <h2 className="modal-title">💰 Pay Supplier</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Recording payment to <strong>{payModal.supplier.name}</strong>
            </p>
            <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between" }}>
              <span>Outstanding Payable</span>
              <span style={{ fontWeight: 700, color: "#ef4444", fontSize: "1.1rem" }}>₹{payModal.supplier.totalPayable?.toLocaleString("en-IN")}</span>
            </div>
            <form onSubmit={handlePaySupplier} className="form-container">
              <div className="form-group">
                <label className="form-label">Amount to Pay (₹) *</label>
                <input 
                  type="number" className="form-input" required min="1" max={payModal.supplier.totalPayable}
                  step="any" value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value === "" ? "" : parseFloat(e.target.value))} 
                  placeholder={`Max ₹${payModal.supplier.totalPayable}`}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-input" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online / UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input type="text" className="form-input" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="e.g. Paid via NEFT" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setPayModal({ open: false, supplier: null })}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={paying}>
                  {paying ? "Recording..." : `Pay ₹${Number(payAmount) || 0}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
