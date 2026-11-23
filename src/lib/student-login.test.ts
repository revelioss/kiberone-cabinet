import assert from "node:assert/strict";
import test from "node:test";
import { loginCandidate, suggestedLogin, transliterate } from "./student-login";

test("транслит имени в логин", () => {
  assert.equal(transliterate("Алиса Норд"), "alisa nord");
  assert.equal(suggestedLogin("Алиса Норд", 9001), "alisa.nord");
  assert.equal(suggestedLogin("  ", 42), "id42");
  assert.equal(loginCandidate("alisa.nord", 9001, 0), "alisa.nord");
  assert.equal(loginCandidate("alisa.nord", 9001, 1), "alisa.nord9001");
});
