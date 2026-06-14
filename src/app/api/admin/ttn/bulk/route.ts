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
function fmtMoney(n: number) {
  return n.toLocaleString("ru-RU") + " сум";
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NCOLS = 9;
const C = {
  orange:      "D97030",
  orangeLight: "FCF0E8",
  orangeMid:   "F5CCA8",
  white:       "FFFFFF",
  dark:        "1A1A1A",
  muted:       "777777",
  gridBorder:  "DDDDDD",
  rowEven:     "FFF9F5",
  totalsBg:    "FEF4EC",
  grandBg:     "FCE8D5",
} as const;

type BorderSide = "thin" | "medium" | "thick" | "hair" | "dotted" | "dashed";

function applyBorderBox(
  ws: ExcelJS.Worksheet,
  r1: number, c1: number,
  r2: number, c2: number,
  style: BorderSide = "thin",
  color = "CCCCCC"
) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      const top    = r === r1 ? { style, color: { argb: `FF${color}` } } : undefined;
      const bottom = r === r2 ? { style, color: { argb: `FF${color}` } } : undefined;
      const left   = c === c1 ? { style, color: { argb: `FF${color}` } } : undefined;
      const right  = c === c2 ? { style, color: { argb: `FF${color}` } } : undefined;
      if (top || bottom || left || right) {
        cell.border = {
          ...(cell.border ?? {}),
          ...(top    ? { top }    : {}),
          ...(bottom ? { bottom } : {}),
          ...(left   ? { left }   : {}),
          ...(right  ? { right }  : {}),
        };
      }
    }
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
type OrderItem = {
  num: number;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  finalPrice: number;
  total: number;
};

type OrderSection = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
  createdAt: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  items: OrderItem[];
};

