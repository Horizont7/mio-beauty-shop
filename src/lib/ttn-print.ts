export type TtnOrderData = {
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  createdAt: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
};

export type TtnItemData = {
  num: number;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
};

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

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTtnHtml(
  order: TtnOrderData,
  items: TtnItemData[],
  managerName: string
): string {
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  const itemRows = items.length
    ? items
        .map(
          (item) => `
        <tr>
          <td class="center">${item.num}</td>
          <td class="center">${esc(item.sku)}</td>
          <td>${esc(item.name)}</td>
          <td class="center">${item.qty}</td>
          <td class="center">шт.</td>
          <td class="right">${fmt(item.unitPrice)}</td>
          <td class="center">—</td>
          <td class="right">${fmt(item.unitPrice)}</td>
          <td class="right bold">${fmt(item.total)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="9" class="center muted">Нет позиций в заказе</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>ТТН ${esc(order.orderNumber)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Arial", sans-serif; font-size: 10pt; color: #1a1a1a; background: #fff; }

  .page { max-width: 270mm; margin: 0 auto; }

  /* Header */
  .ttn-title { text-align: center; font-size: 16pt; font-weight: 700; color: #c8523a; margin-bottom: 3pt; letter-spacing: 0.02em; }
  .ttn-company { text-align: center; font-size: 11pt; font-weight: 600; color: #1a1a1a; margin-bottom: 6pt; }
  .ttn-divider { border: none; border-top: 2.5pt solid #c8523a; margin-bottom: 10pt; }

  /* Info grid */
  .info-grid { display: grid; grid-template-columns: 130pt 1fr; row-gap: 3pt; background: #fff5f2; padding: 8pt 10pt; border-radius: 4pt; margin-bottom: 12pt; }
  .info-label { font-weight: 700; color: #666; font-size: 9.5pt; }
  .info-value { color: #1a1a1a; font-size: 9.5pt; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 10pt; }
  thead tr { background: #c8523a; color: #fff; }
  thead th { padding: 5pt 4pt; text-align: center; font-weight: 700; font-size: 8.5pt; border: 1pt solid #b04030; }
  tbody tr:nth-child(even) { background: #fff8f6; }
  tbody tr:nth-child(odd) { background: #ffffff; }
  tbody td { padding: 4pt; border: 0.5pt solid #eeeeee; font-size: 9pt; vertical-align: middle; }
  .th-name { text-align: left !important; }
  .td-name { text-align: left; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .muted { color: #999; font-style: italic; }

  /* Totals */
  .totals-block { display: flex; justify-content: flex-end; margin-bottom: 14pt; }
  .totals-table { width: 220pt; font-size: 9.5pt; border-collapse: collapse; }
  .totals-table td { padding: 3pt 6pt; }
  .totals-table td:first-child { color: #666; text-align: right; }
  .totals-table td:last-child { text-align: right; font-weight: 600; color: #1a1a1a; }
  .totals-table tr.grand td { border-top: 1.5pt solid #c8523a; padding-top: 5pt; font-size: 11pt; font-weight: 700; color: #c8523a; }

  /* Signatures */
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin-bottom: 12pt; }
  .sig-row { display: flex; align-items: flex-end; gap: 8pt; font-size: 9.5pt; }
  .sig-label { font-weight: 700; color: #666; white-space: nowrap; }
  .sig-line { flex: 1; border-bottom: 1pt solid #1a1a1a; min-width: 60pt; height: 16pt; }

  /* Footer */
  .footer { text-align: center; font-size: 8.5pt; color: #999; font-style: italic; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: none; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="ttn-title">ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)</div>
  <div class="ttn-company">MIO BEAUTY &nbsp;|&nbsp; BUSINESS-PACKAGE LLC</div>
  <hr class="ttn-divider">

  <div class="info-grid">
    <span class="info-label">Дата отправки:</span><span class="info-value">${fmtDate(order.createdAt)}</span>
    <span class="info-label">Номер заказа:</span><span class="info-value">${esc(order.orderNumber)}</span>
    <span class="info-label">Покупатель:</span><span class="info-value">${esc(order.customerName || "—")}</span>
    <span class="info-label">Телефон:</span><span class="info-value">${esc(order.phone || "—")}</span>
    <span class="info-label">Адрес доставки:</span><span class="info-value">${esc(order.address || "—")}</span>
    <span class="info-label">Способ оплаты:</span><span class="info-value">${esc(paymentLabel(order.paymentMethod))}</span>
    <span class="info-label">Менеджер:</span><span class="info-value">${esc(managerName)}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28pt">№</th>
        <th style="width:68pt">Код (SKU)</th>
        <th class="th-name">Наименование товара</th>
        <th style="width:34pt">Кол-во</th>
        <th style="width:28pt">Ед.</th>
        <th style="width:72pt">Цена</th>
        <th style="width:46pt">Скидка</th>
        <th style="width:72pt">Цена со скидкой</th>
        <th style="width:76pt">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals-block">
    <table class="totals-table">
      <tr><td>Итого позиций:</td><td>${items.length} поз.</td></tr>
      <tr><td>Итого количество:</td><td>${totalQty} шт.</td></tr>
      <tr><td>Подытог:</td><td>${fmt(order.subtotal)}</td></tr>
      <tr><td>Доставка:</td><td>${fmt(order.deliveryPrice)}</td></tr>
      <tr><td>НДС (0%):</td><td>0 сум</td></tr>
      <tr class="grand"><td>ИТОГО К ОПЛАТЕ:</td><td>${fmt(order.total)}</td></tr>
    </table>
  </div>

  <div class="sigs">
    <div>
      <div class="sig-row"><span class="sig-label">Продавец:</span><span class="sig-line"></span></div>
    </div>
    <div>
      <div class="sig-row"><span class="sig-label">Получатель:</span><span class="sig-line"></span></div>
    </div>
    <div>
      <div class="sig-row"><span class="sig-label">Менеджер:</span><span class="sig-line"></span></div>
    </div>
    <div>
      <div class="sig-row"><span class="sig-label">Дата:</span><span class="sig-line"></span></div>
    </div>
  </div>

  <div class="footer">MIO BEAUTY — Ваш надёжный партнёр в красоте &nbsp;|&nbsp; business-package.uz</div>

</div>
</body>
</html>`;
}

export function printTtnDocument(
  order: TtnOrderData,
  items: TtnItemData[],
  managerName: string
) {
  const html = buildTtnHtml(order, items, managerName);
  const win = window.open("", "_blank", "width=1100,height=750,scrollbars=yes");
  if (!win) {
    alert("Пожалуйста, разрешите всплывающие окна для этой страницы.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Small delay to let CSS render before print dialog
  win.setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}
