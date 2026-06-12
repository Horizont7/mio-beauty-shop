import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin, adminAuthErrorResponse } from "@/lib/admin/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────
function tv(v: unknown) {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}
function nv(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
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
// Russian-style space thousands separator  e.g. 88 800 сум
function fmtMoney(n: number) {
  return n.toLocaleString("ru-RU") + " сум";
}

// ─── WorksheetBuilder helpers ───────────────────────────────────────────────
type BorderSide = "thin" | "medium" | "thick" | "hair" | "dotted" | "dashed";

function applyBorderBox(
  ws: ExcelJS.Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  style: BorderSide = "thin",
  color = "CCCCCC"
) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      const top = r === r1 ? { style, color: { argb: `FF${color}` } } : undefined;
      const bottom = r === r2 ? { style, color: { argb: `FF${color}` } } : undefined;
      const left = c === c1 ? { style, color: { argb: `FF${color}` } } : undefined;
      const right = c === c2 ? { style, color: { argb: `FF${color}` } } : undefined;
      if (top || bottom || left || right) {
        cell.border = {
          ...(cell.border ?? {}),
          ...(top ? { top } : {}),
          ...(bottom ? { bottom } : {}),
          ...(left ? { left } : {}),
          ...(right ? { right } : {}),
        };
      }
    }
  }
}

