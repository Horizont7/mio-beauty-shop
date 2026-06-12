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
function fmtNum(n: number) {
  return n.toLocaleString("ru-RU");
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
        <tr class="${item.num % 2 === 0 ? "even" : "odd"}">
          <td class="center">${item.num}</td>
          <td class="center mono">${esc(item.sku)}</td>
          <td class="left name">${esc(item.name)}</td>
          <td class="center">${item.qty}</td>
          <td class="center">шт.</td>
          <td class="right">${fmtNum(item.unitPrice)}</td>
          <td class="center">—</td>
          <td class="right">${fmtNum(item.unitPrice)}</td>
          <td class="right bold">${fmtNum(item.total)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="9" class="center muted no-items">Нет позиций в заказе</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>ТТН ${esc(order.orderNumber)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Calibri", "Arial", sans-serif; font-size: 10pt; color: #1a1a1a; background: #fff; }
  .page { max-width: 267mm; margin: 0 auto; }

  /* ── Title block ── */
  .title-block { text-align: center; margin-bottom: 0; }
  .ttn-title {
    font-size: 16pt; font-weight: 800; color: #D97030;
    letter-spacing: 0.02em; line-height: 1.3; margin-bottom: 4pt;
  }
  .ttn-company {
    font-size: 11pt; font-weight: 600; color: #1a1a1a;
    margin-bottom: 6pt;
  }
  .ttn-divider {
    height: 4pt; background: #D97030; border: none; margin-bottom: 8pt;
  }

  /* ── Info block ── */
  .info-block {
    border: 1.5pt solid #F5CCA8;
    border-radius: 3pt;
    background: #FCF0E8;
    padding: 0;
    margin-bottom: 10pt;
    display: inline-block;
    min-width: 260pt;
  }
  .info-table { border-collapse: collapse; width: 100%; }
  .info-table td {
    padding: 4pt 8pt;
    font-size: 9.5pt;
    line-height: 1.4;
    border-bottom: 0.5pt solid #F5CCA8;
  }
  .info-table tr:last-child td { border-bottom: none; }
  .info-table .lbl { font-weight: 700; color: #777; width: 110pt; }
  .info-table .val { color: #1a1a1a; }

  /* ── Product table ── */
  .product-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 6pt; }
  .product-table thead tr {
    background: #D97030; color: #fff;
  }
  .product-table thead th {
    padding: 6pt 4pt; font-weight: 700; font-size: 9pt;
    border: 1pt solid #c45f20;
  }
  .product-table thead th.left { text-align: left; }
  .product-table thead th.center { text-align: center; }
  .product-table thead th.right { text-align: right; }
  .product-table tbody td {
    padding: 4pt 4pt;
    border: 0.75pt solid #dddddd;
    vertical-align: middle;
    font-size: 9pt;
  }
  .product-table tbody tr.even td { background: #FFF9F5; }
  .product-table tbody tr.odd  td { background: #ffffff; }
  .product-table .center { text-align: center; }
  .product-table .right  { text-align: right; }
  .product-table .left   { text-align: left; }
  .product-table .name   { text-align: left; }
  .product-table .mono   { font-family: "Courier New", monospace; font-size: 8.5pt; }
  .product-table .bold   { font-weight: 700; }
  .product-table .muted  { color: #999; }
  .product-table .no-items { padding: 10pt; font-style: italic; }
  /* outer border around entire table */
  .product-table { border: 2pt solid #D97030; }

  /* ── Totals block ── */
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 12pt; }
  .totals-box {
    border: 1.5pt solid #F5CCA8;
    border-radius: 3pt;
    overflow: hidden;
    min-width: 220pt;
  }
  .totals-table { border-collapse: collapse; width: 100%; }
  .totals-table td { padding: 4pt 8pt; font-size: 9.5pt; }
  .totals-table td:first-child { background: #FEF4EC; color: #777; text-align: right; font-weight: 600; border-right: 0.5pt solid #F5CCA8; }
  .totals-table td:last-child  { background: #FEF4EC; color: #1a1a1a; text-align: right; min-width: 90pt; }
  .totals-table tr { border-bottom: 0.5pt solid #F5CCA8; }
  .totals-table tr:last-child { border-bottom: none; }
  .totals-table tr.grand td:first-child {
    background: #FCE8D5; color: #D97030; font-size: 11pt; font-weight: 800;
    border-top: 1.5pt solid #D97030;
  }
  .totals-table tr.grand td:last-child {
    background: #FCE8D5; color: #D97030; font-size: 11pt; font-weight: 800;
    border-top: 1.5pt solid #D97030;
  }

  /* ── Signatures ── */
  .sigs { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20pt; row-gap: 10pt; margin-bottom: 10pt; }
  .sig-row { display: flex; align-items: flex-end; gap: 6pt; }
  .sig-lbl { font-size: 9.5pt; font-weight: 700; color: #777; white-space: nowrap; }
  .sig-line { flex: 1; border-bottom: 1pt solid #1a1a1a; min-width: 80pt; height: 18pt; }

  /* ── Footer ── */
  .footer { text-align: center; font-size: 8.5pt; color: #aaa; font-style: italic; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: none; }
    .product-table tbody tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="title-block">
    <div class="ttn-title">ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ (ТТН)</div>
    <div class="ttn-company">MIO BEAUTY &nbsp;|&nbsp; BUSINESS-PACKAGE LLC</div>
  </div>
  <div class="ttn-divider"></div>

  <div class="info-block">
    <table class="info-table">
      <tr><td class="lbl">Дата отправки:</td><td class="val">${fmtDate(order.createdAt)}</td></tr>
      <tr><td class="lbl">Номер заказа:</td><td class="val">${esc(order.orderNumber)}</td></tr>
      <tr><td class="lbl">Покупатель:</td><td class="val">${esc(order.customerName || "—")}</td></tr>
      <tr><td class="lbl">Телефон:</td><td class="val">${esc(order.phone || "—")}</td></tr>
      <tr><td class="lbl">Адрес доставки:</td><td class="val">${esc(order.address || "—")}</td></tr>
      <tr><td class="lbl">Способ оплаты:</td><td class="val">${esc(paymentLabel(order.paymentMethod))}</td></tr>
      <tr><td class="lbl">Менеджер:</td><td class="val">${esc(managerName)}</td></tr>
    </table>
  </div>

  <table class="product-table">
    <thead>
      <tr>
        <th class="center" style="width:26pt">№</th>
        <th class="center" style="width:64pt">Код (SKU)</th>
        <th class="left">Наименование товара</th>
        <th class="center" style="width:32pt">Кол-во</th>
        <th class="center" style="width:26pt">Ед.</th>
        <th class="right"  style="width:64pt">Цена</th>
        <th class="center" style="width:42pt">Скидка</th>
        <th class="right"  style="width:64pt">Цена со скидкой</th>
        <th class="right"  style="width:70pt">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <table class="totals-table">
        <tr><td>Итого позиций:</td><td>${items.length} поз. / ${totalQty} шт.</td></tr>
        <tr><td>Подытог:</td><td>${fmt(order.subtotal)}</td></tr>
        <tr><td>Доставка:</td><td>${fmt(order.deliveryPrice)}</td></tr>
        <tr><td>НДС (0%):</td><td>0 сум</td></tr>
        <tr class="grand"><td>ИТОГО К ОПЛАТЕ:</td><td>${fmt(order.total)}</td></tr>
      </table>
    </div>
  </div>

  <div class="sigs">
    <div class="sig-row"><span class="sig-lbl">Продавец:</span><span class="sig-line"></span></div>
    <div class="sig-row"><span class="sig-lbl">Получатель:</span><span class="sig-line"></span></div>
    <div class="sig-row"><span class="sig-lbl">Менеджер:</span><span class="sig-line"></span></div>
    <div class="sig-row"><span class="sig-lbl">Дата:</span><span class="sig-line"></span></div>
  </div>

  <div class="footer">MIO BEAUTY — ваш надёжный партнёр в красоте &nbsp;|&nbsp; business-package.uz</div>

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
  const win = window.open("", "_blank", "width=1150,height=800,scrollbars=yes");
  if (!win) {
    alert("Пожалуйста, разрешите всплывающие окна для этой страницы.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.setTimeout(() => {
    win.focus();
    win.print();
  }, 450);
}
