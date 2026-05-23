"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function NewSalesPage() {
  const router = useRouter();
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<any[]>([{ productId: "", qty: 1, sellingPrice: "" }]);
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [pendingAction, setPendingAction] = useState<"PENDING" | "DISCOUNT">("PENDING");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [notes, setNotes] = useState("");
  
  const [subtotal, setSubtotal] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        apiFetch("/customers"),
        apiFetch("/products")
      ]);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load data");
    }
  };

  useEffect(() => {
    let total = 0;
    items.forEach(item => {
      total += (Number(item.qty) || 0) * (Number(item.sellingPrice) || 0);
    });
    setSubtotal(total);
    
    const paid = Number(paidAmount) || 0;
    const remaining = Math.max(0, total - paid);
    
    if (pendingAction === "DISCOUNT") {
      setDiscountAmount(remaining);
      setDueAmount(0);
    } else {
      setDiscountAmount(0);
      setDueAmount(remaining);
    }
  }, [items, paidAmount, pendingAction]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      if (prod) {
        newItems[index].sellingPrice = prod.defaultSellingPrice;
      }
    }

    setItems(newItems);
  };

  const addItem = () => setItems([...items, { productId: "", qty: 1, sellingPrice: "" }]);
  
  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert("Select a customer");
    if (items.some(i => !i.productId || i.qty <= 0)) return alert("Invalid items");

    setLoading(true);
    try {
      await apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          invoiceNumber,
          items: items.map(i => ({
            productId: i.productId,
            qty: Number(i.qty),
            sellingPrice: Number(i.sellingPrice)
          })),
          paidAmount: Number(paidAmount) || 0,
          discount: discountAmount,
          paymentMode,
          notes
        }),
      });
      router.push("/sales");
    } catch (err: any) {
      alert(err.message || "Failed to create sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">🛒 New Sales Invoice</h1>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label className="form-label">Customer <span style={{color: "var(--danger)"}}>*</span></label>
          <select className="form-input" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
            <option value="">Select Customer...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone || c.email}) - Due: ₹{c.totalReceivable}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label className="form-label">Invoice Number</label>
          <input type="text" className="form-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-1001 (Optional)" />
        </div>

        <div style={{ marginTop: "2rem", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Products</h3>
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem", backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "12px" }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">Product</label>
              <select className="form-input" value={item.productId} onChange={e => handleItemChange(idx, "productId", e.target.value)} required>
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQty} {p.unit})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Qty</label>
              <input type="number" className="form-input" min="1" step="any" value={item.qty} onChange={e => handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Price (₹)</label>
              <input type="number" className="form-input" min="0" step="any" value={item.sellingPrice} onChange={e => handleItemChange(idx, "sellingPrice", e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Total</label>
              <div style={{ padding: "0.75rem", fontWeight: 600, backgroundColor: "var(--bg-primary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                ₹{(item.qty * item.sellingPrice) || 0}
              </div>
            </div>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(idx)} style={{ padding: "0.75rem", color: "var(--danger)", backgroundColor: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>
                🗑️
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addItem} className="btn-secondary" style={{ width: "100%", borderStyle: "dashed" }}>
          + Add Another Product
        </button>

        <div style={{ marginTop: "2rem", padding: "1.5rem", backgroundColor: "var(--bg-secondary)", borderRadius: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "1.1rem" }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Amount Paid (₹)</label>
              <input type="number" className="form-input" min="0" max={subtotal} step="any" value={paidAmount} onChange={e => setPaidAmount(e.target.value === "" ? "" : parseFloat(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Payment Mode</label>
              <select className="form-input" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online/UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>
          
          {(Number(paidAmount) || 0) < subtotal && (
            <div style={{ marginBottom: "1rem" }}>
              <label className="form-label">What to do with the remaining ₹{subtotal - (Number(paidAmount) || 0)}?</label>
              <select className="form-input" value={pendingAction} onChange={e => setPendingAction(e.target.value as any)}>
                <option value="PENDING">Keep as Pending (Udhar)</option>
                <option value="DISCOUNT">Give as Discount (Chhoot)</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: dueAmount > 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
            <span>{pendingAction === "DISCOUNT" ? "Final Amount:" : "Pending Amount (Due):"}</span>
            <span>{pendingAction === "DISCOUNT" ? "Fully Settled" : `₹${dueAmount.toLocaleString("en-IN")}`}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label className="form-label">Notes / Remarks</label>
          <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note for this sale" />
        </div>

        <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
          {loading ? "Creating Invoice..." : "Submit Sales Invoice"}
        </button>
      </form>
    </div>
  );
}
