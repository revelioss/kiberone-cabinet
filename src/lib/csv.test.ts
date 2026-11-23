import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, toCsv } from "./csv";

test("csv понимает кавычки и запятые", () => {
  const rows = parseCsv('login,fullName\nalisa,"Норд, Алиса"\n');
  assert.equal(rows[0].login, "alisa");
  assert.equal(rows[0].fullName, "Норд, Алиса");
});

test("экспорт экранирует формулы", () => {
  const csv = toCsv(["name"], [["=1+1"]]);
  assert.match(csv, /'=1\+1/);
});
