import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { GameDesignDoc, GDDSection, DevLogEntry } from "./types";

const PROJECT_DIR = process.env.PROJECT_DIR ?? process.cwd();
const GDD_PATH = path.join(PROJECT_DIR, "game-design-doc.md");

function emptySection(title: string, accent: string): GDDSection {
  return { title, content: "", status: "empty", accent };
}

export function emptyGDD(): GameDesignDoc {
  return {
    title: "Untitled Game",
    vision: emptySection("Vision", "red"),
    mechanics: emptySection("Mechanics", "green"),
    narrative: emptySection("Narrative", "yellow"),
    levelPlan: emptySection("Level Plan", "blue"),
    devLog: [],
  };
}

export async function loadGDD(): Promise<GameDesignDoc> {
  try {
    const raw = await readFile(GDD_PATH, "utf-8");
    return parseGDD(raw);
  } catch {
    return emptyGDD();
  }
}

export async function saveGDD(gdd: GameDesignDoc): Promise<void> {
  const markdown = serializeGDD(gdd);
  await mkdir(path.dirname(GDD_PATH), { recursive: true });
  await writeFile(GDD_PATH, markdown, "utf-8");
}

function parseGDD(raw: string): GameDesignDoc {
  const gdd = emptyGDD();

  // Parse title
  const titleMatch = raw.match(/^# (.+)$/m);
  if (titleMatch) gdd.title = titleMatch[1];

  // Parse sections
  const sections: Record<string, string> = {};
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const positions: Array<{ name: string; start: number }> = [];

  while ((match = sectionRegex.exec(raw)) !== null) {
    positions.push({ name: match[1], start: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].name.length - 4 : raw.length;
    sections[positions[i].name] = raw.slice(positions[i].start, end).trim();
  }

  if (sections["Vision"]) {
    gdd.vision = { title: "Vision", content: sections["Vision"], status: "locked", accent: "red" };
  }
  if (sections["Core Mechanics"]) {
    gdd.mechanics = { title: "Mechanics", content: sections["Core Mechanics"], status: "locked", accent: "green" };
  }
  if (sections["Narrative"]) {
    gdd.narrative = { title: "Narrative", content: sections["Narrative"], status: "locked", accent: "yellow" };
  }
  if (sections["Level Plan"]) {
    gdd.levelPlan = { title: "Level Plan", content: sections["Level Plan"], status: "locked", accent: "blue" };
  }

  // Parse dev log entries
  const logRegex = /^### \[(.+?)\] — (.+)$/gm;
  const devLogSection = sections["Dev Log"] ?? "";
  let logMatch;
  while ((logMatch = logRegex.exec(devLogSection)) !== null) {
    const entryStart = logMatch.index + logMatch[0].length;
    const nextEntry = devLogSection.indexOf("\n### ", entryStart);
    const entryContent = devLogSection
      .slice(entryStart, nextEntry === -1 ? undefined : nextEntry)
      .trim();
    gdd.devLog.push({
      timestamp: logMatch[1],
      skill: logMatch[2],
      content: entryContent,
    });
  }

  return gdd;
}

function serializeGDD(gdd: GameDesignDoc): string {
  let md = `# ${gdd.title}\n\n`;

  if (gdd.vision.content) {
    md += `## Vision\n${gdd.vision.content}\n\n`;
  }
  if (gdd.mechanics.content) {
    md += `## Core Mechanics\n${gdd.mechanics.content}\n\n`;
  }
  if (gdd.narrative.content) {
    md += `## Narrative\n${gdd.narrative.content}\n\n`;
  }
  if (gdd.levelPlan.content) {
    md += `## Level Plan\n${gdd.levelPlan.content}\n\n`;
  }

  if (gdd.devLog.length > 0) {
    md += `## Dev Log\n`;
    for (const entry of gdd.devLog) {
      md += `\n### [${entry.timestamp}] — ${entry.skill}\n${entry.content}\n`;
    }
  }

  return md;
}

export function updateGDDSection(
  gdd: GameDesignDoc,
  section: "vision" | "mechanics" | "narrative" | "levelPlan",
  content: string,
  status: "drafting" | "locked" = "drafting"
): GameDesignDoc {
  return {
    ...gdd,
    [section]: { ...gdd[section], content, status },
  };
}

export function addDevLogEntry(
  gdd: GameDesignDoc,
  skill: string,
  content: string
): GameDesignDoc {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);
  return {
    ...gdd,
    devLog: [{ timestamp, skill, content }, ...gdd.devLog],
  };
}
