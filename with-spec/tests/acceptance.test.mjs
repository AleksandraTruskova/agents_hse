import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addTask,
  computeTotals,
  createTaskStore,
  filterTasks,
  FILTERS,
  loadInitialTasks,
  removeTask,
  starterTasks,
  toggleTask,
  validateInput,
} from '../domain.mjs';

// Имитация localStorage: один экземпляр = одно хранилище.
function memoryBackend() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function freshStore() {
  return createTaskStore(memoryBackend());
}

test('T1: исходный пример — 3 задачи, всего 8 ч, выполнено 2 ч, прогресс 25% по часам', () => {
  const tasks = loadInitialTasks(freshStore());
  assert.equal(tasks.length, 3);
  assert.deepEqual(
    tasks.map((t) => [t.title, t.hours, t.done]),
    [
      ['Чтение', 2, true],
      ['Практика', 4, false],
      ['Повторение', 2, false],
    ],
  );
  assert.deepEqual(computeTotals(tasks), { total: 8, done: 2, progress: 25 });
});

test('T2: «Практика» отмечена готовой — 6/8 ч, 75%, данные изменились', () => {
  const tasks = starterTasks();
  const practice = tasks.find((t) => t.title === 'Практика');
  const updated = toggleTask(tasks, practice.id);
  assert.equal(updated.find((t) => t.id === practice.id).done, true);
  assert.equal(tasks.find((t) => t.id === practice.id).done, false); // исходный массив не мутирован
  assert.deepEqual(computeTotals(updated), { total: 8, done: 6, progress: 75 });
});

test('T3: фильтр «активные» меняет только список, прогресс остаётся 25%', () => {
  const tasks = starterTasks();
  const visible = filterTasks(tasks, FILTERS.ACTIVE);
  assert.deepEqual(
    visible.map((t) => t.title),
    ['Практика', 'Повторение'],
  );
  assert.deepEqual(computeTotals(tasks), { total: 8, done: 2, progress: 25 });
});

test('T4: некорректный ввод отклоняется с ошибкой по нужному полю', () => {
  const cases = [
    [{ title: '', hours: '2' }, 'title'],
    [{ title: '   ', hours: '2' }, 'title'],
    [{ title: 'Чтение', hours: '' }, 'hours'],
    [{ title: 'Чтение', hours: '   ' }, 'hours'],
    [{ title: 'Чтение', hours: '-2' }, 'hours'],
    [{ title: 'Чтение', hours: '0.3' }, 'hours'],
    [{ title: 'Чтение', hours: '25' }, 'hours'],
    [{ title: 'Чтение', hours: '1.3' }, 'hours'],
    [{ title: 'Чтение', hours: 'abc' }, 'hours'],
  ];
  for (const [input, field] of cases) {
    const result = validateInput(input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.ok(result.errors[field], `нет ошибки у поля ${field}: ${JSON.stringify(input)}`);
  }
  // Границы и шаг допустимы
  for (const hours of ['0.5', '24', '2.5', '4']) {
    assert.equal(validateInput({ title: 'Эссе', hours }).ok, true, hours);
  }
  // Валидация не мутирует и не теряет введённые значения
  const input = { title: '  Мой черновик ', hours: 'abc' };
  const result = validateInput(input);
  assert.equal(result.ok, false);
  assert.deepEqual(input, { title: '  Мой черновик ', hours: 'abc' });
});

test('T5: все задачи удалены — 0 ч, 0%, нет NaN/Infinity, работа продолжается', () => {
  let tasks = starterTasks();
  for (const task of [...tasks]) {
    tasks = removeTask(tasks, task.id);
  }
  assert.equal(tasks.length, 0);
  const totals = computeTotals(tasks);
  assert.deepEqual(totals, { total: 0, done: 0, progress: 0 });
  assert.ok(Number.isFinite(totals.progress));
  // добавление новой задачи в пустое состояние работает
  const added = addTask(tasks, 'Новая', 1);
  assert.deepEqual(computeTotals(added), { total: 1, done: 0, progress: 0 });
});

test('Персистентность: мутации сохраняются и восстанавливаются', () => {
  const backend = memoryBackend();
  const storeA = createTaskStore(backend);
  storeA.save(addTask(starterTasks(), 'Эссе', 1.5));
  const storeB = createTaskStore(backend);
  const restored = loadInitialTasks(storeB);
  assert.equal(restored.length, 4);
  assert.equal(restored[3].title, 'Эссе');
  assert.equal(restored[3].hours, 1.5);
});

test('Пустой список сохраняется как пустой (не заменяется стартовым)', () => {
  const backend = memoryBackend();
  const store = createTaskStore(backend);
  store.save([]);
  assert.deepEqual(loadInitialTasks(store), []);
});

test('Недоступное хранилище: флаг недоступности, работа в памяти', () => {
  const denied = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
    removeItem() {
      throw new Error('denied');
    },
  };
  const store = createTaskStore(denied);
  assert.equal(store.isAvailable(), false);
  store.save(addTask(starterTasks(), 'Эссе', 1));
  const restored = store.load();
  assert.equal(restored.length, 4); // данные живы в памяти
});
