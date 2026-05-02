"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Transaction {
  id: string;
  transactionDate: string;
  type: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  discountAmount: number;
  status: string;
  dueDate: string | null;
  description: string | null;
  calculatedInterest?: number;
  totalWithInterest?: number;
  monthsOverdue?: number;
  product?: { name: string; price: number };
}

export default function MyKhataPage() {
  const router = useRouter();
  const [balanceData, setBalanceData] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).type !== "CUSTOMER") {
      router.push("/auth/customer-login");
      return;
    }

    Promise.all([
      apiFetch("/customers/me/balance"),
      apiFetch("/customers/me/transactions?limit=50")
    ])
      .then(([balRes, txRes]) => {
        setBalanceData(balRes.data);
        setTransactions(txRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading your Khata...</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {balanceData && (
        <div className="page-header" style={{ marginBottom: "1rem" }}>
          <div>
            <h1 className="page-title">📒 My Khata</h1>
            <p className="page-subtitle">Shop: <strong>{balanceData.shopName}</strong></p>
          </div>
        </div>
      )}

      {balanceData && (
        <div className="metrics-grid">
          <div className="metric-card glass-panel" style={{ background: balanceData.totalBalance > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)" }}>
            <div className="metric-label" style={{ color: "var(--text-primary)" }}>
              {balanceData.totalBalance > 0 ? "बकाया (Total Due)" : "Clear (No Due)"}
            </div>
            <div className="metric-value" style={{ color: balanceData.totalBalance > 0 ? "#ef4444" : "#22c55e" }}>
              ₹{Math.abs(balanceData.totalBalance).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: "1rem", marginTop: "2rem" }}>Recent Transactions</h3>
      
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📒</div>
            <p>No transactions found</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="ledger-entry">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span className={`badge ${tx.type === "UDHAR" ? "badge-udhar" : "badge-jama"}`}>
                    {tx.type === "UDHAR" ? "उधार" : "जमा"}
                  </span>
                  <span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {new Date(tx.transactionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {tx.description && ` • ${tx.description}`}
                  {tx.product && ` • ${tx.product.name}`}
                </div>
                
                {tx.calculatedInterest && tx.calculatedInterest > 0 && (
                  <div style={{ fontSize: "0.8rem", color: "#f97316", marginTop: "0.15rem" }}>
                    ⚠️ Overdue Interest Added: ₹{tx.calculatedInterest}
                  </div>
                )}
                {tx.dueDate && tx.status === "DUE" && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    Due Date: {new Date(tx.dueDate).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={`ledger-amount ${tx.type === "UDHAR" ? "udhar" : "jama"}`} style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  {tx.type === "UDHAR" ? "+" : "-"}₹{tx.totalAmount.toLocaleString("en-IN")}
                </div>
                <div className="ledger-balance" style={{ color: "var(--text-primary)" }}>
                  {tx.type === "UDHAR" ? `Remaining: ₹${tx.remainingAmount.toLocaleString("en-IN")}` : `Paid: ₹${tx.paidAmount.toLocaleString("en-IN")}`}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
