import assert from "node:assert/strict";
import test from "node:test";
import {
  bonusesFromLessons,
  customerBonusFallback,
  lessonBelongsToStudent,
  parseBalance,
  parseBonusItem,
  parseDate,
  parseLesson,
  parseTest,
} from "./parse";

test("баланс бонусов читается из нескольких форм ответа", () => {
  assert.equal(parseBalance({ balance_bonus: 12.5 }), 12.5);
  assert.equal(parseBalance({ balance: "15" }), 15);
  assert.equal(parseBalance({ model: { balance_bonus: 0 } }), 0);
  assert.equal(parseBalance(20), 20);
  assert.equal(parseBalance({ items: [] }), null);
});

test("история бонусов различает начисление и списание", () => {
  const accrue = parseBonusItem({ id: 1, customer_id: 7, amount: 20, date: "12.11.2026", note: "урок" }, 7, 0);
  assert.equal(accrue?.amount, 20);
  assert.equal(accrue?.kind, "accrue");
  assert.equal(accrue?.externalId, "bonus:7:1");
  const spend = parseBonusItem({ id: 2, customer_id: 7, amount: 10, type: 1, date: "2026-11-13" }, 7, 1);
  assert.equal(spend?.amount, -10);
  assert.equal(spend?.kind, "spend");
  const shop = parseBonusItem({ id: 3, customer_id: 7, amount: 5, type: 2, date: "01.01.2026" }, 7, 2);
  assert.equal(shop?.kind, "commodity");
  assert.equal(parseBonusItem({ id: 4, customer_id: 8, amount: 5, date: "01.01.2026" }, 7, 3), null);
});

test("урок понимает посещение, пропуск и тему", () => {
  const held = parseLesson(
    {
      id: 5,
      status: 3,
      topic: "Циклы",
      date: "2026-11-12",
      time_from: "15:00:00",
      subject_id: 1,
      customer_ids: [7],
      details: [{ customer_id: 7, is_attend: 1 }],
      homework: "Собрать гонку",
    },
    7,
    "Скретч",
  );
  assert.equal(held?.status, "held");
  assert.equal(held?.homeworkText, "Собрать гонку");
  assert.equal(held?.timeFrom, "15:00");
  const missed = parseLesson(
    { id: 6, status: 3, date: "12.11.2026", topic: "", details: [{ customer_id: 7, is_attend: 0 }] },
    7,
    "Скретч",
  );
  assert.equal(missed?.status, "missed");
  assert.equal(missed?.topic, "Скретч");
  assert.equal(parseLesson({ id: 7, status: 1, date: "2026-12-01", topic: "Скоро" }, 7, "")?.status, "planned");
  assert.equal(parseDate("12.11.2026")?.toISOString().slice(0, 10), "2026-11-12");
});

test("групповой урок попадает ученику только в даты участия", () => {
  const lesson = { id: 1, status: 3, date: "2026-11-01", group_ids: [4], details: [] };
  const member = { groupId: 4, name: "Скретч-1", from: parseDate("2026-10-01"), to: parseDate("2026-12-01") };
  assert.equal(lessonBelongsToStudent(lesson, 7, [member]), true);
  assert.equal(
    lessonBelongsToStudent(lesson, 7, [{ ...member, from: parseDate("2026-11-15") }]),
    false,
  );
});

test("если истории бонусов нет, начисление берётся из детали урока", () => {
  const rows = bonusesFromLessons(
    [{ id: 9, date: "2026-11-02", topic: "Кот", subject_id: 1, details: [{ customer_id: 3, bonus: 15 }] }],
    3,
    new Map([[1, "Скретч"]]),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 15);
  assert.match(rows[0].note, /Кот/);
});

test("тест читает разные имена полей", () => {
  const parsed = parseTest({ id: 4, customer_id: 3, test_name: "Циклы", grade: "18", max_ball: 20, created_at: "01.11.2026" }, 3);
  assert.equal(parsed?.title, "Циклы");
  assert.equal(parsed?.score, 18);
  assert.equal(parsed?.maxScore, 20);
});

test("запасное поле баланса на карточке клиента", () => {
  assert.equal(customerBonusFallback({ balance_bonus: "42" }), 42);
  assert.equal(customerBonusFallback({ custom_kiberony: 7 }, "custom_kiberony"), 7);
});
