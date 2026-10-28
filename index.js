
/* SPEECHLESS COUTURE
   Inventory and Stock Management Prototype
*/

const STORAGE_KEY = "speechlessCoutureData_v1";

const $ = (id) => document.getElementById(id);

const money = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

function emptyData() {
  return {
    products: [],
    receipts: [],
    sales: [],
    expenses: []
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyData();

    const data = JSON.parse(saved);

    return {
      products: Array.isArray(data.products) ? data.products : [],
      receipts: Array.isArray(data.receipts) ? data.receipts : [],
      sales: Array.isArray(data.sales) ? data.sales : [],
      expenses: Array.isArray(data.expenses) ? data.expenses : []
    };
  } catch (error) {
    console.error("Could not load saved data:", error);
    return emptyData();
  }
}

let data = loadData();
let currentRole = null;
let currentUsername = "";
let toastTimer;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    showToast("Could not save. Check your browser storage.");
    return false;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function emptyRow(message, columns) {
  return `<tr><td colspan="${columns}">
    <div class="empty-state">${escapeHTML(message)}</div>
  </td></tr>`;
}

/* DEMO LOGIN */

const demoAccounts = {
  director: "Director123!",
  staff: "Staff123!"
};

$("loginForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const username = $("loginUsername").value.trim();
  const role = $("loginRole").value;
  const password = $("loginPassword").value;

  if (!username || !demoAccounts[role] || password !== demoAccounts[role]) {
    $("loginMessage").textContent =
      "Incorrect demo password. Please check your details.";
    return;
  }

  currentRole = role;
  currentUsername = username;

  $("loginMessage").textContent = "";
  $("loggedInName").textContent = username;
  $("loggedInRole").textContent =
    role === "director" ? "Director" : "Staff";

  $("loginScreen").hidden = true;
  $("applicationShell").hidden = false;

  document.querySelectorAll(".director-only").forEach((link) => {
    link.hidden = role !== "director";
  });

  showPage("dashboard");
  renderAll();
  showToast(`Welcome, ${username}!`);
});

$("logoutButton").addEventListener("click", function () {
  currentRole = null;
  currentUsername = "";

  $("applicationShell").hidden = true;
  $("loginScreen").hidden = false;
  $("loginForm").reset();
  $("loginMessage").textContent = "";

  showToast("You have signed out.");
});

/* NAVIGATION */

function showPage(sectionId) {
  const section = $(sectionId);

  if (!section || section.hidden === undefined) return;

  if (sectionId === "reports" && currentRole !== "director") {
    showToast("Reports are available to the Director demo account.");
    return;
  }

  document.querySelectorAll(".page-section").forEach((page) => {
    page.hidden = page.id !== sectionId;
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.section === sectionId);
  });

  const activeLink = document.querySelector(
    `.nav-link[data-section="${sectionId}"]`
  );

  $("pageTitle").textContent = activeLink
    ? activeLink.querySelector("span").textContent
    : "Dashboard";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    showPage(this.dataset.section);
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", function (event) {
    event.preventDefault();
    showPage(this.dataset.go);
  });
});

/* PRODUCT INVENTORY */

$("productForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const name = $("productName").value.trim();
  const category = $("productCategory").value;
  const cost = Number($("productCost").value);
  const price = Number($("productPrice").value);
  const quantity = Number($("productQuantity").value);
  const threshold = Number($("productThreshold").value);

  if (!name || !category || cost < 0 || price < 0 ||
      quantity < 0 || threshold < 0 ||
      !Number.isInteger(quantity) || !Number.isInteger(threshold)) {
    showToast("Please enter valid product details.");
    return;
  }

  const product = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2),
    name,
    category,
    size: $("productSize").value,
    color: $("productColor").value.trim(),
    cost,
    price,
    quantity,
    threshold,
    createdAt: today()
  };

  data.products.unshift(product);

  if (!saveData()) {
    data.products.shift();
    return;
  }

  this.reset();
  $("productQuantity").value = 0;
  $("productThreshold").value = 5;

  renderAll();
  showToast("Product added successfully.");
});

$("inventorySearch").addEventListener("input", renderInventory);

