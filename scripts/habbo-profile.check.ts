import { strict as assert } from "node:assert";
import {
  buildHabboProfilePayload,
  resolveHabboProfileSettled,
} from "../src/server/habbo-profile-core";

const core = { uniqueId: "u1", name: "tester" };
const uniqueId = "u1";

const lite = buildHabboProfilePayload({
  core,
  profile: null,
  uniqueId,
  lite: true,
});

assert.equal(lite.uniqueId, uniqueId);
assert.equal(Array.isArray(lite.friends), true);
assert.equal(lite.friends.length, 0);
assert.equal(Array.isArray(lite.achievements), true);

const settled = resolveHabboProfileSettled({
  profileRes: { status: "fulfilled", value: { currentLevel: 9 } },
  friendsRes: { status: "rejected", reason: new Error("x") },
  groupsRes: { status: "fulfilled", value: [{ id: 1 }] },
  roomsRes: { status: "fulfilled", value: "not-array" },
  badgesRes: { status: "fulfilled", value: [{ badgeCode: "ACH_TEST" }] },
  achievementsRes: { status: "fulfilled", value: [{ id: 1 }] },
  achievementsCatalogRes: { status: "fulfilled", value: [{ code: "ACH_TEST" }] },
});

assert.equal(Array.isArray(settled.friends), true);
assert.equal(settled.friends.length, 0);
assert.equal(settled.groups.length, 1);
assert.equal(settled.rooms.length, 0);

const payload = buildHabboProfilePayload({
  core,
  profile: settled.profile,
  friends: settled.friends,
  groups: settled.groups,
  rooms: settled.rooms,
  badgesRaw: settled.badgesRaw,
  achievements: settled.achievements,
  achievementsTotal: settled.achievementsTotal,
  uniqueId,
});

assert.equal(payload.achievementsCount, 1);
assert.equal(payload.achievementsTotalCount, 1);
assert.equal(payload.badges[0]?.album, "album1584");

console.log("habbo-profile check ok");
