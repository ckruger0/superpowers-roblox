import { readFile, readdir } from "fs/promises";
import path from "path";

const SKILLS_DIR = path.resolve(process.cwd(), "../skills");

interface SkillMetadata {
  name: string;
  description: string;
}

interface Skill {
  metadata: SkillMetadata;
  content: string;
  rawContent: string;
}

function parseFrontmatter(raw: string): {
  metadata: SkillMetadata;
  content: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      metadata: { name: "unknown", description: "" },
      content: raw,
    };
  }

  const frontmatter = match[1];
  const content = match[2].trim();

  const name =
    frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "unknown";
  const description =
    frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

  return { metadata: { name, description }, content };
}

export async function loadSkill(skillName: string): Promise<Skill> {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  const rawContent = await readFile(skillPath, "utf-8");
  const { metadata, content } = parseFrontmatter(rawContent);
  return { metadata, content, rawContent };
}

export async function loadSkillAsSystemPrompt(
  skillName: string,
  gddContext?: string
): Promise<string> {
  const skill = await loadSkill(skillName);
  let prompt = skill.content;

  if (gddContext) {
    prompt += `\n\n## Current Game Design Document\n\n${gddContext}`;
  }

  return prompt;
}

export async function listSkills(): Promise<SkillMetadata[]> {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills: SkillMetadata[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const skill = await loadSkill(entry.name);
        skills.push(skill.metadata);
      } catch {
        // skip directories without SKILL.md
      }
    }
  }

  return skills;
}