function renderInventory() {
  const search = $("inventorySearch").value.trim().toLowerCase();

  const products = data.products.filter((product) => {
    const text = [
      product.name,
      product.category,
      product.size,
      product.color
    ].join(" ").toLowerCase();

    return text.includes(search);
  });

  $("inventoryCount").textContent = data.products.length;

  $("inventoryTable").innerHTML = products.length
    ? products.map((product) => {
        let status = "In stock";
        let statusClass = "in-stock";

        if (product.quantity <= 0) {
          status = "Out of stock";
          statusClass = "out-stock";
        } else if (product.quantity <= product.threshold) {
          status = "Low stock";
          statusClass = "";
        }

        return `
          <tr>
            <td><div class="table-product">
              <strong>${escapeHTML(product.name)}</strong>
              <small>${escapeHTML(product.id.slice(0, 8))}</small>
            </div></td>
            <td>${escapeHTML(product.category)}</td>
            <td>${escapeHTML(product.size)} / ${escapeHTML(product.color || "—")}</td>
            <td><strong>${product.quantity}</strong></td>
            <td>${money(product.cost)}</td>
            <td>${money(product.price)}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td><button class="action-button" data-delete-product="${escapeHTML(product.id)}">Delete</button></td>
          </tr>
        `;
      }).join("")
    : emptyRow(
        search ? "No matching products found." : "No products yet. Add your first product above.",
        8
      );
}

$("inventoryTable").addEventListener("click", function (event) {
  const button = event.target.closest("[data-delete-product]");
  if (!button) return;

  const id = button.dataset.deleteProduct;
  const product = data.products.find((item) => item.id === id);

  if (!product) return;

  const hasHistory =
    data.sales.some((sale) => sale.productId === id) ||
    data.receipts.some((receipt) => receipt.productId === id);

  if (hasHistory) {
    showToast("This product has transaction history and cannot be deleted.");
    return;
  }

  if (!confirm(`Delete "${product.name}" from inventory?`)) return;

  const previous = data.products;
  data.products = data.products.filter((item) => item.id !== id);

  if (!saveData()) {
    data.products = previous;
    return;
  }

  renderAll();
  showToast("Product deleted.");
});

/* RECEIVE STOCK */

$("stockDate").value = today();

function renderProductOptions() {
  const options = data.products
    .map((product) => `
      <option value="${escapeHTML(product.id)}">
        ${escapeHTML(product.name)} — ${product.quantity} in stock
      </option>
    `).join("");

  $("stockProduct").innerHTML =
    '<option value="">Choose a product</option>' + options;

  $("saleProduct").innerHTML =
    '<option value="">Choose a product</option>' +
    data.products.map((product) => `
      <option value="${escapeHTML(product.id)}" ${product.quantity <= 0 ? "disabled" : ""}>
        ${escapeHTML(product.name)} — ${product.quantity} in stock
      </option>
    `).join("");
}

$("stockForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const productId = $("stockProduct").value;
  const quantity = Number($("stockQuantity").value);
  const product = data.products.find((item) => item.id === productId);

  if (!product) {
    showToast("Please add or select a product first.");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Enter a valid quantity.");
    return;
  }

  const receipt = {
    id: String(Date.now()),
    productId,
    productName: product.name,
    quantity,
    supplier: $("stockSupplier").value.trim(),
    note: $("stockNote").value.trim(),
    date: $("stockDate").value
  };

  product.quantity += quantity;
  data.receipts.unshift(receipt);

  if (!saveData()) {
    product.quantity -= quantity;
    data.receipts.shift();
    return;
  }

  this.reset();
  $("stockDate").value = today();

  renderAll();
  showToast("Stock receipt recorded successfully.");
});

function renderStock() {
  $("stockTable").innerHTML = data.receipts.length
    ? data.receipts.map((receipt) => `
        <tr>
          <td><strong>${escapeHTML(receipt.productName)}</strong></td>
          <td>${receipt.quantity}</td>
          <td>${escapeHTML(receipt.supplier || "—")}</td>
          <td>${escapeHTML(receipt.note || "—")}</td>
          <td>${escapeHTML(receipt.date)}</td>
        </tr>
      `).join("")
    : emptyRow("No stock receipts recorded yet.", 5);
}

/* SALES */

$("saleDate").value = today();

function updateSalePreview() {
  const product = data.products.find(
    (item) => item.id === $("saleProduct").value
  );

  const quantity = Math.max(0, Number($("saleQuantity").value) || 0);
  const total = product ? product.price * quantity : 0;

  $("saleTotalPreview").textContent = money(total);
}

$("saleProduct").addEventListener("change", updateSalePreview);
$("saleQuantity").addEventListener("input", updateSalePreview);

