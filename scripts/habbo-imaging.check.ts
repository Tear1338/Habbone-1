import { strict as assert } from "node:assert";
import { buildHabboAvatarUrl } from "../src/lib/habbo-imaging";

const url = buildHabboAvatarUrl("Test User", {
  direction: 2,
  head_direction: 3,
  img_format: "png",
  headonly: 1,
  size: "m",
});

const parsed = new URL(url);
assert.equal(parsed.pathname, "/habbo-imaging/avatarimage");
assert.equal(parsed.searchParams.get("user"), "Test User");
assert.equal(parsed.searchParams.get("direction"), "2");
assert.equal(parsed.searchParams.get("head_direction"), "3");
assert.equal(parsed.searchParams.get("img_format"), "png");
assert.equal(parsed.searchParams.get("headonly"), "1");
assert.equal(parsed.searchParams.get("size"), "m");

const customBase = buildHabboAvatarUrl("abc", { gesture: "sml" }, "https://www.habbo.com");
const customParsed = new URL(customBase);
assert.equal(customParsed.origin, "https://www.habbo.com");
assert.equal(customParsed.searchParams.get("gesture"), "sml");

console.log("habbo-imaging check ok");
