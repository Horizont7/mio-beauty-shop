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

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:        { label: "Новый",       color: "#22c55e" },
  processing: { label: "В обработке", color: "#f59e0b" },
  shipped:    { label: "Отгружен",    color: "#3b82f6" },
  archived:   { label: "Архив",       color: "#111827" },
  cancelled:  { label: "Отменен",     color: "#ef4444" },
};

const ORDER_STATUS_KEYS = ["new", "processing", "shipped", "archived", "cancelled"] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function statusOptionsFor(_order: OrderRow) {
  return [...ORDER_STATUS_KEYS];
}

const paymentStatusOptions = ["pending", "paid", "cancelled"];

const paymentStatusLabel: Record<string, string> = {
  pending:   "Не оплачено",
  paid:      "Оплачено",
  cancelled: "Отменено",
};

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


function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  className,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      checked={checked}
      onChange={onChange}
      className={className}
    />
  );
}

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = ORDER_STATUS_CONFIG[value] ?? { label: value, color: "#6b7280" };

  return (
    <div className="relative">
      {open && (
        <button
          type="button"
          aria-label="Закрыть"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white transition hover:opacity-90 active:scale-95"
        style={{ backgroundColor: cfg.color }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
        {cfg.label}
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true" className="opacity-60">
          <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
          {ORDER_STATUS_KEYS.map((key) => {
            const optCfg = ORDER_STATUS_CONFIG[key];
            const selected = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold transition hover:bg-gray-50"
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: optCfg.color }}
                />
                <span style={{ color: optCfg.color }}>{optCfg.label}</span>
                {selected && (
                  <svg className="ml-auto" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4.5 7.5L8.5 2.5" stroke={optCfg.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
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

  function toggleSelectAll() {
    const allVisible = filteredOrders.every((o) => selectedIds.has(String(o.id)));
    if (allVisible && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => String(o.id))));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkStatusChange(nextStatus: string) {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    setBulkStatusOpen(false);

    const selected = orders.filter((o) => selectedIds.has(String(o.id)));
    const updates = selected.map((order) => {
      const column = order.schema === "modern" ? "order_status" : "status";
      return supabase.from("orders").update({ [column]: nextStatus }).eq("id", order.id);
    });

    const results = await Promise.all(updates);
    const failed = results.filter((r) => r.error);

    if (failed.length > 0) {
      showToast("error", `Ошибка: ${failed[0].error?.message ?? "неизвестно"}`);
    } else {
      showToast("success", `Статус обновлён для ${selected.length} заказов`);
      setSelectedIds(new Set());
    }

    await loadOrders();
    setBulkLoading(false);
  }

  async function handleBulkExcel() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = [...selectedIds];
      const response = await fetch("/api/admin/ttn/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids, managerName: "Менеджер" }),
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
      a.download = "MIO_BEAUTY_TTN_SELECTED_ORDERS.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("success", `Накладные загружены (${ids.length} шт.)`);
    } catch {
      showToast("error", "Не удалось сгенерировать Excel");
    } finally {
      setBulkLoading(false);
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

  const someSelected = selectedIds.size > 0;
  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedIds.has(String(o.id)));

  const summary = useMemo(() => {
    let totalAmount = 0;
    const byStatus: Record<string, { count: number; amount: number }> = {};
    const pm = {
      cash:     { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      terminal: { count: 0, amount: 0 },
      none:     { count: 0, amount: 0 },
    };
    let paidCount = 0, paidAmount = 0, unpaidCount = 0, unpaidAmount = 0;

    for (const o of orders) {
      totalAmount += o.total;

      const s = o.orderStatus || "new";
      if (!byStatus[s]) byStatus[s] = { count: 0, amount: 0 };
      byStatus[s].count++;
      byStatus[s].amount += o.total;

      const method = (o.paymentMethod || "").toLowerCase();
      if (method.includes("cash") || method.includes("нал") || method === "cod") {
        pm.cash.count++;     pm.cash.amount += o.total;
      } else if (method.includes("transfer") || method.includes("перечис") || method.includes("bank")) {
        pm.transfer.count++; pm.transfer.amount += o.total;
      } else if (method.includes("terminal") || method.includes("термин") || method.includes("card") || method.includes("карт")) {
        pm.terminal.count++; pm.terminal.amount += o.total;
      } else {
        pm.none.count++;     pm.none.amount += o.total;
      }

      if (o.paymentStatus === "paid") {
        paidCount++; paidAmount += o.total;
      } else {
        unpaidCount++; unpaidAmount += o.total;
      }
    }

    return { totalCount: orders.length, totalAmount, byStatus, pm, paidCount, paidAmount, unpaidCount, unpaidAmount };
  }, [orders]);

  return (
    <div className="space-y-3">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* ── Compact ERP Control Panel ── */}
      <section className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
          <h1 className="text-sm font-bold text-gray-950">Заказы</h1>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-[#EEA391] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#e59381] active:scale-95"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
              <path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Создать
          </button>
          <div className="flex-1" />
          {/* Search */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск..."
              className="h-8 w-44 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:border-[#EEA391] focus:bg-white focus:ring-2 focus:ring-[#EEA391]/20"
            />
          </div>
          {/* Filter */}
          <button
            type="button"
            title="Фильтр"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
          {/* Record count */}
          <span className="whitespace-nowrap text-[11px] tabular-nums text-gray-400">
            {filteredOrders.length} / {orders.length}
          </span>
          {/* Refresh */}
          <button
            type="button"
            title="Обновить"
            onClick={() => void loadOrders()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M11.5 2A6 6 0 1 1 6 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M8 1h3.5v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Menu */}
          <button
            type="button"
            title="Параметры"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="2.5" r="1" fill="currentColor"/>
              <circle cx="6.5" cy="6.5" r="1" fill="currentColor"/>
              <circle cx="6.5" cy="10.5" r="1" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Summary card strip */}
        <div className="flex overflow-x-auto divide-x divide-gray-100">
          {[
            { label: "Все заказы",   count: summary.totalCount,                          amount: summary.totalAmount,                        dot: "bg-[#EEA391]", accent: true  },
            { label: "Новый",        count: summary.byStatus["new"]?.count ?? 0,         amount: summary.byStatus["new"]?.amount ?? 0,       dot: "bg-green-500", accent: false },
            { label: "В обработке",  count: summary.byStatus["processing"]?.count ?? 0,  amount: summary.byStatus["processing"]?.amount ?? 0, dot: "bg-orange-500", accent: false },
            { label: "Отгружен",     count: summary.byStatus["shipped"]?.count ?? 0,     amount: summary.byStatus["shipped"]?.amount ?? 0,   dot: "bg-blue-900",  accent: false },
            { label: "Архив",        count: summary.byStatus["archived"]?.count ?? 0,    amount: summary.byStatus["archived"]?.amount ?? 0,  dot: "bg-gray-900",  accent: false },
            { label: "Отменен",      count: summary.byStatus["cancelled"]?.count ?? 0,   amount: summary.byStatus["cancelled"]?.amount ?? 0, dot: "bg-red-500",   accent: false },
            { label: "Оплачено",     count: summary.paidCount,                           amount: summary.paidAmount,                         dot: "bg-green-500", accent: false },
            { label: "Не оплачено",  count: summary.unpaidCount,                         amount: summary.unpaidAmount,                       dot: "bg-red-500",   accent: false },
          ].map((card) => (
            <div
              key={card.label}
              className={`flex min-w-[104px] flex-shrink-0 flex-col px-3 py-2.5 transition-colors hover:bg-[#fff8f6] ${
                card.accent ? "border-b-2 border-b-[#EEA391]" : ""
              }`}
            >
              <div className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${card.dot}`} />
                <span className="truncate text-[10px] font-semibold leading-none text-gray-500">{card.label}</span>
              </div>
              {loading ? (
                <div className="mt-2 space-y-1">
                  <div className="h-3.5 w-7 animate-pulse rounded bg-gray-100" />
                  <div className="h-2 w-14 animate-pulse rounded bg-gray-100" />
                </div>
              ) : (
                <>
                  <span className={`mt-2 text-sm font-bold leading-none tabular-nums ${card.accent ? "text-[#B96C5C]" : "text-gray-900"}`}>
                    {card.count}
                  </span>
                  <span className="mt-0.5 truncate text-[9px] leading-none text-gray-400">
                    {formatPrice(card.amount)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="font-bold">Supabase: </span>{error}
        </div>
      )}

      <section className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-950">Список заказов</h2>
          <span className="text-xs text-gray-400 tabular-nums">{schema}</span>
        </div>

        {/* ── Bulk action bar (visible when ≥1 order selected) ── */}
        {someSelected && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-[#fff8f6] px-4 py-2">
            <span className="text-[11px] font-semibold text-[#B96C5C]">
              Выбрано: {selectedIds.size}
            </span>
            <div className="flex-1" />

            {/* Изменить статус */}
            <div className="relative">
              {bulkStatusOpen && (
                <button
                  type="button"
                  aria-label="Закрыть"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setBulkStatusOpen(false)}
                />
              )}
              <button
                type="button"
                disabled={bulkLoading}
                onClick={() => setBulkStatusOpen((o) => !o)}
                className="relative z-20 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C] disabled:opacity-50"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M3.5 5h3M5 3.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Изменить статус
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true" className="opacity-50">
                  <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {bulkStatusOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 min-w-[152px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                  {ORDER_STATUS_KEYS.map((key) => {
                    const cfg = ORDER_STATUS_CONFIG[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => void handleBulkStatusChange(key)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold transition hover:bg-gray-50"
                      >
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Накладные */}
            <button
              type="button"
              disabled={bulkLoading}
              onClick={() => void handleBulkExcel()}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                <rect x="1.5" y="1" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3.5 5.5h4M3.5 7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M7 1.5V4l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {bulkLoading ? "Загрузка…" : "Накладные"}
            </button>

            {/* Снять выбор */}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-500"
            >
              Снять выбор
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                <th className="w-10 px-4 py-4 text-center">
                  <IndeterminateCheckbox
                    checked={allVisibleSelected}
                    indeterminate={someSelected && !allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#EEA391]"
                  />
                </th>
                <th className="px-5 py-4 text-left">Заказ</th>
                <th className="px-5 py-4 text-left">Клиент</th>
                <th className="px-5 py-4 text-left">Телефон</th>
                <th className="px-5 py-4 text-left">Адрес доставки</th>
                <th className="px-5 py-4 text-left">Сумма</th>
                <th className="px-5 py-4 text-left">Оплата</th>
                <th className="px-5 py-4 text-left">Статус</th>
                <th className="px-5 py-4 text-left">Создан</th>
                <th className="px-5 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={10} className="px-5 py-5">
                      <div className="h-12 rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition hover:bg-[#fffaf8] ${selectedIds.has(String(order.id)) ? "bg-[#fff3f0]" : ""}`}
                  >
                    <td className="w-10 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(String(order.id))}
                        onChange={() => toggleSelectOne(String(order.id))}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#EEA391]"
                      />
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-950">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {order.customerName || "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{order.phone || "—"}</td>
                    <td className="px-5 py-4 text-gray-700">{order.address || "—"}</td>
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
                              {paymentStatusLabel[status] ?? status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        paymentStatusLabel[order.paymentStatus] ?? order.paymentStatus
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusDropdown
                        value={order.orderStatus}
                        onChange={(next) => void updateStatus(order, next)}
                      />
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void openOrder(order)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                        >
                          Просмотр
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
                  <td colSpan={10} className="px-5 py-16 text-center">
                    <p className="text-lg font-bold text-gray-950">Заказы не найдены</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Новые заказы появятся здесь.
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
