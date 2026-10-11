const SCALE = 0.7;
const TEXT_SCALE = 0.85;

const FONT = "Arial, Helvetica, sans-serif";

const FONT_WEIGHT = 400;

const DEFAULT_BUSINESS = {
  name: "LIYONTA TEA FACTORY",
  address: "Dangala,Alapaladeniya",
  phone: "0412282268",
  regNo: "TC/E/PR/1798/1566",
};

const px = (n) => `${+(n * SCALE).toFixed(2)}px`;
const tx = (n) => `${+(n * TEXT_SCALE).toFixed(2)}px`;

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const num = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const p6 = (t) => `<p6>${esc(t)}</p6>`;

const cell = (tag, inner, { right = false, head = false } = {}) =>
  `<${tag} class="mcell${head ? " mhead" : ""}${right ? " mright" : ""}">${inner}</${tag}>`;

export function buildReceiptHtml(receipt, businessInfo = {}) {
  const { order, items = [], amountDue, amountPaid, balance } = receipt;
  const { name, address, phone, regNo } = {
    ...DEFAULT_BUSINESS,
    ...businessInfo,
  };

  const created = new Date(order.created_at);
  const when = Number.isNaN(created.getTime()) ? new Date() : created;
  const time = when.toLocaleTimeString();
  const dateStr = `${when.getDate()}/${String(when.getMonth() + 1).padStart(2, "0")}/${when.getFullYear()}`;

  const headRow = `<tr class="mrow">${cell("th", p6("Item"), { head: true })}${cell("th", p6("Quantity"), { head: true, right: true })}${cell("th", p6("Price"), { head: true, right: true })}${cell("th", p6("Total"), { head: true, right: true })}${cell("th", "", { head: true, right: true })}</tr>`;

  const itemRows = items
    .map((item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      const category = item.categoryName
        ? `<div class="cat">${esc(item.categoryName)}</div>`
        : "";
      return `<tr class="mrow">${cell("td", p6(item.productName) + category)}${cell("td", p6(qty), { right: true })}${cell("td", p6(price.toFixed(2)), { right: true })}${cell("td", p6(num(qty * price)), { right: true })}${cell("td", "", { right: true })}</tr>`;
    })
    .join("");

  const freeItems = items.filter((i) => i.otherproductName);
  const freeBody = freeItems.length
    ? `<tbody><tr class="mrow">${cell("td", p6("Free:"))}</tr>${freeItems
        .map(
          (i) =>
            `<tr class="mrow">${cell("td", p6(i.otherproductName))}${cell("td", p6(i.otherquantity), { right: true })}</tr>`,
        )
        .join("")}</tbody>`
    : "";

  const totalRow = (label, value) =>
    `<div class="mrow">${cell("div", p6(label))}${cell("div", "", { right: true })}${cell("div", p6(value), { right: true })}</div>`;

  const forwardNote =
    balance > 0
      ? `<div class="customerdetailsprintsub"><div class="customerdetailsdiv"><p7>**Balance of ${esc(num(balance))}/= will be added to the bill**</p7></div></div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: auto; margin: 0; }
  body { margin: ${px(8)}; -webkit-print-color-adjust: exact; }

  /* ---- print.css (px values scaled, % values unchanged) ---- */
  .customerdetailsdiv { display: flex; line-height: ${tx(11.9)}; }
  .card { line-height: 0px; }
  p { font-size: ${px(14)}; }
  p6 {
    font-family: ${FONT};
    font-weight: ${FONT_WEIGHT}; font-style: normal; letter-spacing: ${tx(1.5)};
    font-size: ${tx(12)}; color: rgb(0, 0, 0);
  }
  p15 {
    font-family: ${FONT};
    font-weight: ${FONT_WEIGHT}; font-style: normal; letter-spacing: ${tx(1.5)};
    font-size: ${tx(13)}; color: rgb(0, 0, 0);
  }
  p7 {
    font-family: ${FONT};
    font-weight: ${FONT_WEIGHT}; font-style: normal; letter-spacing: ${tx(1.5)};
    font-size: ${tx(11)}; color: rgb(0, 0, 0);
  }
  .customerdetailsprint {
    line-height: 1px; font-family: 'Courier New', Courier, monospace;
    place-content: center; margin-left: ${px(10)}; margin-top: 3%; display: flex;
  }
  .customerdetailsprintsub {
    margin-top: 1%; font-family: 'Courier New', Courier, monospace;
    margin-left: 5%; line-height: ${px(5)};
  }
  .tbrow {
    font-family: 'Courier New', Courier, monospace;
    margin-left: 30%; color: rgb(0, 0, 0);
  }
  .tablestyle {
    font-family: 'Courier New', Courier, monospace;
    margin-left: 0; display: grid; place-items: center; justify-content: center;
  }
  .footer { line-height: 1px; margin-left: ${px(25)}; }

  /* Header: the old bill used line-height 0 here, so the address line printed
     on top of the title. Give the lines real height. */
  .head { line-height: ${tx(16)}; }
  .printmaindetails { padding-bottom: ${px(4)}; }
  .printmaindetails p {
    margin: ${px(3)} 0 0 0; line-height: ${tx(11)};
    font-family: ${FONT};
    font-weight: ${FONT_WEIGHT}; font-style: normal; letter-spacing: ${tx(1.5)}; font-size: ${tx(10)};
  }

  /* ---- MUI Table defaults, minus the parts that print badly ---- */
  .tcontainer { width: 100%; overflow: visible; } /* overflow:auto printed a scrollbar */
  .mtable { display: table; width: 100%; max-width: ${px(360)}; border-collapse: collapse; border-spacing: 0; }
  .mrow { display: table-row; color: inherit; vertical-align: middle; outline: 0; }
  .mcell {
    display: table-cell; vertical-align: inherit;
    border: 0; /* grey cell borders printed as dotted lines */
    text-align: left; padding: ${px(16)} 4px; /* tight sides so larger text fits */
    font-family: "Roboto", "Helvetica", "Arial", sans-serif;
    font-weight: 400; font-size: ${tx(14)}; line-height: 1.43;
    letter-spacing: 0.01071em; color: rgba(0, 0, 0, 0.87);
  }
  /* categoryName under the product name: slightly smaller than p6 (12) */
  .cat {
    font-family: ${FONT};
    font-weight: ${FONT_WEIGHT}; letter-spacing: ${tx(1.5)};
    font-size: ${tx(11)}; line-height: 1.43; color: rgb(0, 0, 0);
  }
  .mhead { font-weight: 500; line-height: ${tx(24)}; }
  .mright { text-align: right; }
</style>
</head>
<body>
<div class="main"><div class="card">
<center class="head"><p15>${esc(name)}</p15><br /><div class="printmaindetails"><p>${esc(address)}</p><p>Contact No: ${esc(phone)}</p><p>REG No: ${esc(regNo)}</p></div></center>
<center><div class="customerdetailsprint"><div><div class="customerdetailsdiv"><p6>Name: </p6><p6>${esc(order.customer_name)}</p6></div><br /><div class="customerdetailsdiv"><p6>Time: </p6><p6>${esc(time)}</p6></div><br /></div><div class="customerdetailsprintsub"><div class="customerdetailsdiv"><p6>Tel:</p6><p6>${esc(order.customer_phone)}</p6></div><div class="customerdetailsdiv"><p6>Date: </p6><p6>${esc(dateStr)}</p6></div></div></div></center>
<div class="tcontainer tablestyle">
<table class="mtable table" aria-label="simple table"><thead>${headRow}</thead><tbody>${itemRows}</tbody>${freeBody}</table>
<div class="tbrow">${totalRow("Total:", num(amountDue))}${totalRow("Payment:", num(amountPaid))}${totalRow("Balance:", num(Math.abs(Number(balance) || 0)))}</div>
</div><br /><br /><br /><br />
<div class="footer"><br /><br />
<div class="customerdetailsprintsub"><div class="customerdetailsdiv"><p7>Ship To: </p7><p7>${esc(order.location)}</p7></div></div>
<div class="customerdetailsprintsub"><div class="customerdetailsdiv"><p7>Vehicle Number: </p7><p7>${esc(order.vehicle_no)}</p7></div></div>
<div class="customerdetailsprintsub"><div class="customerdetailsdiv"><p7>Bill no: </p7><p7>${esc(order.bill_no ?? order.order_number)}</p7></div><br /><br /></div>
${forwardNote}
</div>
<center><p15>Thank You Come Again!</p15></center><br /><br /><br /><br /><br /><br /><br /><br /><br />
</div></div>
</body>
</html>`;
}
