import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CreatorWorkspaceStore } from "./creator-workspace-store";

async function withTempWorkspace<T>(fn: (store: CreatorWorkspaceStore) => Promise<T>): Promise<T> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "creator-workspace-"));
  try {
    return await fn(new CreatorWorkspaceStore({ rootDir }));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

describe("CreatorWorkspaceStore", () => {
  it("creates and lists persistent apps", async () => {
    await withTempWorkspace(async (store) => {
      const app = await store.createApp({
        name: "VanTrip",
        category: "Travel",
        audience: "Campervan owners",
        valueProposition: "Plan better van trips",
        websiteUrl: "https://vantrip.example",
        brandColors: "#111111, #ffffff",
      });

      const apps = await store.listApps();

      expect(app.id).toMatch(/^vantrip-/);
      expect(app).toMatchObject({ name: "VanTrip", category: "Travel", packs: [] });
      expect(apps).toEqual([app]);
    });
  });

  it("creates packs inside an app and bumps app recency", async () => {
    await withTempWorkspace(async (store) => {
      const app = await store.createApp({
        name: "VanTrip",
        category: "Travel",
        audience: "Campervan owners",
        valueProposition: "Plan better van trips",
      });

      const pack = await store.createPack(app.id, {
        name: "iPhone Launch",
        platform: "iphone",
        size: "1320×2868",
        screenCount: 5,
        locale: "en-US",
      });

      const [storedApp] = await store.listApps();

      expect(pack).toMatchObject({ name: "iPhone Launch", platform: "iphone", screenCount: 5 });
      expect(pack.locales[0]).toMatchObject({ code: "en-US", status: "Draft" });
      expect(pack.locales[0]?.screens).toHaveLength(5);
      expect(pack.locales[0]?.screens[0]).toMatchObject({ index: 1, sceneType: "cover", status: "Draft" });
      expect(storedApp?.packs).toEqual([pack]);
      expect(storedApp?.updatedAt).toBe(pack.updatedAt);
    });
  });

  it("updates persisted locale screen copy", async () => {
    await withTempWorkspace(async (store) => {
      const app = await store.createApp({
        name: "VanTrip",
        category: "Travel",
        audience: "Campervan owners",
        valueProposition: "Plan better van trips",
      });
      const pack = await store.createPack(app.id, {
        name: "iPhone Launch",
        platform: "iphone",
        size: "1320×2868",
        screenCount: 5,
        locale: "en-US",
      });

      const updated = await store.updatePackLocaleScreens(app.id, pack.id, "en-US", [
        { index: 1, sceneType: "cover", headline: "Plan perfect trips", subheadline: "AI routes for every van", status: "Draft" },
      ]);
      const [storedApp] = await store.listApps();
      const storedPack = storedApp?.packs.find((candidate) => candidate.id === pack.id);

      expect(updated.locales[0]?.screens[0]).toMatchObject({ headline: "Plan perfect trips", subheadline: "AI routes for every van" });
      expect(storedPack?.locales[0]?.screens[0]?.headline).toBe("Plan perfect trips");
      expect(storedApp?.updatedAt).toBe(updated.updatedAt);
    });
  });

  it("persists screen approval inside a pack locale", async () => {
    await withTempWorkspace(async (store) => {
      const app = await store.createApp({
        name: "VanTrip",
        category: "Travel",
        audience: "Campervan owners",
        valueProposition: "Plan better van trips",
      });
      const pack = await store.createPack(app.id, {
        name: "iPhone Launch",
        platform: "iphone",
        size: "1320×2868",
        screenCount: 5,
        locale: "en-US",
      });

      const updated = await store.approvePackLocaleScreen(app.id, pack.id, "en-US", 1, "2026-01-01T00:00:00.000Z");

      expect(updated.locales[0]?.screens[0]).toMatchObject({ index: 1, status: "Approved", approvedAt: "2026-01-01T00:00:00.000Z" });
    });
  });

  it("persists generated pack artifacts", async () => {
    await withTempWorkspace(async (store) => {
      const app = await store.createApp({
        name: "VanTrip",
        category: "Travel",
        audience: "Campervan owners",
        valueProposition: "Plan better van trips",
      });
      const pack = await store.createPack(app.id, {
        name: "iPhone Launch",
        platform: "iphone",
        size: "1320×2868",
        screenCount: 5,
        locale: "en-US",
      });

      const updated = await store.savePackGenerationArtifacts(app.id, pack.id, {
        images: [{ index: 1, id: "cover", fileName: "cover.png", dataUrl: "data:image/png;base64,abc", prompt: "Cover prompt", scenePlan: { shot: "hero" } }],
        localProjectPath: "/tmp/project",
        trace: [{ at: "2026-01-01T00:00:00.000Z", step: "generate", detail: "ok" }],
        generatedAt: "2026-01-01T00:00:00.000Z",
      });
      const [storedApp] = await store.listApps();
      const storedPack = storedApp?.packs.find((candidate) => candidate.id === pack.id);

      expect(updated.latestGeneration).toMatchObject({ localProjectPath: "/tmp/project", images: [{ index: 1, prompt: "Cover prompt" }] });
      expect(storedPack?.latestGeneration?.trace[0]?.step).toBe("generate");
      expect(storedApp?.updatedAt).toBe(updated.updatedAt);
    });
  });

  it("throws a clear error when creating a pack for a missing app", async () => {
    await withTempWorkspace(async (store) => {
      await expect(store.createPack("missing-app", {
        name: "iPhone Launch",
        platform: "iphone",
        size: "1320×2868",
        screenCount: 5,
        locale: "en-US",
      })).rejects.toThrow("Creator app 'missing-app' was not found");
    });
  });

  it("throws a clear error when approving a missing screen", async () => {
    await withTempWorkspace(async (store) => {
      const app = await store.createApp({
        name: "VanTrip",
        category: "Travel",
        audience: "Campervan owners",
        valueProposition: "Plan better van trips",
      });
      const pack = await store.createPack(app.id, {
        name: "iPhone Launch",
        platform: "iphone",
        size: "1320×2868",
        screenCount: 5,
        locale: "en-US",
      });

      await expect(store.approvePackLocaleScreen(app.id, pack.id, "en-US", 9)).rejects.toThrow("Screen 9 was not found");
    });
  });
});
