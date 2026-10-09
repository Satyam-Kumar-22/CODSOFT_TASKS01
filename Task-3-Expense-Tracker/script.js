
const form = document.getElementById("transactionForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const submitBtn = document.getElementById("submitBtn");
const cancelEdit = document.getElementById("cancelEdit");
const formMessage = document.getElementById("formMessage");
const transactionList = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");

const STORAGE_KEY = "spendwise_transactions_v1";
let transactions = loadTransactions();
let editingId = null;

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      (item.type === "income" || item.type === "expense") &&
      Number.isFinite(Number(item.amount)) &&
      Number(item.amount) > 0 &&
      typeof item.date === "string"
    );
  } catch {
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch {
    formMessage.textContent =
      "Unable to save data. Check your browser storage settings.";
    return false;
  }
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(16).slice(2);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function updateSummary() {
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = income - expenses;
  const total = income + expenses;

  document.getElementById("totalIncome").textContent = money(income);
  document.getElementById("totalExpenses").textContent = money(expenses);
  document.getElementById("currentBalance").textContent = money(balance);
  document.getElementById("overviewIncome").textContent = money(income);
  document.getElementById("overviewExpenses").textContent = money(expenses);

  document.getElementById("incomeProgress").style.width =
    total ? `${(income / total) * 100}%` : "0%";

  document.getElementById("expenseProgress").style.width =
    total ? `${(expenses / total) * 100}%` : "0%";

  const balanceNote = document.getElementById("balanceNote");

  if (transactions.length === 0) {
    balanceNote.textContent =
      "Add transactions to see your financial summary.";
  } else if (balance > 0) {
    balanceNote.textContent = `You have ${money(balance)} remaining.`;
  } else if (balance < 0) {
    balanceNote.textContent = `Your expenses exceed income by ${money(Math.abs(balance))}.`;
  } else {
    balanceNote.textContent = "Your income and expenses are balanced.";
  }

  document.getElementById("transactionCount").textContent =
    `${transactions.length} record${transactions.length === 1 ? "" : "s"}`;
}

function renderTransactions() {
  const search = document.getElementById("search")
    .value.trim().toLowerCase();

  const typeFilter = document.getElementById("typeFilter").value;
  const categoryFilter = document.getElementById("categoryFilter").value;

  const filtered = transactions
    .filter(t => {
      const matchesSearch =
        t.title.toLowerCase().includes(search) ||
        (t.category || "Other").toLowerCase().includes(search);

      const matchesType =
        typeFilter === "all" || t.type === typeFilter;

      const matchesCategory =
        categoryFilter === "all" || t.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  transactionList.innerHTML = filtered.map(t => `
    <tr>
      <td>${escapeHTML(t.title)}</td>
      <td><span class="category-badge">${escapeHTML(t.category || "Other")}</span></td>
      <td>${escapeHTML(t.date)}</td>
      <td class="amount-cell ${t.type === "income" ? "income-amount" : "expense-amount"}">
        ${t.type === "income" ? "+" : "−"}${money(t.amount)}
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" data-action="edit"
            data-id="${escapeHTML(t.id)}">Edit</button>
          <button class="action-btn" data-action="delete"
            data-id="${escapeHTML(t.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  emptyState.classList.toggle("hidden", filtered.length > 0);

  if (filtered.length === 0) {
    emptyState.textContent = transactions.length === 0
      ? "No transactions yet. Add your first transaction above."
      : "No transactions match your search or filters.";
  }

  updateSummary();
}

function resetForm() {
  form.reset();
  editingId = null;
  dateInput.value = new Date().toISOString().slice(0, 10);
  submitBtn.textContent = "+ Add Transaction";
  document.getElementById("formTitle").textContent = "Add Transaction";
  cancelEdit.classList.add("hidden");
  formMessage.textContent = "";
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (!title) {
    formMessage.textContent = "Please enter a transaction name.";
    titleInput.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
    formMessage.textContent = "Enter an amount greater than 0 and within the allowed limit.";
    amountInput.focus();
    return;
  }

  if (!date) {
    formMessage.textContent = "Please select a transaction date.";
    dateInput.focus();
    return;
  }

  const record = {
    id: editingId || makeId(),
    title,
    amount: Math.round(amount * 100) / 100,
    type: typeInput.value,
    category: categoryInput.value,
    date
  };

  if (editingId) {
    transactions = transactions.map(t =>
      t.id === editingId ? record : t
    );
  } else {
    transactions.push(record);
  }

  if (!saveTransactions()) return;

  resetForm();
  renderTransactions();
});

transactionList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  if (button.dataset.action === "edit") {
    editingId = transaction.id;
    titleInput.value = transaction.title;
    amountInput.value = transaction.amount;
    typeInput.value = transaction.type;
    categoryInput.value = transaction.category || "Other";
    dateInput.value = transaction.date;

    submitBtn.textContent = "Save Changes";
    document.getElementById("formTitle").textContent = "Edit Transaction";
    cancelEdit.classList.remove("hidden");
    formMessage.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    titleInput.focus();
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${transaction.title}"?`)) return;

    transactions = transactions.filter(t => t.id !== id);

    if (!saveTransactions()) return;
    if (editingId === id) resetForm();

    renderTransactions();
  }
});

cancelEdit.addEventListener("click", resetForm);

document.getElementById("search").addEventListener("input", renderTransactions);
document.getElementById("typeFilter").addEventListener("change", renderTransactions);
document.getElementById("categoryFilter").addEventListener("change", renderTransactions);

document.getElementById("clearAll").addEventListener("click", () => {
  if (transactions.length === 0) {
    alert("There are no transactions to clear.");
    return;
  }

  if (!confirm("Delete all transactions? This cannot be undone.")) return;

  transactions = [];

  if (!saveTransactions()) return;

  resetForm();
  renderTransactions();
});

document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

dateInput.value = new Date().toISOString().slice(0, 10);

renderTransactions();
