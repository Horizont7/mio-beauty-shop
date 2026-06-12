import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin, adminAuthErrorResponse } from "@/lib/admin/auth";

function tv(v: unknown) {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}
function nv(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function fmt(n: number) {
  return `${n.toLocaleString("ru-RU")} сум`;
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function paymentLabel(method: string) {
  const map: Record<string, string> = {
    cash: "Наличные",
    cash_on_delivery: "Наличные при доставке",
    card: "Банковская карта",
    transfer: "Перевод",
    online: "Онлайн оплата",
  };
  return map[method] ?? method ?? "—";
}

export async function POST(request: NextRequest) {
  let adminInfo: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    adminInfo = await requireAdmin(request);
  } catch (err) {
    return adminAuthErrorResponse(err) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { orderId?: unknown; managerName?: unknown };
  const orderId = body.orderId;
  const managerName = tv(body.managerName) || "Администратор";

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const { supabase } = adminInfo;

  // Fetch order — try modern schema first
  let order: Record<string, unknown> | null = null;
  let orderSchema: "modern" | "legacy" = "modern";

  const modernOrderResult = await supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_phone,customer_city,customer_address,customer_comment,payment_method,payment_status,order_status,subtotal,delivery_price,total,created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!modernOrderResult.error && modernOrderResult.data) {
    order = modernOrderResult.data as Record<string, unknown>;
    orderSchema = "modern";
  } else {
    const legacyResult = await supabase
      .from("orders")
      .select("id,customer_name,phone,address,total_price,status,payment_method,created_at")
      .eq("id", orderId)
      .maybeSingle();

    if (!legacyResult.error && legacyResult.data) {
      order = legacyResult.data as Record<string, unknown>;
      orderSchema = "legacy";
    }
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderNumber =
    orderSchema === "modern"
      ? tv(order.order_number) || `MIO-${order.id}`
      : `MIO-${order.id}`;
  const customerName = tv(orderSchema === "modern" ? order.customer_name : order.customer_name);
  const customerPhone = tv(orderSchema === "modern" ? order.customer_phone : order.phone);
  const customerAddress =
    orderSchema === "modern"
      ? [tv(order.customer_city), tv(order.customer_address)].filter(Boolean).join(", ")
      : tv(order.address);
  const paymentMethod = tv(order.payment_method);
  const total = nv(orderSchema === "modern" ? order.total : order.total_price);
  const subtotal = nv(orderSchema === "modern" ? order.subtotal : order.total_price);
  const deliveryPrice = nv(orderSchema === "modern" ? order.delivery_price : 0);
  const createdAt = tv(order.created_at);

  // Fetch order items — try modern, then legacy
  let rawItems: Record<string, unknown>[] = [];

  const modernItemsResult = await supabase
    .from("order_items")
    .select("id,product_name,product_sku,quantity,unit_price,total_price")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  if (!modernItemsResult.error && modernItemsResult.data?.length) {
    rawItems = modernItemsResult.data as Record<string, unknown>[];
  } else {
    const legacyItemsResult = await supabase
      .from("order_items")
      .select("id,product_name,sku,quantity,unit_price,price,total_price")
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    if (!legacyItemsResult.error) {
      rawItems = (legacyItemsResult.data || []) as Record<string, unknown>[];
    }
  }

  const items = rawItems.map((r, index) => ({
    num: index + 1,
    sku: tv(r.product_sku ?? r.sku) || "—",
    name: tv(r.product_name) || "Товар",
    qty: nv(r.quantity),
    unitPrice: nv(r.unit_price ?? r.price),
    discount: 0,
    finalPrice: nv(r.unit_price ?? r.price),
    total: nv(r.total_price),
  }));

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + i.total, total);

  // ─── Build Workbook ──────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "MIO Beauty";
  wb.created = new Date();

  const ws = wb.addWorksheet("ТТН", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Column widths
  ws.columns = [
    { width: 5 },   // №
    { width: 14 },  // SKU
    { width: 32 },  // Name
    { width: 8 },   // Qty
    { width: 8 },   // Unit
    { width: 16 },  // Price
    { width: 12 },  // Discount
    { width: 16 },  // Final Price
    { width: 18 },  // Total
  ];

  const COLS = 9;
  const brandColor = "C8523A"; // MIO Berry
  const headerBg = "FFF5F2";
  const tableBg = "FFF8F6";
  const darkText = "1A1A1A";
  const mutedText = "666666";

  function mergeAndSet(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    value: string | number | null,
    style: Partial<ExcelJS.Style> = {}
  ) {
    ws.mergeCells(startRow, startCol, endRow, endCol);
    const cell = ws.getCell(startRow, startCol);
    cell.value = value;
    if (style.font) cell.font = style.font as ExcelJS.Font;
    if (style.fill) cell.fill = style.fill as ExcelJS.Fill;
    if (style.alignment) cell.alignment = style.alignment as ExcelJS.Alignment;
    if (style.border) cell.border = style.border as ExcelJS.Borders;
    return cell;
  }

  let row = 1;

  // ─── TITLE BLOCK ─────────────────────────────────────────────
  mergeAndSet(row, 1, row, COLS, "ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)", {
    font: { name: "Calibri", bold: true, size: 16, color: { argb: `FF${brandColor}` } },
    alignment: { horizontal: "center", vertical: "middle" },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } },
  });
  ws.getRow(row).height = 32;
  row++;

  mergeAndSet(row, 1, row, COLS, "MIO BEAUTY  |  BUSINESS-PACKAGE LLC", {
    font: { name: "Calibri", bold: true, size: 12, color: { argb: `FF${darkText}` } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(row).height = 22;
  row++;

  // Thin separator
  const sepRow = ws.getRow(row);
  for (let c = 1; c <= COLS; c++) {
    ws.getCell(row, c).border = {
      bottom: { style: "medium", color: { argb: `FF${brandColor}` } },
    };
  }
  ws.getRow(row).height = 4;
  row++;
  row++; // blank

  // ─── ORDER INFO BLOCK ─────────────────────────────────────────
  const infoStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", size: 11, color: { argb: `FF${darkText}` } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerBg}` } },
  };
  const labelStyle: Partial<ExcelJS.Style> = {
    font: { name: "Calibri", bold: true, size: 11, color: { argb: `FF${mutedText}` } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerBg}` } },
  };

  const infoRows: [string, string][] = [
    ["Дата отправки:", fmtDate(createdAt)],
    ["Номер заказа:", orderNumber],
    ["Покупатель:", customerName || "—"],
    ["Телефон:", customerPhone || "—"],
    ["Адрес доставки:", customerAddress || "—"],
    ["Способ оплаты:", paymentLabel(paymentMethod)],
    ["Менеджер:", managerName],
  ];

  for (const [label, value] of infoRows) {
    mergeAndSet(row, 1, row, 2, label, labelStyle);
    mergeAndSet(row, 3, row, COLS, value, infoStyle);
    ws.getRow(row).height = 20;
    row++;
  }
  row++; // blank

  // ─── TABLE HEADER ─────────────────────────────────────────────
  const headerRow = ws.getRow(row);
  headerRow.height = 24;
  const headers = ["№", "Код (SKU)", "Наименование товара", "Кол-во", "Ед.", "Цена", "Скидка", "Цена со скидкой", "Сумма"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brandColor}` } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } },
    };
  });
  row++;

  // ─── TABLE ROWS ───────────────────────────────────────────────
  if (items.length === 0) {
    mergeAndSet(row, 1, row, COLS, "Нет позиций в заказе", {
      font: { name: "Calibri", size: 11, italic: true, color: { argb: `FF${mutedText}` } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(row).height = 22;
    row++;
  }

  for (const item of items) {
    const isEven = item.num % 2 === 0;
    const rowFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: isEven ? `FF${tableBg}` : "FFFFFFFF" },
    };
    const border: Partial<ExcelJS.Borders> = {
      bottom: { style: "hair", color: { argb: "FFEEEEEE" } },
      left: { style: "hair", color: { argb: "FFEEEEEE" } },
      right: { style: "hair", color: { argb: "FFEEEEEE" } },
    };
    const dataRow = ws.getRow(row);
    dataRow.height = 20;

    const vals: (string | number)[] = [
      item.num,
      item.sku,
      item.name,
      item.qty,
      "шт.",
      item.unitPrice,
      item.discount,
      item.finalPrice,
      item.total,
    ];

    vals.forEach((v, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = v;
      cell.font = { name: "Calibri", size: 10, color: { argb: `FF${darkText}` } };
      cell.fill = rowFill;
      cell.border = border;
      const isNumCol = [4, 6, 7, 8, 9].includes(i + 1);
      if (isNumCol) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if ([6, 7, 8, 9].includes(i + 1)) {
          cell.numFmt = '#,##0" сум"';
        }
      } else {
        cell.alignment = { horizontal: i === 2 ? "left" : "center", vertical: "middle", wrapText: i === 2 };
      }
    });
    row++;
  }

  row++; // blank

  // ─── TOTALS BLOCK ─────────────────────────────────────────────
  const totalFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${headerBg}` },
  };

  const totalsData: [string, string][] = [
    ["Итого позиций:", `${items.length} шт.`],
    ["Итого количество:", `${totalQty} шт.`],
    ["Подытог:", fmt(subtotal)],
    ["Доставка:", fmt(deliveryPrice)],
    ["НДС (0%):", "0 сум"],
    ["ИТОГО К ОПЛАТЕ:", fmt(totalAmount)],
  ];

  for (let i = 0; i < totalsData.length; i++) {
    const [label, value] = totalsData[i];
    const isLast = i === totalsData.length - 1;
    mergeAndSet(row, 5, row, 7, label, {
      font: { name: "Calibri", bold: isLast, size: isLast ? 12 : 10, color: { argb: `FF${isLast ? brandColor : mutedText}` } },
      fill: totalFill,
      alignment: { horizontal: "right", vertical: "middle" },
    });
    mergeAndSet(row, 8, row, COLS, value, {
      font: { name: "Calibri", bold: isLast, size: isLast ? 12 : 10, color: { argb: `FF${isLast ? brandColor : darkText}` } },
      fill: totalFill,
      alignment: { horizontal: "right", vertical: "middle" },
    });
    ws.getRow(row).height = isLast ? 26 : 20;
    row++;
  }

  row += 2; // spacer

  // ─── SIGNATURES ───────────────────────────────────────────────
  const sigLabel = {
    font: { name: "Calibri", bold: true, size: 10, color: { argb: `FF${mutedText}` } },
    alignment: { horizontal: "left" as const, vertical: "middle" as const },
  };
  const sigLine = {
    font: { name: "Calibri", size: 10, color: { argb: `FF${darkText}` } },
    alignment: { horizontal: "left" as const, vertical: "middle" as const },
    border: { bottom: { style: "thin" as const, color: { argb: `FF${darkText}` } } },
  };

  mergeAndSet(row, 1, row, 1, "Продавец:", sigLabel);
  mergeAndSet(row, 2, row, 3, "", sigLine);
  mergeAndSet(row, 5, row, 5, "Получатель:", sigLabel);
  mergeAndSet(row, 6, row, 7, "", sigLine);
  ws.getRow(row).height = 24;
  row++;

  mergeAndSet(row, 1, row, 1, "Менеджер:", sigLabel);
  mergeAndSet(row, 2, row, 3, "", sigLine);
  mergeAndSet(row, 5, row, 5, "Дата:", sigLabel);
  mergeAndSet(row, 6, row, 7, "", sigLine);
  ws.getRow(row).height = 24;
  row++;

  row++;
  mergeAndSet(row, 1, row, COLS, "MIO BEAUTY — Ваш надежный партнер в красоте  |  business-package.uz", {
    font: { name: "Calibri", size: 9, italic: true, color: { argb: `FF${mutedText}` } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(row).height = 18;

  // ─── Build buffer ────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9_-]/g, "-");

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="TTN-${safeOrderNumber}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
