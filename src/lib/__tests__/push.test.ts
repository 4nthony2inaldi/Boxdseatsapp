import { describe, it, expect } from "vitest";
import { routeForPush } from "@/lib/native/push";

describe("routeForPush", () => {
  it("routes follow-type notifications to the actor's profile", () => {
    expect(routeForPush({ type: "follow", actorUsername: "bob" })).toBe("/user/bob");
    expect(routeForPush({ type: "follow_request", actorUsername: "amy" })).toBe("/user/amy");
    expect(routeForPush({ type: "friend_activity", actorUsername: "cy" })).toBe("/user/cy");
  });

  it("routes like/comment/tag to the event", () => {
    expect(routeForPush({ type: "like", targetId: "e1" })).toBe("/event/e1");
    expect(routeForPush({ type: "comment", targetId: "e1" })).toBe("/event/e1");
    expect(routeForPush({ type: "companion_tag", targetId: "e1" })).toBe("/event/e1");
  });

  it("routes badges and nudges to their sections", () => {
    expect(routeForPush({ type: "badge_earned" })).toBe("/profile");
    expect(routeForPush({ type: "progress_nudge" })).toBe("/lists");
  });

  it("falls back to the notifications list when a target is missing or unknown", () => {
    expect(routeForPush({ type: "follow" })).toBe("/notifications"); // no username
    expect(routeForPush({ type: "like" })).toBe("/notifications"); // no targetId
    expect(routeForPush({ type: "mystery" })).toBe("/notifications");
    expect(routeForPush(undefined)).toBe("/notifications");
  });
});
