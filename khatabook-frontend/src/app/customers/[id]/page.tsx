"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  label: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  discountAmount: number;
  status: string;
  dueDate: string | null;
  description: string | null;
  productName: string | null;
  runningBalance: number;
  interest: {
    interestAmount: number;
    totalWithInterest: number;
    monthsOverdue: number;
    rateApplied: number;
  } | null;
}

interface LedgerData {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    totalBalance: number;
    shopName: string;
  };
  ledger: LedgerEntry[];
  summary: {
    totalBalance: number;
    balanceStatus: string;
  };
}

export default function CustomerLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser || JSON.parse(storedUser).role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }

    apiFetch(`/transactions/customer/${params.id}/ledger`)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <div className="page-container"><p style={{ color: "var(--text-secondary)" }}>Loading khata...</p></div>;
  if (!data) return <div className="page-container"><p>Customer not found</p></div>;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📒 {data.customer.name} का खाता</h1>
          <p className="page-subtitle">
            {data.customer.phone || data.customer.email} • {data.customer.shopName}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Current Balance</div>
          <div style={{ fontSize: "1.5rem", fontFamily: "Outfit", fontWeight: 700, color: data.customer.totalBalance > 0 ? "#ef4444" : "#22c55e" }}>
            ₹{Math.abs(data.customer.totalBalance).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.8rem" }}>{data.summary.balanceStatus}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: "hidden" }}>
        {data.ledger.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📒</div>
            <p>No transactions yet</p>
          </div>
        ) : (
          data.ledger.map((entry) => (
            <div key={entry.id} className="ledger-entry">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span className={`badge ${entry.type === "UDHAR" ? "badge-udhar" : "badge-jama"}`}>
                    {entry.type === "UDHAR" ? "उधार" : "जमा"}
                  </span>
                  <span className={`badge badge-${entry.status.toLowerCase()}`}>{entry.status}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {entry.description && ` • ${entry.description}`}
                  {entry.productName && ` • ${entry.productName}`}
                </div>
                {entry.type === "UDHAR" && entry.discountAmount > 0 && (
                  <div style={{ fontSize: "0.8rem", color: "#22c55e", marginTop: "0.15rem" }}>
                    Discount: ₹{entry.discountAmount}
                  </div>
                )}
                {entry.interest && (
                  <div style={{ fontSize: "0.8rem", color: "#f97316", marginTop: "0.15rem" }}>
                    ⚠️ Interest: ₹{entry.interest.interestAmount} ({entry.interest.monthsOverdue} months @ {entry.interest.rateApplied}%)
                  </div>
                )}
                {entry.dueDate && entry.status === "DUE" && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    Due: {new Date(entry.dueDate).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={`ledger-amount ${entry.type === "UDHAR" ? "udhar" : "jama"}`} style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  {entry.type === "UDHAR" ? "+" : "-"}₹{entry.totalAmount.toLocaleString("en-IN")}
                </div>
                <div className="ledger-balance">
                  Bal: ₹{entry.runningBalance.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
