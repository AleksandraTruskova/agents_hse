import {
  FILTERS,
  addTask,
  computeStats,
  createInitialTasks,
  filterTasks,
  removeTask,
  toggleTask,
  validateTaskInput,
} from './domain.mjs';

const STORAGE_KEY = 'mini-tracker-tasks';

const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const hoursInput = document.getElementById('task-hours');
const errorTitle = document.getElementById('error-title');
const errorHours = document.getElementById('error-hours');
const totalHoursEl = document.getElementById('total-hours');
const doneHoursEl = document.getElementById('done-hours');
const progressValueEl = document.getElementById('progress-value');
const progressBarEl = document.getElementById('progress-bar');
const progressFillEl = document.getElementById('progress-fill');
const listEl = document.getElementById('task-list');
const emptyStateEl = document.getElementById('empty-state');
const storageNoticeEl = document.getElementById('storage-notice');
const filterButtons = document.querySelectorAll('.filter-btn');

let tasks = loadTasks();
let currentFilter = FILTERS.ALL;
let storageAvailable = true;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return createInitialTasks();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return createInitialTasks();
    }
    return parsed.filter(
      (task) =>
        task &&
        typeof task.title === 'string' &&
        Number.isFinite(task.hours) &&
        typeof task.done === 'boolean' &&
        Number.isInteger(task.id)
    );
  } catch {
    storageAvailable = false;
    showStorageNotice();
    return createInitialTasks();
  }
}

function saveTasks() {
  if (!storageAvailable) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    storageAvailable = false;
    showStorageNotice();
  }
}

function showStorageNotice() {
  storageNoticeEl.textContent =
    'Хранилище недоступно: задачи сохраняются только в памяти страницы и пропадут после закрытия.';
  storageNoticeEl.hidden = false;
}

function render() {
  const stats = computeStats(tasks);
  totalHoursEl.textContent = String(stats.total);
  doneHoursEl.textContent = String(stats.done);
  progressValueEl.textContent = String(stats.progress);
  progressBarEl.setAttribute('aria-valuenow', String(stats.progress));
  progressFillEl.style.width = `${stats.progress}%`;

  filterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === currentFilter));
  });

  listEl.replaceChildren();
  const visible = filterTasks(tasks, currentFilter);
  for (const task of visible) {
    listEl.appendChild(renderTaskItem(task));
  }
  emptyStateEl.hidden = visible.length > 0;
}

function renderTaskItem(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.done ? ' done' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.id = `task-done-${task.id}`;
  checkbox.setAttribute('aria-label', `Отметить «${task.title}» как выполненную`);

  const title = document.createElement('label');
  title.className = 'task-title';
  title.htmlFor = checkbox.id;
  title.textContent = task.title;

  const hours = document.createElement('span');
  hours.className = 'task-hours';
  hours.textContent = `${task.hours} ч`;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn-delete';
  deleteButton.textContent = 'Удалить';
  deleteButton.setAttribute('aria-label', `Удалить задачу «${task.title}»`);

  checkbox.addEventListener('change', () => {
    tasks = toggleTask(tasks, task.id);
    saveTasks();
    render();
  });

  deleteButton.addEventListener('click', () => {
    tasks = removeTask(tasks, task.id);
    saveTasks();
    render();
  });

  li.append(checkbox, title, hours, deleteButton);
  return li;
}

function showFieldError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function clearFieldErrors() {
  errorTitle.hidden = true;
  errorTitle.textContent = '';
  errorHours.hidden = true;
  errorHours.textContent = '';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearFieldErrors();

  const result = validateTaskInput({
    title: titleInput.value,
    hours: hoursInput.value,
  });

  if (!result.valid) {
    // Значения формы не трогаем — пользователь исправляет то, что ввёл.
    if (result.errors.title) {
      showFieldError(errorTitle, result.errors.title);
    }
    if (result.errors.hours) {
      showFieldError(errorHours, result.errors.hours);
    }
    return;
  }

  tasks = addTask(tasks, result.value);
  saveTasks();
  titleInput.value = '';
  hoursInput.value = '';
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

render();
