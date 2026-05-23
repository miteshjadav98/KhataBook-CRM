"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";



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
      setUser(parsed);
    } catch (e) {
      router.push("/auth/login");
      return;
    }

    apiFetch("/dashboard")
      .then((res) => setMetrics(res.data))
      .catch((err) => {
        console.error("Dashboard error:", err);
        setMetrics({
          totalDue: 0,
          totalCollected: 0,
          overdueAmount: 0,
          monthlyRevenue: 0,
          totalCustomers: 0,
          customersWithDue: 0
        });
      })
      .finally(() => setLoading(false));
  }, [router]);

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
            <p className="page-subtitle">
              {user.shopName}
            </p>
          )}
        </div>
      </div>

      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card due glass-panel">
            <div className="metric-label">To Receive (Receivables)</div>
            <div className="metric-value">₹{metrics.totalDue?.toLocaleString("en-IN") || 0}</div>
          </div>
          <div className="metric-card collected glass-panel">
            <div className="metric-label">To Pay (Payables)</div>
            <div className="metric-value">₹{metrics.totalCollected?.toLocaleString("en-IN") || 0}</div>
          </div>
          <div className="metric-card overdue glass-panel">
            <div className="metric-label">Monthly Sales</div>
            <div className="metric-value">₹{metrics.overdueAmount?.toLocaleString("en-IN") || 0}</div>
          </div>
          <div className="metric-card revenue glass-panel">
            <div className="metric-label">Monthly Purchases</div>
            <div className="metric-value">₹{metrics.monthlyRevenue?.toLocaleString("en-IN") || 0}</div>
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
        <Link href="/sales" className="glass-panel" style={{ padding: "1.5rem", display: "block", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📈</div>
          <div style={{ fontWeight: 600 }}>Sales</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Create Customer Invoices
          </div>
        </Link>
        <Link href="/purchases" className="glass-panel" style={{ padding: "1.5rem", display: "block", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
          <div style={{ fontWeight: 600 }}>Purchases</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Record Supplier Stock
          </div>
        </Link>
      </div>
    </div>
  );
}
