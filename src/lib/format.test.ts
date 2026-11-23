import assert from "node:assert/strict";
import test from "node:test";
import { syncAgeExceeded } from "./alfacrm/sync";
import { campusFromGroup } from "./format";

test("синхронизация нужна, если прошло больше заданных часов", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const recent = new Date(now - 2 * 60 * 60 * 1000);
  const old = new Date(now - 7 * 60 * 60 * 1000);
  assert.equal(syncAgeExceeded(recent, 6, now), false);
  assert.equal(syncAgeExceeded(old, 6, now), true);
  assert.equal(syncAgeExceeded(null, 6, now), true);
  assert.equal(syncAgeExceeded(old, 0, now), false);
});

test("филиал читается из названия группы", () => {
  assert.equal(campusFromGroup("Скретч-1 Гоголя"), "Гоголя");
  assert.equal(campusFromGroup("Python-старт Стр"), "Стр");
  assert.equal(campusFromGroup("Скретч-1"), "");
  assert.equal(campusFromGroup("Гоголя / Стр"), "Гоголя, Стр");
});
