
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const categoryInput = document.getElementById("category");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("dueDate");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const formMessage = document.getElementById("formMessage");
const submitBtn = document.getElementById("submitBtn");
const cancelEdit = document.getElementById("cancelEdit");

const STORAGE_KEY = "taskflow_tasks_v1";
const THEME_KEY = "taskflow_dark_mode";

let tasks = loadTasks();
let editingId = null;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter(t =>
          t && typeof t.id === "string" &&
          typeof t.title === "string" &&
          typeof t.completed === "boolean"
        )
      : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    formMessage.textContent = "Could not save tasks in this browser.";
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

function updateStats() {
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent =
    tasks.filter(task => !task.completed).length;
  document.getElementById("completedCount").textContent =
    tasks.filter(task => task.completed).length;
}

function renderTasks() {
  const search = document.getElementById("searchInput")
    .value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const category = document.getElementById("categoryFilter").value;

  const filtered = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search);
    const matchesStatus =
      status === "all" ||
      (status === "completed" && task.completed) ||
      (status === "pending" && !task.completed);
    const matchesCategory =
      category === "all" || task.category === category;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  taskList.innerHTML = filtered.map(task => {
    const priorityClass = task.priority === "High"
      ? "priority-high"
      : task.priority === "Low"
        ? "priority-low"
        : "";

    return `
      <article class="task-item ${task.completed ? "completed" : ""}">
        <input class="task-check" type="checkbox"
          aria-label="Mark ${escapeHTML(task.title)} completed"
          data-action="toggle" data-id="${escapeHTML(task.id)}"
          ${task.completed ? "checked" : ""}>

        <div class="task-info">
          <h3>${escapeHTML(task.title)}</h3>
          <div class="badges">
            <span class="badge">${escapeHTML(task.category || "Personal")}</span>
            <span class="badge ${priorityClass}">
              ${escapeHTML(task.priority || "Medium")} priority
            </span>
          </div>
          <p>
            ${task.dueDate
              ? "Due: " + escapeHTML(task.dueDate)
              : "No due date"}
          </p>
        </div>

        <div class="task-actions">
          <button class="icon-btn" data-action="edit"
            data-id="${escapeHTML(task.id)}">Edit</button>
          <button class="icon-btn" data-action="delete"
            data-id="${escapeHTML(task.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  emptyState.classList.toggle("hidden", filtered.length > 0);
  emptyState.textContent = tasks.length === 0
    ? "No tasks yet. Add your first task above!"
    : "No tasks match your search or filters.";

  updateStats();
}

function resetForm() {
  taskForm.reset();
  editingId = null;
  submitBtn.textContent = "+ Add Task";
  document.getElementById("formTitle").textContent = "Add a New Task";
  cancelEdit.classList.add("hidden");
  formMessage.textContent = "";
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskInput.value.trim();

  if (!title) {
    formMessage.textContent = "Please enter a task name.";
    taskInput.focus();
    return;
  }

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);
    if (task) {
      task.title = title;
      task.category = categoryInput.value;
      task.priority = priorityInput.value;
      task.dueDate = dueDateInput.value;
    }
  } else {
    tasks.unshift({
      id: makeId(),
      title,
      category: categoryInput.value,
      priority: priorityInput.value,
      dueDate: dueDateInput.value,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  saveTasks();
  resetForm();
  renderTasks();
});

taskList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const task = tasks.find(item => item.id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === "edit") {
    editingId = task.id;
    taskInput.value = task.title;
    categoryInput.value = task.category || "Personal";
    priorityInput.value = task.priority || "Medium";
    dueDateInput.value = task.dueDate || "";

    submitBtn.textContent = "Save Changes";
    document.getElementById("formTitle").textContent = "Edit Task";
    cancelEdit.classList.remove("hidden");
    formMessage.textContent = "";
    taskInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${task.title}"?`)) return;

    tasks = tasks.filter(item => item.id !== task.id);
    if (editingId === task.id) resetForm();
    saveTasks();
    renderTasks();
  }
});

taskList.addEventListener("change", event => {
  const checkbox = event.target.closest('input[data-action="toggle"]');
  if (!checkbox) return;

  const task = tasks.find(item => item.id === checkbox.dataset.id);
  if (!task) return;

  task.completed = checkbox.checked;
  saveTasks();
  renderTasks();
});

cancelEdit.addEventListener("click", resetForm);

document.getElementById("searchInput").addEventListener("input", renderTasks);
document.getElementById("statusFilter").addEventListener("change", renderTasks);
document.getElementById("categoryFilter").addEventListener("change", renderTasks);

document.getElementById("clearCompleted").addEventListener("click", () => {
  const count = tasks.filter(task => task.completed).length;
  if (!count) {
    alert("There are no completed tasks to clear.");
    return;
  }

  if (!confirm(`Delete all ${count} completed task(s)?`)) return;

  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
});

const themeToggle = document.getElementById("themeToggle");

function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "☀ Light" : "☾ Theme";
}

applyTheme(localStorage.getItem(THEME_KEY) === "true");

themeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark);
  localStorage.setItem(THEME_KEY, String(isDark));
});

const today = new Date();
document.getElementById("dayName").textContent =
  today.toLocaleDateString("en-US", { weekday: "long" });
document.getElementById("todayDate").textContent =
  today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

renderTasks();
