"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/auth/customer-login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/customers/me/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });

      // Update user in localStorage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.isTemporaryPassword = false;
        localStorage.setItem("user", JSON.stringify(user));
      }

      alert("Password changed successfully! ✅");
      router.push("/my-khata");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
      <div className="glass-panel animate-fade-in" style={{ padding: "2rem", width: "100%", maxWidth: "420px" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", textAlign: "center" }}>
          🔒 Change Password
        </h1>
        <p style={{ color: "var(--text-secondary)", textAlign: "center", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          You must set a new password before continuing
        </p>

        {error && <p className="form-error" style={{ marginBottom: "1rem", textAlign: "center" }}>❌ {error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current (Temporary) Password *</label>
            <input className="form-input" type="password" placeholder="Your temporary password" value={form.oldPassword} onChange={(e) => setForm({ ...form, oldPassword: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>New Password *</label>
            <input className="form-input" type="password" placeholder="Min 6 characters" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Confirm New Password *</label>
            <input className="form-input" type="password" placeholder="Re-enter new password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "0.5rem", fontSize: "1.05rem", padding: "0.85rem" }} disabled={loading}>
            {loading ? "Changing..." : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
