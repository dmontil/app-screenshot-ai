import path from "node:path";

import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";

export const runtime = "nodejs";

export async function GET() {
  const store = new LocalProjectStore({ rootDir: path.join(appRoot(), ".local", "projects") });
  return Response.json({ projects: await store.listProjects() });
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}