// ─── TTN section renderer ────────────────────────────────────────────────────
// Renders one complete TTN starting at `startRow`. Returns the next free row.
function renderTTNSection(
  ws: ExcelJS.Worksheet,
  startRow: number,
  data: OrderSection,
  managerName: string
): number {
  let R = startRow;

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
  function setAlign(
    cell: ExcelJS.Cell,
    h: ExcelJS.Alignment["horizontal"],
    v: ExcelJS.Alignment["vertical"] = "middle",
    wrap = false
  ) {
    cell.alignment = { horizontal: h, vertical: v, wrapText: wrap };
  }
  function row(r: number) { return ws.getRow(r); }

  const {
    orderNumber, customerName, customerPhone, customerAddress,
    paymentMethod, createdAt, subtotal, deliveryPrice, total, items,
  } = data;

  // ── Title ────────────────────────────────────────────────────────────────
  {
    const c = mc(R, 1, R, NCOLS);
    c.value = "ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)";
    setFont(c, { bold: true, size: 17, color: { argb: `FF${C.orange}` } });
    setAlign(c, "center");
    setFill(c, C.white);
    row(R).height = 34;
  }
  R++;

  // ── Company ───────────────────────────────────────────────────────────────
  {
    const c = mc(R, 1, R, NCOLS);
    c.value = "MIO BEAUTY  |  BUSINESS-PACKAGE LLC";
    setFont(c, { bold: true, size: 11, color: { argb: `FF${C.dark}` } });
    setAlign(c, "center");
    setFill(c, C.white);
    row(R).height = 22;
  }
  R++;

  // ── Orange separator ──────────────────────────────────────────────────────
  for (let c = 1; c <= NCOLS; c++) {
    const cell = ws.getCell(R, c);
    setFill(cell, C.orange);
    cell.value = "";
  }
  row(R).height = 4;
  R++;

  // spacer
  row(R).height = 6;
  R++;

  // ── Info block ────────────────────────────────────────────────────────────
  const infoStart = R;
  const infoRows: [string, string][] = [
    ["Дата отправки:",   fmtDate(createdAt)],
    ["Номер заказа:",    orderNumber],
    ["Покупатель:",      customerName || "—"],
    ["Телефон:",         customerPhone || "—"],
    ["Адрес доставки:",  customerAddress || "—"],
    ["Способ оплаты:",   paymentLabel(paymentMethod)],
    ["Менеджер:",        managerName],
  ];
  for (const [label, value] of infoRows) {
    const lc = mc(R, 1, R, 2);
    lc.value = label;
    setFont(lc, { bold: true, size: 10, color: { argb: `FF${C.muted}` } });
    setAlign(lc, "left");
    setFill(lc, C.orangeLight);

    const vc = mc(R, 3, R, 5);
    vc.value = value;
    setFont(vc, { size: 10, color: { argb: `FF${C.dark}` } });
    setAlign(vc, "left");
    setFill(vc, C.orangeLight);

    const fc = mc(R, 6, R, NCOLS);
    setFill(fc, C.white);

    row(R).height = 19;
    R++;
  }
  applyBorderBox(ws, infoStart, 1, R - 1, 5, "thin", C.orangeMid);

  // spacer
  row(R).height = 8;
  R++;

  // ── Table header ──────────────────────────────────────────────────────────
  const tableHeaderRow = R;
  const headers = ["№", "Код (SKU)", "Наименование товара", "Кол-во", "Ед.", "Цена", "Скидка", "Цена со скидкой", "Сумма"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(R, i + 1);
    cell.value = h;
    setFont(cell, { bold: true, size: 10, color: { argb: `FF${C.white}` } });
    setFill(cell, C.orange);
    cell.alignment = { horizontal: i === 2 ? "left" : "center", vertical: "middle", wrapText: true };
    cell.border = {
      top:    { style: "medium", color: { argb: `FF${C.orange}` } },
      bottom: { style: "medium", color: { argb: `FF${C.orange}` } },
      left:   { style: "thin",   color: { argb: "FFEEEEEE" } },
      right:  { style: "thin",   color: { argb: "FFEEEEEE" } },
    };
  });
  row(R).height = 28;
  R++;

  // ── Product rows ──────────────────────────────────────────────────────────
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
      top:    { style: "hair", color: { argb: `FF${C.gridBorder}` } },
      bottom: { style: "hair", color: { argb: `FF${C.gridBorder}` } },
      left:   { style: "thin", color: { argb: `FF${C.gridBorder}` } },
      right:  { style: "thin", color: { argb: `FF${C.gridBorder}` } },
    };
  };

  for (const item of items) {
    const bg = item.num % 2 === 0 ? C.rowEven : C.white;
    row(R).height = 20;

    type CellDef = { v: string | number; align: ExcelJS.Alignment["horizontal"]; wrap?: boolean; numFmt?: string };
    const rowVals: CellDef[] = [
      { v: item.num,        align: "center" },
      { v: item.sku,        align: "center" },
      { v: item.name,       align: "left",   wrap: true },
      { v: item.qty,        align: "center" },
      { v: "шт.",           align: "center" },
      { v: item.unitPrice,  align: "right",  numFmt: "# ##0" },
      { v: item.discount,   align: "right",  numFmt: "# ##0" },
      { v: item.finalPrice, align: "right",  numFmt: "# ##0" },
      { v: item.total,      align: "right",  numFmt: "# ##0" },
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

  applyBorderBox(ws, tableHeaderRow, 1, R - 1, NCOLS, "medium", C.orange);

  // ── Totals ────────────────────────────────────────────────────────────────
  row(R).height = 6;
  R++;

  const totalsStart = R;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
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
  applyBorderBox(ws, totalsStart, 6, R - 1, NCOLS, "thin", C.orangeMid);

  // ── Signatures ────────────────────────────────────────────────────────────
  row(R).height = 8;
  R++;

  const sigFont: Partial<ExcelJS.Font> = { name: "Calibri", size: 10, color: { argb: `FF${C.muted}` }, bold: true };
  const sigLine: Partial<ExcelJS.Borders> = { bottom: { style: "thin", color: { argb: `FF${C.dark}` } } };

  {
    ws.getCell(R, 1).value = "Продавец:";
    setFont(ws.getCell(R, 1), sigFont);
    setAlign(ws.getCell(R, 1), "left");
    const aLine = mc(R, 2, R, 4);
    aLine.value = "";
    aLine.border = sigLine;
    setFill(aLine, C.white);

    ws.getCell(R, 6).value = "Получатель:";
    setFont(ws.getCell(R, 6), sigFont);
    setAlign(ws.getCell(R, 6), "left");
    const bLine = mc(R, 7, R, NCOLS);
    bLine.value = "";
    bLine.border = sigLine;
    setFill(bLine, C.white);

    row(R).height = 28;
    R++;
  }
  {
    ws.getCell(R, 1).value = "Менеджер:";
    setFont(ws.getCell(R, 1), sigFont);
    setAlign(ws.getCell(R, 1), "left");
    const aLine = mc(R, 2, R, 4);
    aLine.value = "";
    aLine.border = sigLine;
    setFill(aLine, C.white);

    ws.getCell(R, 6).value = "Дата:";
    setFont(ws.getCell(R, 6), sigFont);
    setAlign(ws.getCell(R, 6), "left");
    const bLine = mc(R, 7, R, NCOLS);
    bLine.value = "";
    bLine.border = sigLine;
    setFill(bLine, C.white);

    row(R).height = 28;
    R++;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  row(R).height = 6;
  R++;
  {
    const c = mc(R, 1, R, NCOLS);
    c.value = "MIO BEAUTY — ваш надёжный партнёр в красоте  |  business-package.uz";
    setFont(c, { italic: true, size: 9, color: { argb: `FF${C.muted}` } });
    setAlign(c, "center");
    row(R).height = 16;
    R++;
  }

  return R;
}

// ─── POST handler ────────────────────────────────────────────────────────────
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

  const body = (await request.json()) as { orderIds?: unknown; managerName?: unknown };
  const orderIds = Array.isArray(body.orderIds)
    ? (body.orderIds as unknown[]).filter(Boolean)
    : [];
  const managerName = tv(body.managerName) || "Администратор";

  if (orderIds.length === 0) {
    return NextResponse.json({ error: "orderIds required" }, { status: 400 });
  }
  if (orderIds.length > 100) {
    return NextResponse.json({ error: "Максимум 100 заказов за один запрос" }, { status: 400 });
  }

  const { supabase } = adminInfo;
  const sections: OrderSection[] = [];

  for (const orderId of orderIds) {
    let order: Record<string, unknown> | null = null;
    let orderSchema: "modern" | "legacy" = "modern";

    const modernResult = await supabase
      .from("orders")
      .select(
        "id,order_number,customer_name,customer_phone,customer_city,customer_address,payment_method,subtotal,delivery_price,total,created_at"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!modernResult.error && modernResult.data) {
      order = modernResult.data as Record<string, unknown>;
    } else {
      const legacyResult = await supabase
        .from("orders")
        .select("id,customer_name,phone,address,total_price,payment_method,created_at")
        .eq("id", orderId)
        .maybeSingle();
      if (!legacyResult.error && legacyResult.data) {
        order = legacyResult.data as Record<string, unknown>;
        orderSchema = "legacy";
      }
    }

    if (!order) continue;

    const orderNumber =
      orderSchema === "modern"
        ? tv(order.order_number) || `MIO-${order.id}`
        : `MIO-${order.id}`;
    const customerName    = tv(order.customer_name);
    const customerPhone   = tv(orderSchema === "modern" ? order.customer_phone : order.phone);
    const customerAddress =
      orderSchema === "modern"
        ? [tv(order.customer_city), tv(order.customer_address)].filter(Boolean).join(", ")
        : tv(order.address);
    const paymentMethod = tv(order.payment_method);
    const total         = nv(orderSchema === "modern" ? order.total         : order.total_price);
    const subtotal      = nv(orderSchema === "modern" ? order.subtotal      : order.total_price);
    const deliveryPrice = nv(orderSchema === "modern" ? order.delivery_price : 0);
    const createdAt     = tv(order.created_at);

    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    const rawItems = (itemsData ?? []) as Record<string, unknown>[];
    const items: OrderItem[] = rawItems.map((r, i) => {
      const qty       = nv(r.quantity ?? r.qty ?? r.count);
      const unitPrice = nv(r.unit_price ?? r.price ?? r.unit_cost ?? r.item_price ?? r.price_per_item);
      const lineTotal = nv(r.total_price ?? r.line_total ?? r.row_total ?? r.total ?? r.amount);
      return {
        num:        i + 1,
        sku:        tv(r.product_sku ?? r.sku ?? r.product_code ?? r.code) || "—",
        name:       tv(r.product_name ?? r.name ?? r.title ?? r.product_title) || "Товар",
        qty,
        unitPrice,
        discount:   0,
        finalPrice: unitPrice,
        total:      lineTotal || unitPrice * qty,
      };
    });

    sections.push({
      orderNumber, customerName, customerPhone, customerAddress,
      paymentMethod, createdAt, subtotal, deliveryPrice, total, items,
    });
  }

  if (sections.length === 0) {
    return NextResponse.json({ error: "Заказы не найдены" }, { status: 404 });
  }

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "MIO Beauty";
  wb.created = new Date();

  const ws = wb.addWorksheet("Накладные", {
    pageSetup: {
      paperSize: 9,
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

  ws.columns = [
    { key: "a", width: 5.5  },
    { key: "b", width: 13   },
    { key: "c", width: 34   },
    { key: "d", width: 8    },
    { key: "e", width: 7    },
    { key: "f", width: 14   },
    { key: "g", width: 11   },
    { key: "h", width: 14   },
    { key: "i", width: 16   },
  ];

  let currentRow = 1;

  for (let idx = 0; idx < sections.length; idx++) {
    currentRow = renderTTNSection(ws, currentRow, sections[idx], managerName);

    // Separator between sections (not after the last)
    if (idx < sections.length - 1) {
      ws.getRow(currentRow).height = 10; currentRow++;
      ws.getRow(currentRow).height = 10; currentRow++;

      // Orange divider bar
      for (let c = 1; c <= NCOLS; c++) {
        ws.getCell(currentRow, c).fill = {
          type: "pattern", pattern: "solid",
          fgColor: { argb: "FFD97030" },
        };
        ws.getCell(currentRow, c).value = "";
      }
      ws.getRow(currentRow).height = 4;
      currentRow++;

      ws.getRow(currentRow).height = 10; currentRow++;
      ws.getRow(currentRow).height = 10; currentRow++;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="MIO_BEAUTY_TTN_SELECTED_ORDERS.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
