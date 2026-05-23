"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
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
    loadSales();
  }, [router]);

  const loadSales = async () => {
    try {
      const res = await apiFetch(`/sales`);
      setSales(res.data || []);
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
          <h1 className="page-title">📈 Sales Invoices</h1>
          <p className="page-subtitle">Track your customer sales and dues</p>
        </div>
        <button className="btn-primary" onClick={() => router.push("/sales/new")}>+ New Sale</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading sales...</p>
      ) : sales.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">📈</div>
          <p>No sales found. Create your first invoice!</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Paid</th>
                <th>Pending Due</th>
                <th>Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale: any) => (
                <tr key={sale.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/sales/${sale.id}`)}>
                  <td>{new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td style={{ fontWeight: 600 }}>{sale.invoiceNumber || "—"}</td>
                  <td style={{ fontWeight: 500, color: "var(--accent-blue)" }}>{sale.customer?.name || "—"}</td>
                  <td>
                    {sale.items?.length || 0} items
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{(sale.subtotal || 0).toLocaleString("en-IN")}</td>
                  <td>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>₹{(sale.paidAmount || 0).toLocaleString("en-IN")}</span>
                  </td>
                  <td>
                    {sale.dueAmount > 0 ? (
                      <span className="badge badge-due" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                        ₹{(sale.dueAmount || 0).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="badge badge-paid" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
                        Cleared
                      </span>
                    )}
                  </td>
                  <td><span className="badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>{sale.paymentMode}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