$("saleForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const productId = $("saleProduct").value;
  const quantity = Number($("saleQuantity").value);
  const product = data.products.find((item) => item.id === productId);

  if (!product) {
    showToast("Please select a product.");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Enter a valid sale quantity.");
    return;
  }

  if (quantity > product.quantity) {
    showToast(`Only ${product.quantity} unit(s) are available.`);
    return;
  }

  const sale = {
    id: String(Date.now()),
    productId,
    productName: product.name,
    quantity,
    unitPrice: product.price,
    unitCost: product.cost,
    total: product.price * quantity,
    customer: $("saleCustomer").value.trim(),
    payment: $("salePayment").value,
    date: $("saleDate").value
  };

  product.quantity -= quantity;
  data.sales.unshift(sale);

  if (!saveData()) {
    product.quantity += quantity;
    data.sales.shift();
    return;
  }

  this.reset();
  $("saleDate").value = today();
  $("saleQuantity").value = 1;

  renderAll();
  showToast("Sale recorded and stock updated.");
});

function renderSales() {
  $("salesTable").innerHTML = data.sales.length
    ? data.sales.map((sale) => `
        <tr>
          <td><strong>${escapeHTML(sale.productName)}</strong></td>
          <td>${escapeHTML(sale.customer || "Walk-in customer")}</td>
          <td>${sale.quantity}</td>
          <td>${money(sale.total)}</td>
          <td>${escapeHTML(sale.payment)}</td>
          <td>${escapeHTML(sale.date)}</td>
        </tr>
      `).join("")
    : emptyRow("No sales recorded yet.", 6);
}

/* EXPENSES */

$("expenseDate").value = today();

$("expenseForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const description = $("expenseDescription").value.trim();
  const category = $("expenseCategory").value;
  const amount = Number($("expenseAmount").value);
  const date = $("expenseDate").value;

  if (!description || !category || !Number.isFinite(amount) || amount <= 0 || !date) {
    showToast("Please enter valid expense details.");
    return;
  }

  const expense = {
    id: String(Date.now()),
    description,
    category,
    amount,
    date
  };

  data.expenses.unshift(expense);

  if (!saveData()) {
    data.expenses.shift();
    return;
  }

  this.reset();
  $("expenseDate").value = today();

  renderAll();
  showToast("Expense recorded successfully.");
});

$("expensesTable").addEventListener("click", function (event) {
  const button = event.target.closest("[data-delete-expense]");
  if (!button) return;

  const id = button.dataset.deleteExpense;
  const expense = data.expenses.find((item) => item.id === id);
  if (!expense) return;

  if (!confirm(`Delete expense "${expense.description}"?`)) return;

  const previous = data.expenses;
  data.expenses = data.expenses.filter((item) => item.id !== id);

  if (!saveData()) {
    data.expenses = previous;
    return;
  }

  renderAll();
  showToast("Expense deleted.");
});

function renderExpenses() {
  $("expensesTable").innerHTML = data.expenses.length
    ? data.expenses.map((expense) => `
        <tr>
          <td><strong>${escapeHTML(expense.description)}</strong></td>
          <td>${escapeHTML(expense.category)}</td>
          <td>${money(expense.amount)}</td>
          <td>${escapeHTML(expense.date)}</td>
          <td><button class="action-button" data-delete-expense="${escapeHTML(expense.id)}">Delete</button></td>
        </tr>
      `).join("")
    : emptyRow("No expenses recorded yet.", 5);
}

/* DASHBOARD */

