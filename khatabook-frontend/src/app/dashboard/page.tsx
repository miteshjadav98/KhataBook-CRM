"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function CopyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface Metrics {
  totalDue: number;
  totalCollected: number;
  overdueAmount: number;
  monthlyRevenue: number;
  totalCustomers: number;
  customersWithDue: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.role !== "ADMIN") {
      router.push("/");
      return;
    }
    setUser(parsed);

    apiFetch("/transactions/dashboard")
      .then((res) => setMetrics(res.data))
      .catch((err) => console.error("Dashboard error:", err))
      .finally(() => setLoading(false));
  }, [router]);

  const copyShopCode = useCallback(async () => {
    if (!user?.shopCode) return;
    try {
      await navigator.clipboard.writeText(user.shopCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = user.shopCode;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [user?.shopCode]);

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: "var(--text-secondary)" }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Dashboard <span className="text-gradient">📊</span>
          </h1>
          {user && (
            <p className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {user.shopName} • Shop Code:{" "}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.2rem 0.6rem",
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  fontSize: "0.95rem",
                }}
              >
                {user.shopCode}
                <button
                  onClick={copyShopCode}
                  title={copied ? "Copied!" : "Copy Shop Code"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: copied ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.06)",
                    border: copied ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "0.25rem",
                    cursor: "pointer",
                    color: copied ? "#22c55e" : "var(--text-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                </button>
              </span>
              {copied && (
                <span style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 500, animation: "fadeIn 0.3s ease" }}>
                  Copied!
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card due glass-panel">
            <div className="metric-label">बकाया (Total Due)</div>
            <div className="metric-value">₹{metrics.totalDue.toLocaleString("en-IN")}</div>
          </div>
          <div className="metric-card collected glass-panel">
            <div className="metric-label">जमा (Total Collected)</div>
            <div className="metric-value">₹{metrics.totalCollected.toLocaleString("en-IN")}</div>
          </div>
          <div className="metric-card overdue glass-panel">
            <div className="metric-label">⚠️ Overdue</div>
            <div className="metric-value">₹{metrics.overdueAmount.toLocaleString("en-IN")}</div>
          </div>
          <div className="metric-card revenue glass-panel">
            <div className="metric-label">Monthly Revenue</div>
            <div className="metric-value">₹{metrics.monthlyRevenue.toLocaleString("en-IN")}</div>
          </div>
        </div>
      )}

      <div className="metrics-grid" style={{ marginBottom: "2rem" }}>
        <Link href="/customers" className="glass-panel" style={{ padding: "1.5rem", display: "block", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</div>
          <div style={{ fontWeight: 600 }}>Customers</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {metrics?.totalCustomers || 0} total • {metrics?.customersWithDue || 0} with due
          </div>
        </Link>
        <Link href="/products" className="glass-panel" style={{ padding: "1.5rem", display: "block", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
          <div style={{ fontWeight: 600 }}>Products</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Manage your inventory
          </div>
        </Link>
        <Link href="/transactions/new" className="glass-panel" style={{ padding: "1.5rem", display: "block", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
          <div style={{ fontWeight: 600 }}>New Transaction</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Record Udhar or Jama
          </div>
        </Link>
        <Link href="/transactions" className="glass-panel" style={{ padding: "1.5rem", display: "block", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
          <div style={{ fontWeight: 600 }}>All Transactions</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            View & filter history
          </div>
        </Link>
      </div>
    </div>
  );
}
