"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    loadTransactions();
  }, [page, router]);

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (filters.status) params.set("status", filters.status);
      if (filters.startDate) params.set("startDate", new Date(filters.startDate).toISOString());
      if (filters.endDate) params.set("endDate", new Date(filters.endDate).toISOString());

      const res = await apiFetch(`/transactions?${params.toString()}`);
      setTransactions(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    loadTransactions();
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 All Transactions</h1>
          <p className="page-subtitle">{meta?.total || 0} total transactions</p>
        </div>
        <button className="btn-primary" onClick={() => router.push("/transactions/new")}>+ New Transaction</button>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="PAID">✅ Paid (चुकता)</option>
          <option value="DUE">⏳ Due (बकाया)</option>
          <option value="OVERDUE">⚠️ Overdue</option>
        </select>
        <input className="form-input" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
        <input className="form-input" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
        <button className="btn-secondary" onClick={handleFilter} style={{ width: "auto", padding: "0.6rem 1rem" }}>🔍 Filter</button>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      ) : transactions.length === 0 ? (
        <div className="empty-state glass-panel">
          <div className="empty-icon">📋</div>
          <p>No transactions found</p>
        </div>
      ) : (
        <>
          <div className="glass-panel" style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.transactionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    <td style={{ fontWeight: 500 }}>{tx.customer?.name || "—"}</td>
                    <td>
                      <span className={`badge ${tx.type === "UDHAR" ? "badge-udhar" : "badge-jama"}`}>
                        {tx.type === "UDHAR" ? "उधार" : "जमा"}
                      </span>
                    </td>
                    <td>₹{tx.totalAmount.toLocaleString("en-IN")}</td>
                    <td style={{ color: "#22c55e" }}>₹{tx.paidAmount.toLocaleString("en-IN")}</td>
                    <td style={{ color: tx.remainingAmount > 0 ? "#ef4444" : "var(--text-secondary)" }}>
                      ₹{tx.remainingAmount.toLocaleString("en-IN")}
                    </td>
                    <td><span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ width: "auto", padding: "0.5rem 1rem" }}>← Prev</button>
              <span style={{ padding: "0.5rem 1rem", color: "var(--text-secondary)" }}>Page {page} of {meta.totalPages}</span>
              <button className="btn-secondary" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)} style={{ width: "auto", padding: "0.5rem 1rem" }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
