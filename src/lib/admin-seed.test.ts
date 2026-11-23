import assert from "node:assert/strict";
import test from "node:test";
import { adminSeedPlan } from "./admin-seed";

test("пустой ADMIN_PASSWORD не трогает существующего преподавателя", () => {
  assert.equal(adminSeedPlan("", true), "skip-existing");
  assert.equal(adminSeedPlan(undefined, true), "skip-existing");
  assert.equal(adminSeedPlan("   ", true), "skip-existing");
});

test("без пароля нельзя создать нового преподавателя", () => {
  assert.equal(adminSeedPlan("", false), "fail-missing");
  assert.equal(adminSeedPlan(undefined, false), "fail-missing");
});

test("заданный пароль создаёт или обновляет преподавателя", () => {
  assert.equal(adminSeedPlan("TEMP-change-me-0000", false), "create-or-update");
  assert.equal(adminSeedPlan("TEMP-change-me-0000", true), "create-or-update");
});
