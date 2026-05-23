"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function NewPurchasePage() {
  const router = useRouter();
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<any[]>([{ productId: "", qty: 1, purchasePrice: "", sellingPrice: "" }]);
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
      const [supRes, prodRes] = await Promise.all([
        apiFetch("/supplier"),
        apiFetch("/products")
      ]);
      setSuppliers(supRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load data");
    }
  };

  useEffect(() => {
    let total = 0;
    items.forEach(item => {
      total += (Number(item.qty) || 0) * (Number(item.purchasePrice) || 0);
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
        newItems[index].purchasePrice = prod.defaultPurchasePrice || 0;
        newItems[index].sellingPrice = prod.defaultSellingPrice || 0;
      }
    }

    setItems(newItems);
  };

  const addItem = () => setItems([...items, { productId: "", qty: 1, purchasePrice: "", sellingPrice: "" }]);
  
  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert("Select a supplier");
    if (items.some(i => !i.productId || i.qty <= 0)) return alert("Invalid items");

    setLoading(true);
    try {
      await apiFetch("/purchase", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          invoiceNumber,
          items: items.map(i => ({
            productId: i.productId,
            qty: Number(i.qty),
            purchasePrice: Number(i.purchasePrice),
            sellingPrice: Number(i.sellingPrice)
          })),
          subtotal: Number(subtotal),
          paidAmount: Number(paidAmount) || 0,
          discount: discountAmount,
          paymentMode,
          notes
        }),
      });
      router.push("/purchases");
    } catch (err: any) {
      alert(err.message || "Failed to create purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">📦 New Purchase Invoice</h1>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Supplier <span style={{color: "var(--danger)"}}>*</span></label>
            <select className="form-input" value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} - Payable: ₹{s.totalPayable}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Invoice Number</label>
            <input type="text" className="form-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-2034" />
          </div>
        </div>

        <div style={{ marginTop: "2rem", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>Products Incoming</h3>
        </div>

        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem", backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "12px" }}>
            <div style={{ flex: 2 }}>
              <label className="form-label">Product</label>
              <select className="form-input" value={item.productId} onChange={e => handleItemChange(idx, "productId", e.target.value)} required>
                <option value="">Select Product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQty})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Qty</label>
              <input type="number" className="form-input" min="1" step="any" value={item.qty} onChange={e => handleItemChange(idx, "qty", e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Purch. Price</label>
              <input type="number" className="form-input" min="0" step="any" value={item.purchasePrice} onChange={e => handleItemChange(idx, "purchasePrice", e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Total</label>
              <div style={{ padding: "0.75rem", fontWeight: 600, backgroundColor: "var(--bg-primary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                ₹{(item.qty * item.purchasePrice) || 0}
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
              <label className="form-label">Amount Paid Now (₹)</label>
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
                <option value="PENDING">Keep as Payable (Udhar)</option>
                <option value="DISCOUNT">Received as Discount (Chhoot)</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", color: dueAmount > 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
            <span>{pendingAction === "DISCOUNT" ? "Final Amount:" : "Pending Amount (To Pay):"}</span>
            <span>{pendingAction === "DISCOUNT" ? "Fully Settled" : `₹${dueAmount.toLocaleString("en-IN")}`}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1rem" }}>
          <label className="form-label">Notes / Remarks</label>
          <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note" />
        </div>

        <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
          {loading ? "Recording Purchase..." : "Record Purchase Invoice"}
        </button>
      </form>
    </div>
  );
}
