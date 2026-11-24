// Чистая доменная логика мини-трекера: данные, валидация, расчёты, фильтр.
// Никакого DOM и хранилищ — только функции над задачами.

export const HOURS_MIN = 0.5;
export const HOURS_MAX = 24;
export const HOURS_STEP = 0.5;

export const FILTERS = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  DONE: 'done',
});

export function createInitialTasks() {
  return [
    { id: 1, title: 'Чтение', hours: 2, done: true },
    { id: 2, title: 'Практика', hours: 4, done: false },
    { id: 3, title: 'Повторение', hours: 2, done: false },
  ];
}

function nextId(tasks) {
  return tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
}

// Валидация сырых строк из формы.
// Возвращает { valid, errors: { title?, hours? }, value: { title, hours } }.
// value заполнен только при valid === true.
// Пустая строка часов — ошибка «пусто», а не ноль.
export function validateTaskInput({ title, hours }) {
  const errors = {};

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  if (trimmedTitle === '') {
    errors.title = 'Название не должно быть пустым.';
  }

  let parsedHours = null;
  const rawHours = typeof hours === 'string' ? hours.trim() : hours;
  if (rawHours === '' || rawHours === null || rawHours === undefined) {
    errors.hours = 'Укажите часы (0,5–24).';
  } else {
    parsedHours = Number(rawHours);
    if (!Number.isFinite(parsedHours)) {
      errors.hours = 'Часы должны быть числом.';
    } else if (parsedHours < HOURS_MIN || parsedHours > HOURS_MAX) {
      errors.hours = `Часы должны быть от ${HOURS_MIN} до ${HOURS_MAX}.`;
    } else if (!Number.isInteger(parsedHours / HOURS_STEP)) {
      errors.hours = `Часы должны быть с шагом ${HOURS_STEP}.`;
    }
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    value: valid ? { title: trimmedTitle, hours: parsedHours } : null,
  };
}

export function addTask(tasks, { title, hours }) {
  return [...tasks, { id: nextId(tasks), title: title.trim(), hours, done: false }];
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function toggleTask(tasks, id) {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
}

// Итоги считаются по всем задачам, независимо от фильтра.
export function computeStats(tasks) {
  const total = tasks.reduce((sum, task) => sum + task.hours, 0);
  const done = tasks.reduce((sum, task) => (task.done ? sum + task.hours : sum), 0);
  const progress = total > 0 ? Math.round((100 * done) / total) : 0;
  return { total, done, progress };
}

// Фильтр влияет только на видимый список.
export function filterTasks(tasks, filter) {
  switch (filter) {
    case FILTERS.ACTIVE:
      return tasks.filter((task) => !task.done);
    case FILTERS.DONE:
      return tasks.filter((task) => task.done);
    case FILTERS.ALL:
    default:
      return tasks.slice();
  }
}
