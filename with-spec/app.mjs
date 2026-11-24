import {
  FILTERS,
  addTask,
  computeTotals,
  createTaskStore,
  filterTasks,
  loadInitialTasks,
  removeTask,
  toggleTask,
  validateInput,
} from './domain.mjs';

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const hoursInput = document.querySelector('#task-hours');
const titleError = document.querySelector('#title-error');
const hoursError = document.querySelector('#hours-error');
const filterSelect = document.querySelector('#filter');
const list = document.querySelector('#task-list');
const totalsEl = document.querySelector('#totals');
const storageWarning = document.querySelector('#storage-warning');

const store = createTaskStore();
const state = {
  tasks: loadInitialTasks(store),
  filter: FILTERS.ALL,
};

function showStorageWarning() {
  storageWarning.hidden = false;
}

if (!store.isAvailable()) {
  showStorageWarning();
}

function save() {
  store.save(state.tasks);
  if (!store.isAvailable()) {
    showStorageWarning();
  }
}

function renderTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'task-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.dataset.action = 'toggle';
  checkbox.dataset.id = task.id;
  checkbox.setAttribute('aria-label', `Отметить «${task.title}» готовой`);

  const title = document.createElement('span');
  title.className = task.done ? 'task-title done' : 'task-title';
  title.textContent = `${task.title} (${task.hours} ч)`;

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.dataset.action = 'remove';
  removeButton.dataset.id = task.id;
  removeButton.textContent = 'Удалить';
  removeButton.setAttribute('aria-label', `Удалить задачу «${task.title}»`);

  li.append(checkbox, title, removeButton);
  return li;
}

function render() {
  const visible = filterTasks(state.tasks, state.filter);
  list.replaceChildren(...visible.map(renderTaskItem));
  const { total, done, progress } = computeTotals(state.tasks);
  totalsEl.textContent = `Выполнено ${done} из ${total} ч · Прогресс ${progress}%`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  titleError.textContent = '';
  hoursError.textContent = '';
  const result = validateInput({ title: titleInput.value, hours: hoursInput.value });
  if (!result.ok) {
    if (result.errors.title) titleError.textContent = result.errors.title;
    if (result.errors.hours) hoursError.textContent = result.errors.hours;
    return; // значения полей не сбрасываем — сохраняем для исправления
  }
  state.tasks = addTask(state.tasks, result.values.title, result.values.hours);
  save();
  form.reset();
  render();
});

list.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const { action, id } = target.dataset;
  if (!action || !id) return;
  state.tasks = action === 'toggle' ? toggleTask(state.tasks, id) : removeTask(state.tasks, id);
  save();
  render();
});

filterSelect.addEventListener('change', () => {
  state.filter = filterSelect.value;
  render();
});

render();
