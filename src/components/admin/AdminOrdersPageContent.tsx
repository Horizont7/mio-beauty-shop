"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { printTtnDocument, type TtnItemData } from "@/lib/ttn-print";

type OrderSchema = "modern" | "legacy";

type OrderRow = {
  id: number | string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  comment: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  createdAt: string;
  schema: OrderSchema;
};

type OrderItemRow = {
  id: number | string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type ToastMessage = {
  type: "success" | "error";
  text: string;
};

const modernOrderSelect =
  "id,order_number,customer_name,customer_phone,customer_city,customer_address,customer_comment,payment_method,payment_status,order_status,subtotal,delivery_price,total,created_at";
const legacyOrderSelect =
  "id,customer_name,phone,address,total_price,status,payment_method,delivery_method,created_at";
const modernItemSelect =
  "id,order_id,product_name,product_sku,quantity,unit_price,total_price,created_at";
const skuUnitPriceItemSelect =
  "id,order_id,product_name,sku,quantity,unit_price,total_price,created_at";
const legacyItemSelect =
  "id,order_id,product_name,sku,quantity,price,total_price,created_at";

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatPrice(value: number) {
  return `${value.toLocaleString("ru-RU")} сум`;
}

function statusOptionsFor(order: OrderRow) {
  return order.schema === "modern"
    ? ["new", "processing", "shipped", "delivered", "cancelled"]
    : ["new", "accepted", "packing", "delivering", "completed", "cancelled"];
}

const paymentStatusOptions = ["pending", "paid", "cancelled"];

function normalizeModernOrder(row: Record<string, unknown>): OrderRow {
  return {
    id: textValue(row.id) || Number(row.id),
    orderNumber: textValue(row.order_number) || `MIO-${row.id}`,
    customerName: textValue(row.customer_name),
    phone: textValue(row.customer_phone),
    address: textValue(row.customer_address),
    comment: textValue(row.customer_comment),
    paymentMethod: textValue(row.payment_method),
    paymentStatus: textValue(row.payment_status) || "pending",
    orderStatus: textValue(row.order_status) || "new",
    subtotal: numberValue(row.subtotal),
    deliveryPrice: numberValue(row.delivery_price),
    total: numberValue(row.total),
    createdAt: textValue(row.created_at),
    schema: "modern",
  };
}

function normalizeLegacyOrder(row: Record<string, unknown>): OrderRow {
  return {
    id: textValue(row.id) || Number(row.id),
    orderNumber: `MIO-${row.id}`,
    customerName: textValue(row.customer_name),
    phone: textValue(row.phone),
    address: textValue(row.address),
    comment: "",
    paymentMethod: textValue(row.payment_method),
    paymentStatus: "pending",
    orderStatus: textValue(row.status) || "new",
    subtotal: numberValue(row.total_price),
    deliveryPrice: 0,
    total: numberValue(row.total_price),
    createdAt: textValue(row.created_at),
    schema: "legacy",
  };
}

function normalizeModernItem(row: Record<string, unknown>): OrderItemRow {
  return {
    id: textValue(row.id) || Number(row.id),
    productName: textValue(row.product_name),
    sku: textValue(row.product_sku),
    quantity: numberValue(row.quantity),
    unitPrice: numberValue(row.unit_price),
    totalPrice: numberValue(row.total_price),
  };
}

function normalizeLegacyItem(row: Record<string, unknown>): OrderItemRow {
  return {
    id: textValue(row.id) || Number(row.id),
    productName: textValue(row.product_name),
    sku: textValue(row.sku),
    quantity: numberValue(row.quantity),
    unitPrice: numberValue(row.price ?? row.unit_price),
    totalPrice: numberValue(row.total_price),
  };
}

export default function AdminOrdersPageContent() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [schema, setSchema] = useState<OrderSchema>("modern");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [ttnLoading, setTtnLoading] = useState<Record<string, "excel" | "pdf" | null>>({});
  // Cache items per order to avoid refetching for TTN
  const itemsCache = useRef<Record<string, OrderItemRow[]>>({});

  const showToast = useCallback((type: ToastMessage["type"], text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    const modernResult = await supabase
      .from("orders")
      .select(modernOrderSelect)
      .order("created_at", { ascending: false });

    if (!modernResult.error) {
      setSchema("modern");
      setOrders(((modernResult.data || []) as Record<string, unknown>[]).map(normalizeModernOrder));
      setLoading(false);
      return;
    }

    const legacyResult = await supabase
      .from("orders")
      .select(legacyOrderSelect)
      .order("created_at", { ascending: false });

    if (!legacyResult.error) {
      setSchema("legacy");
      setOrders(((legacyResult.data || []) as Record<string, unknown>[]).map(normalizeLegacyOrder));
      setLoading(false);
      return;
    }

    setOrders([]);
    setError(legacyResult.error.message || modernResult.error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOrders]);

  async function openOrder(order: OrderRow) {
    setSelectedOrder(order);
    setItems([]);
    setItemsLoading(true);

    const fetched = await fetchItemsForOrder(order);
    setItems(fetched);
    setItemsLoading(false);
  }

  async function updateStatus(order: OrderRow, nextStatus: string) {
    const column = order.schema === "modern" ? "order_status" : "status";
    const { error: updateError } = await supabase
      .from("orders")
      .update({ [column]: nextStatus })
      .eq("id", order.id);

    if (updateError) {
      showToast("error", updateError.message);
      return;
    }

    showToast("success", "Order status updated.");
    await loadOrders();
    setSelectedOrder((current) =>
      current && current.id === order.id
        ? { ...current, orderStatus: nextStatus }
        : current
    );
  }

  async function updatePaymentStatus(order: OrderRow, nextStatus: string) {
    if (order.schema !== "modern") return;

    const { error: updateError } = await supabase
      .from("orders")
      .update({ payment_status: nextStatus })
      .eq("id", order.id);

    if (updateError) {
      showToast("error", updateError.message);
      return;
    }

    showToast("success", "Payment status updated.");
    await loadOrders();
    setSelectedOrder((current) =>
      current && current.id === order.id
        ? { ...current, paymentStatus: nextStatus }
        : current
    );
  }

  async function fetchItemsForOrder(order: OrderRow): Promise<OrderItemRow[]> {
    const key = String(order.id);
    if (itemsCache.current[key]) return itemsCache.current[key];

    const modernResult = await supabase
      .from("order_items")
      .select(modernItemSelect)
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    if (!modernResult.error && modernResult.data?.length) {
      const normalized = (modernResult.data as Record<string, unknown>[]).map(normalizeModernItem);
      itemsCache.current[key] = normalized;
      return normalized;
    }

    const skuResult = await supabase
      .from("order_items")
      .select(skuUnitPriceItemSelect)
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    if (!skuResult.error) {
      const normalized = (skuResult.data as Record<string, unknown>[]).map(normalizeLegacyItem);
      itemsCache.current[key] = normalized;
      return normalized;
    }

    const legacyResult = await supabase
      .from("order_items")
      .select(legacyItemSelect)
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    const normalized = legacyResult.error
      ? []
      : (legacyResult.data as Record<string, unknown>[]).map(normalizeLegacyItem);
    itemsCache.current[key] = normalized;
    return normalized;
  }

  async function handleExcelTtn(order: OrderRow) {
    const key = String(order.id);
    setTtnLoading((prev) => ({ ...prev, [key]: "excel" }));
    try {
      const response = await fetch("/api/admin/ttn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, managerName: "Менеджер" }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        showToast("error", err.error ?? "Ошибка генерации Excel");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TTN-${order.orderNumber}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("success", "Excel TTN загружен");
    } catch {
      showToast("error", "Не удалось сгенерировать Excel");
    } finally {
      setTtnLoading((prev) => ({ ...prev, [key]: null }));
    }
  }

  async function handlePdfTtn(order: OrderRow) {
    const key = String(order.id);
    setTtnLoading((prev) => ({ ...prev, [key]: "pdf" }));
    try {
      const orderItems = await fetchItemsForOrder(order);
      const ttnItems: TtnItemData[] = orderItems.map((item, index) => ({
        num: index + 1,
        sku: item.sku || "—",
        name: item.productName || "Товар",
        qty: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
      }));
      printTtnDocument(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          address: order.address,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          subtotal: order.subtotal,
          deliveryPrice: order.deliveryPrice,
          total: order.total,
        },
        ttnItems,
        "Менеджер"
      );
    } catch {
      showToast("error", "Не удалось сгенерировать PDF");
    } finally {
      setTtnLoading((prev) => ({ ...prev, [key]: null }));
    }
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) =>
      [order.orderNumber, order.customerName, order.phone]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [orders, search]);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      <section className="rounded-[28px] border border-white bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
          MIO Beauty admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Orders</h1>
        <p className="mt-2 text-sm text-gray-500">
          View checkout records, order items and fulfillment status.
        </p>
      </section>

      <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by order, customer or phone..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
        />
      </section>

      {error && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">Supabase setup needed</p>
          <p className="mt-2">{error}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-950">Orders list</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredOrders.length} of {orders.length} ({schema})
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="px-5 py-4 text-left">Order</th>
                <th className="px-5 py-4 text-left">Customer</th>
                <th className="px-5 py-4 text-left">Phone</th>
                <th className="px-5 py-4 text-left">Total</th>
                <th className="px-5 py-4 text-left">Payment</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-left">Created</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={8} className="px-5 py-5">
                      <div className="h-12 rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-[#fffaf8]">
                    <td className="px-5 py-4 font-semibold text-gray-950">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {order.customerName || "Customer"}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{order.phone || "-"}</td>
                    <td className="px-5 py-4 font-semibold text-gray-950">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {order.schema === "modern" ? (
                        <select
                          value={order.paymentStatus}
                          onChange={(event) =>
                            void updatePaymentStatus(order, event.target.value)
                          }
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-[#EEA391]"
                        >
                          {paymentStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        order.paymentStatus
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={order.orderStatus}
                        onChange={(event) => void updateStatus(order, event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-[#EEA391]"
                      >
                        {statusOptionsFor(order).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString("ru-RU")
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void openOrder(order)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={ttnLoading[String(order.id)] === "excel"}
                          onClick={() => void handleExcelTtn(order)}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {ttnLoading[String(order.id)] === "excel" ? "…" : "Excel TTN"}
                        </button>
                        <button
                          type="button"
                          disabled={ttnLoading[String(order.id)] === "pdf"}
                          onClick={() => void handlePdfTtn(order)}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {ttnLoading[String(order.id)] === "pdf" ? "…" : "PDF TTN"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <p className="text-lg font-bold text-gray-950">No orders found</p>
                    <p className="mt-2 text-sm text-gray-500">
                      New checkout orders will appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close order details"
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-gray-950/35 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B96C5C]">
                  Order details
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">
                  {selectedOrder.orderNumber}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={ttnLoading[String(selectedOrder.id)] === "excel"}
                  onClick={() => void handleExcelTtn(selectedOrder)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
                >
                  {ttnLoading[String(selectedOrder.id)] === "excel" ? "…" : "Excel TTN"}
                </button>
                <button
                  type="button"
                  disabled={ttnLoading[String(selectedOrder.id)] === "pdf"}
                  onClick={() => void handlePdfTtn(selectedOrder)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                >
                  {ttnLoading[String(selectedOrder.id)] === "pdf" ? "…" : "PDF TTN"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <section className="grid gap-3 rounded-3xl bg-[#fff8f6] p-5 text-sm text-gray-700 sm:grid-cols-2">
                <p><strong>Customer:</strong> {selectedOrder.customerName || "-"}</p>
                <p><strong>Phone:</strong> {selectedOrder.phone || "-"}</p>
                <p><strong>Address:</strong> {selectedOrder.address || "-"}</p>
                <p><strong>Payment:</strong> {selectedOrder.paymentMethod || "cash_on_delivery"}</p>
                {selectedOrder.comment && (
                  <p className="sm:col-span-2">
                    <strong>Comment:</strong> {selectedOrder.comment}
                  </p>
                )}
              </section>

              <section className="overflow-hidden rounded-3xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">SKU</th>
                      <th className="px-4 py-3 text-left">Qty</th>
                      <th className="px-4 py-3 text-left">Price</th>
                      <th className="px-4 py-3 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-gray-500">
                          Loading items...
                        </td>
                      </tr>
                    ) : items.length > 0 ? (
                      items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-semibold text-gray-950">
                            {item.productName || "Product"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{item.sku || "-"}</td>
                          <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatPrice(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-950">
                            {formatPrice(item.totalPrice)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-gray-500">
                          No order items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              <section className="rounded-3xl bg-gray-950 p-5 text-white">
                <div className="flex justify-between text-sm text-white/70">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm text-white/70">
                  <span>Delivery</span>
                  <span>{formatPrice(selectedOrder.deliveryPrice)}</span>
                </div>
                <div className="mt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
