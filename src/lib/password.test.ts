import assert from "node:assert/strict";
import test from "node:test";
import { generatePassword } from "./password";

test("случайный пароль подходит под правила входа", () => {
  const password = generatePassword();
  assert.equal(password.length, 12);
  assert.match(password, /^[A-Za-z0-9]+$/);
  const other = generatePassword();
  assert.notEqual(password, other);
});
