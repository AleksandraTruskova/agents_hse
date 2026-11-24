import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FILTERS,
  addTask,
  computeStats,
  createInitialTasks,
  filterTasks,
  removeTask,
  toggleTask,
  validateTaskInput,
} from '../domain.mjs';

function findByTitle(tasks, title) {
  return tasks.find((task) => task.title === title);
}

// T1 · Исходный пример
test('T1: исходный пример — 3 задачи, всего 8 ч, выполнено 2 ч, прогресс 25% по часам', () => {
  const tasks = createInitialTasks();
  assert.equal(tasks.length, 3);
  const stats = computeStats(tasks);
  assert.equal(stats.total, 8);
  assert.equal(stats.done, 2);
  assert.equal(stats.progress, 25); // 2/8 = 25%, а не 1/3 по числу задач
});

// T2 · Статус
test('T2: «Практика» отмечена готовой — выполнено 6 из 8, прогресс 75%, данные реально изменились', () => {
  const tasks = createInitialTasks();
  const practice = findByTitle(tasks, 'Практика');
  const updated = toggleTask(tasks, practice.id);

  assert.equal(findByTitle(updated, 'Практика').done, true, 'флаг done изменился');
  assert.notEqual(updated, tasks, 'вернулась новая коллекция, а не мутация');

  const stats = computeStats(updated);
  assert.equal(stats.done, 6);
  assert.equal(stats.total, 8);
  assert.equal(stats.progress, 75);
});

// T3 · Фильтр
test('T3: фильтр «активные» меняет список, но не базу расчёта — прогресс остаётся 25%', () => {
  const tasks = createInitialTasks();
  const active = filterTasks(tasks, FILTERS.ACTIVE);
  assert.deepEqual(
    active.map((task) => task.title),
    ['Практика', 'Повторение']
  );

  const stats = computeStats(tasks);
  assert.equal(stats.progress, 25, 'итог считается по всем задачам, а не по видимым');
});

// T4 · Ошибки ввода
test('T4: пустое название и пробелы отклоняются с ошибкой', () => {
  for (const title of ['', '   ', '\t\n']) {
    const result = validateTaskInput({ title, hours: '2' });
    assert.equal(result.valid, false, `название «${title}» должно быть отклонено`);
    assert.ok(result.errors.title, 'видна ошибка названия');
  }
});

test('T4: пустые часы отклоняются; пустое значение не равно нулю', () => {
  for (const hours of ['', '   ']) {
    const result = validateTaskInput({ title: 'Тест', hours });
    assert.equal(result.valid, false, `часы «${hours}» должны быть отклонены`);
    assert.ok(result.errors.hours, 'видна ошибка часов');
  }
});

test('T4: отрицательные и нечисловые часы отклоняются', () => {
  for (const hours of ['-1', '-0.5', 'abc', '2,5']) {
    const result = validateTaskInput({ title: 'Тест', hours });
    assert.equal(result.valid, false, `часы «${hours}» должны быть отклонены`);
    assert.ok(result.errors.hours);
  }
});

test('T4: границы 0,5–24 допустимы', () => {
  for (const hours of ['0.5', '24']) {
    const result = validateTaskInput({ title: 'Тест', hours });
    assert.equal(result.valid, true, `часы «${hours}» должны быть приняты`);
    assert.equal(result.value.hours, Number(hours));
  }
});

test('T4: шаг 0,5 — 2,5 принимается, 0,4 и 2,25 отклоняются', () => {
  assert.equal(validateTaskInput({ title: 'Тест', hours: '2.5' }).valid, true);
  for (const hours of ['0.4', '2.25', '24.5', '0']) {
    const result = validateTaskInput({ title: 'Тест', hours });
    assert.equal(result.valid, false, `часы «${hours}» должны быть отклонены`);
    assert.ok(result.errors.hours);
  }
});

test('T4: некорректная задача не добавляется; валидная добавляется и нормализуется', () => {
  const tasks = createInitialTasks();
  const invalid = validateTaskInput({ title: '   ', hours: '' });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.value, null);

  const valid = validateTaskInput({ title: '  Эссе  ', hours: '1.5' });
  assert.equal(valid.valid, true);
  const updated = addTask(tasks, valid.value);
  assert.equal(updated.length, 4);
  const added = updated[updated.length - 1];
  assert.equal(added.title, 'Эссе', 'название обрезано по trim');
  assert.equal(added.hours, 1.5);
  assert.equal(added.done, false);
});

// T5 · Пустое состояние
test('T5: после удаления всех задач — 0 ч, 0%, без NaN/Infinity, интерфейсные данные согласованы', () => {
  let tasks = createInitialTasks();
  for (const task of tasks.slice()) {
    tasks = removeTask(tasks, task.id);
  }
  assert.equal(tasks.length, 0);

  const stats = computeStats(tasks);
  assert.equal(stats.total, 0);
  assert.equal(stats.done, 0);
  assert.equal(stats.progress, 0);
  assert.ok(Number.isFinite(stats.progress), 'нет NaN/Infinity');
  assert.equal(filterTasks(tasks, FILTERS.ALL).length, 0);
  assert.equal(filterTasks(tasks, FILTERS.ACTIVE).length, 0);
});
