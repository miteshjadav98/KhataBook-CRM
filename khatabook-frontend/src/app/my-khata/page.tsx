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
  description: string | null;
  isEdited?: boolean;
  editCount?: number;
  isSale: boolean;
}

export default function MyKhataPage() {
  const router = useRouter();
  const [balanceData, setBalanceData] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UDHAR" | "JAMA" | "DUE">("ALL");
  const [shops, setShops] = useState<any[]>([]);
  const [switching, setSwitching] = useState(false);
  const [showShopSelector, setShowShopSelector] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).type !== "CUSTOMER") {
      router.push("/auth/customer-login");
      return;
    }

    Promise.all([
      apiFetch("/customers/me/balance"),
      apiFetch("/customers/me/ledger"),
      apiFetch("/customers/me/shops")
    ])
      .then(([balRes, txRes, shopsRes]) => {
        setBalanceData(balRes.data);
        setShops(shopsRes.data || []);
        
        const sales = txRes.data.sales || [];
        const payments = txRes.data.payments || [];
        
        const combined: Transaction[] = [
          ...sales.map((s: any) => ({
            id: s.id,
            transactionDate: s.createdAt,
            type: "UDHAR",
            totalAmount: s.subtotal,
            paidAmount: s.paidAmount,
            remainingAmount: s.dueAmount,
            discountAmount: s.discount || 0,
            status: s.dueAmount > 0 ? "DUE" : "PAID",
            description: s.invoiceNumber ? `Invoice #${s.invoiceNumber}` : "Sales Invoice",
            isEdited: (s.editCount || 0) > 0,
            editCount: s.editCount || 0,
            isSale: true,
          })),
          ...payments.map((p: any) => ({
            id: p.id,
            transactionDate: p.createdAt,
            type: "JAMA",
            totalAmount: p.amount,
            paidAmount: p.amount,
            remainingAmount: 0,
            discountAmount: 0,
            status: "PAID",
            description: `Payment via ${p.paymentMode}`,
            isSale: false,
          }))
        ].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
        
        setTransactions(combined);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSwitchShop = async (shopId: string) => {
    setSwitching(true);
    try {
      const res = await apiFetch("/customers/me/switch-shop", {
        method: "POST",
        body: JSON.stringify({ shopId }),
      });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify({ ...res.data.customer, type: "CUSTOMER" }));
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch shop", err);
      alert("Failed to switch shop. Please try again.");
      setSwitching(false);
    }
  };

  // Apply filter
  const filtered = transactions.filter((tx) => {
    if (filter === "ALL") return true;
    if (filter === "UDHAR") return tx.type === "UDHAR";
    if (filter === "JAMA") return tx.type === "JAMA";
    if (filter === "DUE") return tx.status === "DUE";
    return true;
  });

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading your Khata...</p>
      </div>
    );
  }

  const totalDue = balanceData?.totalReceivable ?? 0;

  return (
    <div className="page-container animate-fade-in">
      {balanceData && (
        <div className="page-header" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="page-title">📒 My Khata</h1>
            <p className="page-subtitle">Shop: <strong>{balanceData.shopName}</strong></p>
          </div>
          {shops.length > 1 && (
            <div>
              <button 
                className="btn-secondary" 
                onClick={() => setShowShopSelector(!showShopSelector)}
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                🏪 Switch Shop ({shops.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shop Switching Drawer/Panel */}
      {showShopSelector && shops.length > 1 && (
        <div className="glass-panel animate-fade-in" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--accent-blue)" }}>
          <h4 style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>🏪 Choose Shop to Switch</span>
            <button 
              onClick={() => setShowShopSelector(false)} 
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}
            >
              ✕
            </button>
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {shops.map((s: any) => {
              const isCurrent = s.shopName === balanceData.shopName;
              return (
                <button
                  key={s.shopId}
                  disabled={switching}
                  onClick={() => handleSwitchShop(s.shopId)}
                  className="glass-panel"
                  style={{
                    padding: "1rem",
                    cursor: isCurrent ? "default" : "pointer",
                    textAlign: "left",
                    border: isCurrent ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
                    borderRadius: "10px",
                    background: isCurrent ? "rgba(59, 130, 246, 0.05)" : "var(--bg-secondary)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    pointerEvents: isCurrent || switching ? "none" : "auto",
                    opacity: switching ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>🏪 {s.shopName}</span>
                    {isCurrent && <span style={{ fontSize: "0.75rem", backgroundColor: "var(--accent-blue)", color: "white", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>Active</span>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <span>Due:</span>
                    <span style={{ fontWeight: 700, color: s.totalReceivable > 0 ? "#ef4444" : "#22c55e" }}>
                      ₹{s.totalReceivable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {balanceData && (
        <div className="metrics-grid">
          <div className="metric-card glass-panel" style={{ background: totalDue > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)" }}>
            <div className="metric-label" style={{ color: "var(--text-primary)" }}>
              {totalDue > 0 ? "बकाया (Total Due)" : "Clear (No Due)"}
            </div>
            <div className="metric-value" style={{ color: totalDue > 0 ? "#ef4444" : "#22c55e" }}>
              ₹{Math.abs(totalDue).toLocaleString("en-IN")}
            </div>
          </div>
          <div className="metric-card glass-panel">
            <div className="metric-label">Total Transactions</div>
            <div className="metric-value">{transactions.length}</div>
          </div>
          <div className="metric-card glass-panel">
            <div className="metric-label">Pending Invoices</div>
            <div className="metric-value" style={{ color: "#f59e0b" }}>
              {transactions.filter(t => t.status === "DUE").length}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {([
          { key: "ALL", label: "All" },
          { key: "UDHAR", label: "उधार (Sales)" },
          { key: "JAMA", label: "जमा (Payments)" },
          { key: "DUE", label: "⏳ Pending" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? "btn-primary" : "btn-secondary"}
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", width: "auto" }}
          >
            {label}
          </button>
        ))}
      </div>

      <h3 style={{ marginBottom: "1rem" }}>
        {filter === "ALL" ? "Recent Transactions" : filter === "UDHAR" ? "Sales (उधार)" : filter === "JAMA" ? "Payments (जमा)" : "Pending Dues"}
        <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--text-secondary)", marginLeft: "0.5rem" }}>
          ({filtered.length})
        </span>
      </h3>
      
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📒</div>
            <p>No transactions found</p>
          </div>
        ) : (
          filtered.map((tx) => (
            <div 
              key={tx.id} 
              className="ledger-entry"
              style={{ cursor: tx.isSale ? "pointer" : "default" }}
              onClick={() => tx.isSale && router.push(`/my-khata/sale/${tx.id}`)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                  <span className={`badge ${tx.type === "UDHAR" ? "badge-udhar" : "badge-jama"}`}>
                    {tx.type === "UDHAR" ? "उधार" : "जमा"}
                  </span>
                  <span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span>
                  {tx.isEdited && (
                    <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#d97706", fontSize: "0.7rem" }}>
                      ⚠️ Modified
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {new Date(tx.transactionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {tx.description && ` • ${tx.description}`}
                </div>
                
                {tx.discountAmount && tx.discountAmount > 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "var(--success)", marginTop: "0.15rem" }}>
                    🎉 Discount applied: ₹{tx.discountAmount}
                  </div>
                ) : null}

                {tx.isSale && (
                  <div style={{ fontSize: "0.75rem", color: "var(--accent-blue)", marginTop: "0.2rem" }}>
                    Tap to view invoice →
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
