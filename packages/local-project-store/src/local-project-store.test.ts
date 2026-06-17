import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LocalProjectStore } from "./local-project-store";

const appInput = {
  appName: "LiteraryTrip",
  category: "travel",
  targetAudience: "readers who travel",
  mainValueProposition: "turn books into walkable routes",
  targetStores: ["app-store" as const],
  baseLocale: "en-US",
  screenshots: [
    { id: "home", path: "input/screenshots/home.png", kind: "functional" as const },
    { id: "search", path: "input/screenshots/search.png", kind: "functional" as const },
    { id: "map", path: "input/screenshots/map.png", kind: "functional" as const },
  ],
};

async function withTempStore<T>(fn: (store: LocalProjectStore, rootDir: string) => Promise<T>): Promise<T> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "app-screenshot-ai-store-"));
  try {
    return await fn(new LocalProjectStore({ rootDir }), rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

describe("LocalProjectStore", () => {
  it("creates a project folder with input metadata and project metadata", async () => {
    await withTempStore(async (store, rootDir) => {
      const project = await store.createProject({ projectId: "literarytrip", input: appInput });

      expect(project.projectId).toBe("literarytrip");
      expect(project.projectDir).toBe(path.join(rootDir, "literarytrip"));

      const storedInput = JSON.parse(await readFile(path.join(project.projectDir, "input", "metadata.json"), "utf8"));
      expect(storedInput.appName).toBe("LiteraryTrip");

      const metadata = JSON.parse(await readFile(path.join(project.projectDir, "project.json"), "utf8"));
      expect(metadata).toMatchObject({
        projectId: "literarytrip",
        appName: "LiteraryTrip",
        category: "travel",
        status: "draft",
      });
      expect(Date.parse(metadata.createdAt)).not.toBeNaN();
      expect(Date.parse(metadata.updatedAt)).not.toBeNaN();
    });
  });

  it("writes pipeline artifacts as inspectable JSON", async () => {
    await withTempStore(async (store, rootDir) => {
      await store.createProject({ projectId: "literarytrip", input: appInput });

      await store.writeArtifact({
        projectId: "literarytrip",
        name: "visual-system",
        value: { id: "warm-editorial-v1" },
      });

      const artifact = JSON.parse(
        await readFile(path.join(rootDir, "literarytrip", "pipeline", "visual-system.json"), "utf8"),
      );
      expect(artifact).toEqual({ id: "warm-editorial-v1" });
    });
  });

  it("writes every generated set as a versioned generation", async () => {
    await withTempStore(async (store, rootDir) => {
      await store.createProject({ projectId: "literarytrip", input: appInput });

      const generation = await store.writeGeneration({
        projectId: "literarytrip",
        generationId: "gen-a",
        kind: "ai-generate",
        label: "first variant",
        visualSystem: {
          id: "vs",
          palette: { background: "#fff", primary: "#000", accent: "#f90", text: "#111" },
          typography: { headlineFamily: "Inter", headlineWeight: 700 },
          layout: { safeMargin: 96, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.62 },
        },
        storyboard: { screens: [{ id: "hook", index: 1, role: "hook", headline: "Walk books", sourceScreenshotPath: "input/home.png" }] },
        assets: [{ id: "screen-1", screenIndex: 1, store: "app-store", device: "iphone-6.9", locale: "en-US", fileName: "01-hook.png", contentType: "image/png", width: 1320, height: 2868, bytes: new Uint8Array([1, 2, 3]) }],
        qualityReport: { passed: true, scores: { storeCompliance: 1, textQuality: 1, campaignConsistency: 1 }, issues: [] },
        exportManifest: { items: [] },
        zipFileName: "literarytrip-store-pack.zip",
        zipBytes: new Uint8Array([4, 5, 6]),
      });

      expect(generation).toMatchObject({ generationId: "gen-a", kind: "ai-generate", label: "first variant" });

      const projects = await store.listProjects();
      expect(projects[0]).toMatchObject({
        projectId: "literarytrip",
        appName: "LiteraryTrip",
        category: "travel",
        status: "ready",
        currentGenerationId: "gen-a",
      });
      expect(projects[0]?.generations).toHaveLength(1);

      const metadata = JSON.parse(await readFile(path.join(rootDir, "literarytrip", "project.json"), "utf8"));
      expect(metadata).toMatchObject({ status: "ready", currentGenerationId: "gen-a" });

      const storedGeneration = await store.readGeneration("literarytrip", "gen-a");
      expect(storedGeneration.storyboard.screens[0]?.headline).toBe("Walk books");
      expect(storedGeneration.renders[0]?.bytes).toEqual(new Uint8Array([1, 2, 3]));
      expect(storedGeneration.zip.bytes).toEqual(new Uint8Array([4, 5, 6]));
    });
  });

  it("lists pre-versioning projects as legacy generations", async () => {
    await withTempStore(async (store, rootDir) => {
      const projectDir = path.join(rootDir, "old-project");
      await mkdir(path.join(projectDir, "input"), { recursive: true });
      await mkdir(path.join(projectDir, "pipeline"), { recursive: true });
      await mkdir(path.join(projectDir, "renders"), { recursive: true });
      await mkdir(path.join(projectDir, "exports"), { recursive: true });
      await writeFile(path.join(projectDir, "input", "metadata.json"), JSON.stringify(appInput));
      await writeFile(path.join(projectDir, "pipeline", "visual-system.json"), JSON.stringify({ id: "vs", palette: { background: "#fff", primary: "#000", accent: "#f90", text: "#111" }, typography: { headlineFamily: "Inter", headlineWeight: 700 }, layout: { safeMargin: 96, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.62 } }));
      await writeFile(path.join(projectDir, "pipeline", "storyboard.json"), JSON.stringify({ screens: [{ id: "hook", index: 1, role: "hook", headline: "Legacy", sourceScreenshotPath: "input/home.png" }] }));
      await writeFile(path.join(projectDir, "pipeline", "quality-report.json"), JSON.stringify({ passed: true, scores: { storeCompliance: 1, textQuality: 1, campaignConsistency: 1 }, issues: [] }));
      await writeFile(path.join(projectDir, "pipeline", "export-manifest.json"), JSON.stringify({ items: [] }));
      await writeFile(path.join(projectDir, "renders", "01-hook.png"), new Uint8Array([1]));
      await writeFile(path.join(projectDir, "exports", "old-project-store-pack.zip"), new Uint8Array([2]));

      const projects = await store.listProjects();
      const oldProject = projects.find((project) => project.projectId === "old-project");
      expect(oldProject?.currentGenerationId).toBe("legacy");
      expect(oldProject?.generations[0]).toMatchObject({ generationId: "legacy", label: "Legacy generation" });

      const generation = await store.readGeneration("old-project", "legacy");
      expect(generation.storyboard.screens[0]?.headline).toBe("Legacy");
      expect(generation.renders[0]?.bytes).toEqual(new Uint8Array([1]));
    });
  });

  it("updates project status metadata and sorts projects by recent activity", async () => {
    await withTempStore(async (store) => {
      await store.createProject({ projectId: "older-app", input: { ...appInput, appName: "Older App" } });
      await store.createProject({ projectId: "blocked-app", input: { ...appInput, appName: "Blocked App" } });

      await store.updateProjectMetadata({ projectId: "blocked-app", patch: { status: "blocked" } });

      const projects = await store.listProjects();
      expect(projects[0]).toMatchObject({ projectId: "blocked-app", appName: "Blocked App", status: "blocked" });
      expect(projects[1]).toMatchObject({ projectId: "older-app", status: "draft" });
    });
  });

  it("writes rendered screenshots and exports under stable folders", async () => {
    await withTempStore(async (store, rootDir) => {
      await store.createProject({ projectId: "literarytrip", input: appInput });

      await store.writeRender({
        projectId: "literarytrip",
        fileName: "01-hook.png",
        bytes: new Uint8Array([1, 2, 3]),
      });
      await store.writeExport({
        projectId: "literarytrip",
        fileName: "literarytrip-store-pack.zip",
        bytes: new Uint8Array([4, 5, 6]),
      });

      expect(await readFile(path.join(rootDir, "literarytrip", "renders", "01-hook.png"))).toEqual(
        Buffer.from([1, 2, 3]),
      );
      expect(await readFile(path.join(rootDir, "literarytrip", "exports", "literarytrip-store-pack.zip"))).toEqual(
        Buffer.from([4, 5, 6]),
      );
    });
  });
});