// ─── POST handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let adminInfo: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    adminInfo = await requireAdmin(request);
  } catch (err) {
    return (
      adminAuthErrorResponse(err) ??
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  const body = (await request.json()) as {
    orderId?: unknown;
    managerName?: unknown;
  };
  const orderId = body.orderId;
  const managerName = tv(body.managerName) || "Администратор";

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const { supabase } = adminInfo;

  // ── Fetch order (modern → legacy fallback) ─────────────────────────────
  let order: Record<string, unknown> | null = null;
  let orderSchema: "modern" | "legacy" = "modern";

  const modernOrder = await supabase
    .from("orders")
    .select(
      "id,order_number,customer_name,customer_phone,customer_city,customer_address,payment_method,subtotal,delivery_price,total,created_at"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!modernOrder.error && modernOrder.data) {
    order = modernOrder.data as Record<string, unknown>;
  } else {
    const legacyOrder = await supabase
      .from("orders")
      .select("id,customer_name,phone,address,total_price,payment_method,created_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!legacyOrder.error && legacyOrder.data) {
      order = legacyOrder.data as Record<string, unknown>;
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
  const customerName = tv(order.customer_name);
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

  // ── Fetch order items ──────────────────────────────────────────────────
  let rawItems: Record<string, unknown>[] = [];

  const modernItems = await supabase
    .from("order_items")
    .select("id,product_name,product_sku,quantity,unit_price,total_price")
    .eq("order_id", orderId)
    .order("id", { ascending: true });

  if (!modernItems.error && modernItems.data?.length) {
    rawItems = modernItems.data as Record<string, unknown>[];
  } else {
    const legacyItems = await supabase
      .from("order_items")
      .select("id,product_name,sku,quantity,unit_price,price,total_price")
      .eq("order_id", orderId)
      .order("id", { ascending: true });
    if (!legacyItems.error) {
      rawItems = (legacyItems.data || []) as Record<string, unknown>[];
    }
  }

  const items = rawItems.map((r, i) => ({
    num: i + 1,
    sku: tv(r.product_sku ?? r.sku) || "—",
    name: tv(r.product_name) || "Товар",
    qty: nv(r.quantity),
    unitPrice: nv(r.unit_price ?? r.price),
    discount: 0,
    finalPrice: nv(r.unit_price ?? r.price),
    total: nv(r.total_price),
  }));

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  // ═══════════════════════════════════════════════════════════════════════
  //  WORKBOOK
  // ═══════════════════════════════════════════════════════════════════════
  const wb = new ExcelJS.Workbook();
  wb.creator = "MIO Beauty";
  wb.created = new Date();

  const ws = wb.addWorksheet("ТТН", {
    pageSetup: {
      paperSize: 9,          // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.55, right: 0.55,
        top: 0.55, bottom: 0.55,
        header: 0.2, footer: 0.2,
      },
    },
  });

  // ── Column widths (9 cols, fits A4 landscape) ──────────────────────────
  ws.columns = [
    { key: "a", width: 5.5  },   // 1  №
    { key: "b", width: 13   },   // 2  SKU
    { key: "c", width: 34   },   // 3  Product name
    { key: "d", width: 8    },   // 4  Qty
    { key: "e", width: 7    },   // 5  Unit
    { key: "f", width: 14   },   // 6  Price
    { key: "g", width: 11   },   // 7  Discount
    { key: "h", width: 14   },   // 8  Final price
    { key: "i", width: 16   },   // 9  Total
  ];

  // ── Brand palette ──────────────────────────────────────────────────────
  const C = {
    orange:      "D97030",  // header / accents
    orangeLight: "FCF0E8",  // info block background
    orangeMid:   "F5CCA8",  // info block border / table header border
    white:       "FFFFFF",
    dark:        "1A1A1A",
    muted:       "777777",
    gridBorder:  "DDDDDD",
    rowEven:     "FFF9F5",
    totalsBg:    "FEF4EC",
    grandBg:     "FCE8D5",
  } as const;

  const NCOLS = 9;

  // ── Low-level cell helpers ─────────────────────────────────────────────
  function mc(r1: number, c1: number, r2: number, c2: number): ExcelJS.Cell {
    if (r1 === r2 && c1 === c2) return ws.getCell(r1, c1);
    ws.mergeCells(r1, c1, r2, c2);
    return ws.getCell(r1, c1);
  }

  function setFill(cell: ExcelJS.Cell, hex: string) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } };
  }

  function setFont(cell: ExcelJS.Cell, opts: Partial<ExcelJS.Font>) {
    cell.font = { name: "Calibri", ...opts } as ExcelJS.Font;
  }

  function setAlign(cell: ExcelJS.Cell, h: ExcelJS.Alignment["horizontal"], v: ExcelJS.Alignment["vertical"] = "middle", wrap = false) {
    cell.alignment = { horizontal: h, vertical: v, wrapText: wrap };
  }

  function setBorder(cell: ExcelJS.Cell, style: BorderSide, hex: string) {
    const b = { style, color: { argb: `FF${hex}` } } as ExcelJS.Border;
    cell.border = { top: b, bottom: b, left: b, right: b };
  }

  function row(r: number) { return ws.getRow(r); }

  // ── Cursor ────────────────────────────────────────────────────────────
  let R = 1;

  // ════════════════════════════════════════════════════════════════════════
  //  ROW 1 — MAIN TITLE
  // ════════════════════════════════════════════════════════════════════════
  {
    const c = mc(R, 1, R, NCOLS);
    c.value = "ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)";
    setFont(c, { bold: true, size: 17, color: { argb: `FF${C.orange}` } });
    setAlign(c, "center");
    setFill(c, C.white);
    row(R).height = 34;
  }
  R++;

  // ════════════════════════════════════════════════════════════════════════
  //  ROW 2 — COMPANY
  // ════════════════════════════════════════════════════════════════════════
  {
    const c = mc(R, 1, R, NCOLS);
    c.value = "MIO BEAUTY  |  BUSINESS-PACKAGE LLC";
    setFont(c, { bold: true, size: 11, color: { argb: `FF${C.dark}` } });
    setAlign(c, "center");
    setFill(c, C.white);
    row(R).height = 22;
  }
  R++;

  // ════════════════════════════════════════════════════════════════════════
  //  ROW 3 — ORANGE SEPARATOR
  // ════════════════════════════════════════════════════════════════════════
  for (let c = 1; c <= NCOLS; c++) {
    const cell = ws.getCell(R, c);
    setFill(cell, C.orange);
    cell.value = "";
  }
  row(R).height = 4;
  R++;

  // Blank spacer
  row(R).height = 6;
  R++;

  // ════════════════════════════════════════════════════════════════════════
  //  ROWS 5-11 — ORDER INFO BLOCK (left side, cols 1-5)
  // ════════════════════════════════════════════════════════════════════════
  const infoStart = R;
  const infoData: [string, string][] = [
    ["Дата отправки:",   fmtDate(createdAt)],
    ["Номер заказа:",    orderNumber],
    ["Покупатель:",      customerName || "—"],
    ["Телефон:",         customerPhone || "—"],
    ["Адрес доставки:",  customerAddress || "—"],
    ["Способ оплаты:",   paymentLabel(paymentMethod)],
    ["Менеджер:",        managerName],
  ];

  for (const [label, value] of infoData) {
    // Label cell (cols 1-2)
    const lc = mc(R, 1, R, 2);
    lc.value = label;
    setFont(lc, { bold: true, size: 10, color: { argb: `FF${C.muted}` } });
    setAlign(lc, "left");
    setFill(lc, C.orangeLight);

    // Value cell (cols 3-5)
    const vc = mc(R, 3, R, 5);
    vc.value = value;
    setFont(vc, { size: 10, color: { argb: `FF${C.dark}` } });
    setAlign(vc, "left");
    setFill(vc, C.orangeLight);

    // Right side filler (cols 6-9) — keep empty but same bg
    const fc = mc(R, 6, R, NCOLS);
    setFill(fc, C.white);

    row(R).height = 19;
    R++;
  }
  const infoEnd = R - 1;

  // Box border around info block
  applyBorderBox(ws, infoStart, 1, infoEnd, 5, "thin", C.orangeMid);

  // Spacer
  row(R).height = 8;
  R++;

  // ════════════════════════════════════════════════════════════════════════
  //  TABLE HEADER
  // ════════════════════════════════════════════════════════════════════════
  const tableHeaderRow = R;
  const headers = [
    "№",
    "Код (SKU)",
    "Наименование товара",
    "Кол-во",
    "Ед.",
    "Цена",
    "Скидка",
    "Цена со скидкой",
    "Сумма",
  ];

  headers.forEach((h, i) => {
    const cell = ws.getCell(R, i + 1);
    cell.value = h;
    setFont(cell, { bold: true, size: 10, color: { argb: `FF${C.white}` } });
    setFill(cell, C.orange);
    cell.alignment = {
      horizontal: i === 2 ? "left" : "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top:    { style: "medium", color: { argb: `FF${C.orange}` } },
      bottom: { style: "medium", color: { argb: `FF${C.orange}` } },
      left:   { style: "thin",   color: { argb: `FFEEEEEE` } },
      right:  { style: "thin",   color: { argb: `FFEEEEEE` } },
    };
  });
  row(R).height = 28;
  R++;

  // ════════════════════════════════════════════════════════════════════════
  //  PRODUCT ROWS
  // ════════════════════════════════════════════════════════════════════════
  if (items.length === 0) {
    const c = mc(R, 1, R, NCOLS);
    c.value = "Нет позиций в заказе";
    setFont(c, { italic: true, size: 10, color: { argb: `FF${C.muted}` } });
    setAlign(c, "center");
    row(R).height = 22;
    R++;
  }

  const dataRowBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top:    { style: "hair",  color: { argb: `FF${C.gridBorder}` } },
      bottom: { style: "hair",  color: { argb: `FF${C.gridBorder}` } },
      left:   { style: "thin",  color: { argb: `FF${C.gridBorder}` } },
      right:  { style: "thin",  color: { argb: `FF${C.gridBorder}` } },
    };
  };

  for (const item of items) {
    const bg = item.num % 2 === 0 ? C.rowEven : C.white;
    row(R).height = 20;

    const rowVals: { v: string | number; align: ExcelJS.Alignment["horizontal"]; wrap?: boolean; numFmt?: string }[] = [
      { v: item.num,        align: "center" },
      { v: item.sku,        align: "center" },
      { v: item.name,       align: "left",   wrap: true },
      { v: item.qty,        align: "center" },
      { v: "шт.",           align: "center" },
      { v: item.unitPrice,  align: "right",  numFmt: '# ##0' },
      { v: item.discount,   align: "right",  numFmt: '# ##0' },
      { v: item.finalPrice, align: "right",  numFmt: '# ##0' },
      { v: item.total,      align: "right",  numFmt: '# ##0' },
    ];

    rowVals.forEach(({ v, align, wrap, numFmt }, i) => {
      const cell = ws.getCell(R, i + 1);
      cell.value = v;
      setFont(cell, { size: 10, color: { argb: `FF${C.dark}` } });
      setFill(cell, bg);
      cell.alignment = { horizontal: align, vertical: "middle", wrapText: !!wrap };
      if (numFmt) cell.numFmt = numFmt;
      dataRowBorder(cell);
    });
    R++;
  }

  // Outer border around the entire table (header + data rows)
  applyBorderBox(ws, tableHeaderRow, 1, R - 1, NCOLS, "medium", C.orange);

  // ════════════════════════════════════════════════════════════════════════
  //  TOTALS BLOCK (right side, cols 6-9)
  // ════════════════════════════════════════════════════════════════════════
  row(R).height = 6;  // small spacer
  R++;

  const totalsStart = R;
  const totalsRows: { label: string; value: string; isGrand?: boolean }[] = [
    { label: "Итого позиций:",   value: `${items.length} поз. / ${totalQty} шт.` },
    { label: "Подытог:",         value: fmtMoney(subtotal) },
    { label: "Доставка:",        value: fmtMoney(deliveryPrice) },
    { label: "НДС (0%):",        value: "0 сум" },
    { label: "ИТОГО К ОПЛАТЕ:",  value: fmtMoney(total), isGrand: true },
  ];

  for (const { label, value, isGrand } of totalsRows) {
    const lc = mc(R, 6, R, 7);
    lc.value = label;
    setFont(lc, {
      bold: isGrand,
      size: isGrand ? 12 : 10,
      color: { argb: `FF${isGrand ? C.orange : C.muted}` },
    });
    setAlign(lc, "right");
    setFill(lc, isGrand ? C.grandBg : C.totalsBg);

    const vc = mc(R, 8, R, 9);
    vc.value = value;
    setFont(vc, {
      bold: isGrand,
      size: isGrand ? 12 : 10,
      color: { argb: `FF${isGrand ? C.orange : C.dark}` },
    });
    setAlign(vc, "right");
    setFill(vc, isGrand ? C.grandBg : C.totalsBg);

    if (isGrand) {
      // Top border separator for grand total
      for (const col of [6, 7, 8, 9]) {
        ws.getCell(R, col).border = {
          ...(ws.getCell(R, col).border ?? {}),
          top: { style: "medium", color: { argb: `FF${C.orange}` } },
        };
      }
    }

    row(R).height = isGrand ? 26 : 20;
    R++;
  }

  // Box border around totals
  applyBorderBox(ws, totalsStart, 6, R - 1, NCOLS, "thin", C.orangeMid);

  // ════════════════════════════════════════════════════════════════════════
  //  SIGNATURES
  // ════════════════════════════════════════════════════════════════════════
  row(R).height = 8;
  R++;

  // Row 1 of sigs: Продавец | (blank line) | (gap) | Получатель | (blank line)
  const sigFontBase: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 10,
    color: { argb: `FF${C.muted}` },
    bold: true,
  };
  const sigLineBorder: Partial<ExcelJS.Borders> = {
    bottom: { style: "thin", color: { argb: `FF${C.dark}` } },
  };

  // Sig row 1: Продавец + line (cols 1-4)   |   Получатель + line (cols 6-9)
  {
    const a = ws.getCell(R, 1);
    a.value = "Продавец:";
    setFont(a, sigFontBase);
    setAlign(a, "left");

    const aLine = mc(R, 2, R, 4);
    aLine.value = "";
    aLine.border = sigLineBorder;
    setFill(aLine, C.white);

    const b = ws.getCell(R, 6);
    b.value = "Получатель:";
    setFont(b, sigFontBase);
    setAlign(b, "left");

    const bLine = mc(R, 7, R, NCOLS);
    bLine.value = "";
    bLine.border = sigLineBorder;
    setFill(bLine, C.white);

    row(R).height = 28;
    R++;
  }

  // Sig row 2: Менеджер + line (cols 1-4)   |   Дата + line (cols 6-9)
  {
    const a = ws.getCell(R, 1);
    a.value = "Менеджер:";
    setFont(a, sigFontBase);
    setAlign(a, "left");

    const aLine = mc(R, 2, R, 4);
    aLine.value = "";
    aLine.border = sigLineBorder;
    setFill(aLine, C.white);

    const b = ws.getCell(R, 6);
    b.value = "Дата:";
    setFont(b, sigFontBase);
    setAlign(b, "left");

    const bLine = mc(R, 7, R, NCOLS);
    bLine.value = "";
    bLine.border = sigLineBorder;
    setFill(bLine, C.white);

    row(R).height = 28;
    R++;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  FOOTER
  // ════════════════════════════════════════════════════════════════════════
  row(R).height = 6;
  R++;

  {
    const c = mc(R, 1, R, NCOLS);
    c.value = "MIO BEAUTY — ваш надёжный партнёр в красоте  |  business-package.uz";
    setFont(c, { italic: true, size: 9, color: { argb: `FF${C.muted}` } });
    setAlign(c, "center");
    row(R).height = 16;
  }

  // ─── Output ─────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const safeName = orderNumber.replace(/[^a-zA-Z0-9_-]/g, "-");

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="TTN-${safeName}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