function renderDashboard() {
  const totalUnits = data.products.reduce(
    (sum, product) => sum + product.quantity, 0
  );

  const stockValue = data.products.reduce(
    (sum, product) => sum + product.quantity * product.cost, 0
  );

  const totalSales = data.sales.reduce(
    (sum, sale) => sum + sale.total, 0
  );

  $("statProducts").textContent = data.products.length;
  $("statUnits").textContent = totalUnits.toLocaleString("en-NG");
  $("statValue").textContent = money(stockValue);
  $("statSales").textContent = money(totalSales);

  const lowStock = data.products.filter(
    (product) => product.quantity <= product.threshold
  );

  $("lowStockList").innerHTML = lowStock.length
    ? lowStock.slice(0, 6).map((product) => `
        <div class="low-stock-item">
          <div>
            <strong>${escapeHTML(product.name)}</strong>
            <small>${escapeHTML(product.category)}</small>
          </div>
          <span class="stock-badge">${product.quantity} left</span>
        </div>
      `).join("")
    : '<div class="empty-state">All good! No low-stock alerts at the moment.</div>';

  const transactions = [
    ...data.sales.map((sale) => ({
      type: "Sale",
      details: `${sale.quantity} × ${sale.productName}`,
      amount: sale.total,
      date: sale.date,
      sort: sale.id
    })),
    ...data.receipts.map((receipt) => ({
      type: "Stock received",
      details: `${receipt.quantity} × ${receipt.productName}`,
      amount: null,
      date: receipt.date,
      sort: receipt.id
    })),
    ...data.expenses.map((expense) => ({
      type: "Expense",
      details: expense.description,
      amount: -expense.amount,
      date: expense.date,
      sort: expense.id
    }))
  ].sort((a, b) => {
    const dateCompare = String(b.date).localeCompare(String(a.date));
    return dateCompare || String(b.sort).localeCompare(String(a.sort));
  }).slice(0, 6);

  $("recentTransactions").innerHTML = transactions.length
    ? transactions.map((transaction) => `
        <tr>
          <td><strong>${escapeHTML(transaction.type)}</strong></td>
          <td>${escapeHTML(transaction.details)}</td>
          <td>${transaction.amount === null ? "—" : money(transaction.amount)}</td>
          <td>${escapeHTML(transaction.date)}</td>
        </tr>
      `).join("")
    : emptyRow("Your latest transactions will appear here.", 4);
}

/* REPORTS */

function renderReports() {
  const totalSales = data.sales.reduce((sum, sale) => sum + sale.total, 0);
  const costOfGoods = data.sales.reduce(
    (sum, sale) => sum + sale.unitCost * sale.quantity, 0
  );
  const totalExpenses = data.expenses.reduce(
    (sum, expense) => sum + expense.amount, 0
  );
  const grossProfit = totalSales - costOfGoods;

  const units = data.products.reduce(
    (sum, product) => sum + product.quantity, 0
  );

  const inventoryValue = data.products.reduce(
    (sum, product) => sum + product.quantity * product.cost, 0
  );

  $("reportSales").textContent = money(totalSales);
  $("reportExpenses").textContent = money(totalExpenses);
  $("reportProfit").textContent = money(grossProfit);

  $("reportSummary").innerHTML = `
    <div class="summary-row"><span>Total products</span><strong>${data.products.length}</strong></div>
    <div class="summary-row"><span>Units remaining in stock</span><strong>${units.toLocaleString("en-NG")}</strong></div>
    <div class="summary-row"><span>Current inventory cost value</span><strong>${money(inventoryValue)}</strong></div>
    <div class="summary-row"><span>Total recorded sales</span><strong>${money(totalSales)}</strong></div>
    <div class="summary-row"><span>Estimated cost of goods sold</span><strong>${money(costOfGoods)}</strong></div>
    <div class="summary-row"><span>Estimated gross profit</span><strong>${money(grossProfit)}</strong></div>
    <div class="summary-row"><span>Recorded operating expenses</span><strong>${money(totalExpenses)}</strong></div>
    <div class="summary-row"><span>Estimated balance after expenses</span><strong>${money(grossProfit - totalExpenses)}</strong></div>
  `;
}

/* EXPORT REPORTS AS CSV */

$("exportButton").addEventListener("click", function () {
  if (currentRole !== "director") {
    showToast("Only the Director demo account can export reports.");
    return;
  }

  const rows = [
    ["Type", "Item", "Category / Details", "Quantity", "Amount (NGN)", "Date"],
    ...data.products.map((p) => [
      "Product", p.name, p.category, p.quantity,
      p.quantity * p.cost, p.createdAt
    ]),
    ...data.sales.map((s) => [
      "Sale", s.productName, s.payment, s.quantity, s.total, s.date
    ]),
    ...data.receipts.map((r) => [
      "Stock Receipt", r.productName, r.supplier, r.quantity, "", r.date
    ]),
    ...data.expenses.map((e) => [
      "Expense", e.description, e.category, "", e.amount, e.date
    ])
  ];

  const csv = rows.map((row) =>
    row.map((cell) => {
      let value = String(cell ?? "");
      if (/^[=+\-@]/.test(value)) value = "'" + value;
      return `"${value.replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "speechless-couture-report-" + today() + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showToast("Your CSV report has been exported.");
});

/* REFRESH ALL SCREENS */

function renderAll() {
  renderProductOptions();
  renderInventory();
  renderStock();
  renderSales();
  renderExpenses();
  renderDashboard();
  renderReports();
  updateSalePreview();
}

/* INITIAL SETUP */

$("todayDate").textContent = new Date().toLocaleDateString("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

$("footerYear").textContent = new Date().getFullYear();

renderAll();
