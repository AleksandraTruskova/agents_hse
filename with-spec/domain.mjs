// Доменная логика мини-трекера учебных задач. Не зависит от DOM.

export const STORAGE_KEY = 'study-tasks-v1';

export const FILTERS = Object.freeze({ ALL: 'all', ACTIVE: 'active' });

const STARTER_DEFS = Object.freeze([
  Object.freeze({ title: 'Чтение', hours: 2, done: true }),
  Object.freeze({ title: 'Практика', hours: 4, done: false }),
  Object.freeze({ title: 'Повторение', hours: 2, done: false }),
]);

let idCounter = 0;

export function nextId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  idCounter += 1;
  return `task-${Date.now()}-${idCounter}`;
}

export function createTask(title, hours, done = false) {
  return { id: nextId(), title, hours, done };
}

export function starterTasks() {
  return STARTER_DEFS.map((def) => createTask(def.title, def.hours, def.done));
}

export function addTask(tasks, title, hours) {
  return [...tasks, createTask(title, hours)];
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function toggleTask(tasks, id) {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
}

export function validateInput({ title, hours }) {
  const errors = {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (cleanTitle === '') {
    errors.title = 'Введите название задачи.';
  }

  let parsedHours = null;
  const rawHours = typeof hours === 'string' ? hours.trim() : '';
  if (rawHours === '') {
    errors.hours = 'Укажите часы от 0,5 до 24. Пустое значение не подходит.';
  } else {
    const value = Number(rawHours);
    if (!Number.isFinite(value)) {
      errors.hours = 'Часы должны быть числом.';
    } else if (value < 0.5 || value > 24) {
      errors.hours = 'Часы должны быть от 0,5 до 24.';
    } else if (!Number.isInteger(value * 2)) {
      errors.hours = 'Часы должны быть кратны 0,5 (например, 1, 1,5, 2).';
    } else {
      parsedHours = value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, values: { title: cleanTitle, hours: parsedHours } };
}

export function computeTotals(tasks) {
  let total = 0;
  let done = 0;
  for (const task of tasks) {
    total += task.hours;
    if (task.done) done += task.hours;
  }
  const progress = total > 0 ? Math.round((100 * done) / total) : 0;
  return { total, done, progress };
}

export function filterTasks(tasks, filter) {
  if (filter === FILTERS.ACTIVE) {
    return tasks.filter((task) => !task.done);
  }
  return tasks.slice();
}

function normalizeTasks(value) {
  if (!Array.isArray(value)) return null;
  const cleaned = [];
  for (const item of value) {
    if (
      item !== null &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      Number.isFinite(item.hours) &&
      typeof item.done === 'boolean'
    ) {
      cleaned.push({ id: item.id, title: item.title, hours: item.hours, done: item.done });
    }
  }
  return cleaned;
}

// Репозиторий хранилища: localStorage при доступности, иначе память.
// backend — необязательная реализация {getItem, setItem, removeItem} (для тестов).
export function createTaskStore(backend) {
  const storage =
    backend !== undefined
      ? backend
      : typeof globalThis.localStorage !== 'undefined'
        ? globalThis.localStorage
        : null;
  const probeKey = `${STORAGE_KEY}:probe`;
  let available = false;
  let memory = null;

  if (storage) {
    try {
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      available = true;
    } catch {
      available = false;
    }
  }

  function load() {
    if (available) {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw !== null && raw !== undefined) {
          const parsed = normalizeTasks(JSON.parse(raw));
          if (parsed !== null) return parsed;
        }
      } catch {
        // повреждённые данные — считаем, что ничего не сохранено
      }
    }
    return memory;
  }

  function save(tasks) {
    memory = normalizeTasks(tasks) ?? [];
    if (available) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(memory));
      } catch {
        available = false;
      }
    }
  }

  return {
    isAvailable: () => available,
    load,
    save,
  };
}

// null из load() означает «ничего не сохранено» — тогда стартовые задачи.
// Пустой массив — сохранённое пустое состояние, его сохраняем как есть.
export function loadInitialTasks(store) {
  const saved = store.load();
  return saved !== null ? saved : starterTasks();
}
