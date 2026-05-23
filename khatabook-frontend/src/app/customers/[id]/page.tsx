"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [custRes, salesRes, paymentRes] = await Promise.all([
        apiFetch(`/customers/${id}`),
        apiFetch(`/sales`),
        apiFetch(`/payment`),
      ]);
      setCustomer(custRes.data);

      // Filter sales & payments for this customer
      const allSales = salesRes.data || [];
      const allPayments = paymentRes.data || [];

      setSales(allSales.filter((s: any) => s.customerId === id));
      setPayments(allPayments.filter((p: any) => p.customerId === id && p.type === "CUSTOMER_PAYMENT"));
    } catch (err: any) {
      console.error(err);
      alert("Failed to load customer data");
      router.push("/customers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading customer...</p>
      </div>
    );
  }

  if (!customer) return null;

  // Merge sales & payments into a unified ledger sorted by date
  const ledger = [
    ...sales.map((s: any) => ({
      id: s.id,
      date: s.createdAt,
      type: "SALE" as const,
      description: s.invoiceNumber ? `Invoice #${s.invoiceNumber}` : `Sale (${s.items?.length || 0} items)`,
      debit: s.subtotal - (s.discount || 0),
      credit: s.paidAmount,
      balance: s.dueAmount,
      link: `/sales/${s.id}`,
    })),
    ...payments.map((p: any) => ({
      id: p.id,
      date: p.createdAt,
      type: "PAYMENT" as const,
      description: `Payment via ${p.paymentMode}${p.notes ? ` • ${p.notes}` : ""}`,
      debit: 0,
      credit: p.amount,
      balance: 0,
      link: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.subtotal - (s.discount || 0)), 0);
  const totalPaidAmount = sales.reduce((sum, s) => sum + s.paidAmount, 0) + payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 {customer.name}</h1>
          <p className="page-subtitle">
            {customer.phone || customer.email || "No contact info"}
            {" • Customer since "}
            {new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push("/customers")}>← Back to Customers</button>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid" style={{ marginBottom: "2rem" }}>
        <div className="metric-card glass-panel" style={{ background: customer.totalReceivable > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)" }}>
          <div className="metric-label">Outstanding Balance (बकाया)</div>
          <div className="metric-value" style={{ color: customer.totalReceivable > 0 ? "#ef4444" : "#22c55e" }}>
            ₹{Math.abs(customer.totalReceivable || 0).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
            {customer.totalReceivable > 0 ? "Amount to receive" : "No dues"}
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-label">Total Sales</div>
          <div className="metric-value">₹{totalSalesAmount.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>{sales.length} invoices</div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-label">Total Received</div>
          <div className="metric-value" style={{ color: "#22c55e" }}>₹{totalPaidAmount.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>Cash + Online</div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-label">Invoices</div>
          <div className="metric-value">{sales.length}</div>
          <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
            {sales.filter(s => s.dueAmount > 0).length} pending
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontWeight: 600 }}>Customer Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          {[
            ["Phone", customer.phone || "—"],
            ["Email", customer.email || "—"],
            ["GSTIN", customer.gstin || "—"],
            ["Billing Address", customer.billingAddress || "—"],
            ["Shipping Address", customer.shippingAddress || "—"],
            ["Shop", customer.shopName || "—"],
            ["Password Status", customer.isTemporaryPassword ? "🔑 Temporary" : "✅ Changed"],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>{label}</div>
              <div style={{ fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ledger */}
      <div className="glass-panel" style={{ overflow: "auto" }}>
        <h3 style={{ padding: "1rem 1.5rem 0", fontSize: "1.1rem", fontWeight: 600 }}>📒 Transaction Ledger</h3>
        {ledger.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <p style={{ color: "var(--text-secondary)" }}>No transactions yet for this customer</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit (उधार)</th>
                <th>Credit (जमा)</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ fontSize: "0.85rem" }}>
                    {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="badge" style={{
                        backgroundColor: entry.type === "SALE" ? "#fef3c7" : "#dbeafe",
                        color: entry.type === "SALE" ? "#d97706" : "#2563eb",
                        fontSize: "0.7rem",
                      }}>
                        {entry.type === "SALE" ? "📤 Sale" : "💰 Payment"}
                      </span>
                      {entry.link ? (
                        <Link href={entry.link} style={{ fontWeight: 500, color: "var(--accent-blue)", textDecoration: "underline" }}>
                          {entry.description}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{entry.description}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "#ef4444", fontWeight: entry.debit > 0 ? 600 : 400 }}>
                    {entry.debit > 0 ? `₹${entry.debit.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td style={{ color: "#22c55e", fontWeight: entry.credit > 0 ? 600 : 400 }}>
                    {entry.credit > 0 ? `₹${entry.credit.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td>
                    {entry.type === "SALE" && entry.balance > 0 ? (
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>₹{entry.balance.toLocaleString("en-IN")}</span>
                    ) : (
                      <span style={{ color: "#22c55e" }}>—</span>
                    )}
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
