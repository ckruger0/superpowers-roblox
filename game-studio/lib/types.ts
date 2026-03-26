// Shared types for the game studio

export type GDDStatus = "empty" | "drafting" | "locked";

export interface GDDSection {
  title: string;
  content: string;
  status: GDDStatus;
  accent: string; // tailwind color class
}

export interface GameDesignDoc {
  title: string;
  vision: GDDSection;
  mechanics: GDDSection;
  narrative: GDDSection;
  levelPlan: GDDSection;
  devLog: DevLogEntry[];
}

export interface DevLogEntry {
  timestamp: string;
  skill: string;
  content: string;
}

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: "text" | "choice" | "screenshot" | "status" | "build-progress";
  choices?: Choice[];
  screenshotUrl?: string;
  specialistStatus?: SpecialistStatus[];
  buildSteps?: BuildStep[];
}

export interface Choice {
  id: string;
  label: string;
  description: string;
  selected?: boolean;
}

export interface SpecialistStatus {
  name: string;
  role: string;
  color: string;
  status: "working" | "done" | "idle";
}

export interface BuildStep {
  label: string;
  status: "pending" | "in-progress" | "done";
}

export type Stage = 1 | 2 | 3;

export interface McpStatus {
  connected: boolean;
  error?: string;
}
