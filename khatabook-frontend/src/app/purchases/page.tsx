"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/auth/login");
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.role !== "ADMIN") {
        router.push("/auth/login");
        return;
      }
    } catch (e) {
      router.push("/auth/login");
      return;
    }
    loadPurchases();
  }, [router]);

  const loadPurchases = async () => {
    try {
      const res = await apiFetch(`/purchase`);
      setPurchases(res.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Supplier Purchases</h1>
          <p className="page-subtitle">Track incoming stock and supplier payables</p>
        </div>
        <button className="btn-primary" onClick={() => router.push("/purchases/new")}>+ New Purchase</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading purchases...</p>
      ) : purchases.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">📦</div>
          <p>No purchases found. Add your first supplier bill!</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Paid</th>
                <th>Pending Payable</th>
                <th>Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase: any) => (
                <tr key={purchase.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/purchases/${purchase.id}`)}>
                  <td>{new Date(purchase.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td style={{ fontWeight: 600 }}>{purchase.invoiceNumber || "—"}</td>
                  <td style={{ fontWeight: 500, color: "var(--accent-purple)" }}>{purchase.supplier?.name || "—"}</td>
                  <td>
                    {purchase.items?.length || 0} items
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{(purchase.subtotal || 0).toLocaleString("en-IN")}</td>
                  <td>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>₹{(purchase.paidAmount || 0).toLocaleString("en-IN")}</span>
                  </td>
                  <td>
                    {purchase.dueAmount > 0 ? (
                      <span className="badge badge-due" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                        ₹{(purchase.dueAmount || 0).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="badge badge-paid" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
                        Cleared
                      </span>
                    )}
                  </td>
                  <td><span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{purchase.paymentMode}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
