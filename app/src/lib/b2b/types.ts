// Ported from the team's "Opportunity Radar" Lovable project (src/lib/opportunities/types.ts), 24 Oct 2026.
import { z } from "zod";

export const STAGES = [
  "planbesked",
  "planuppdrag",
  "samrad",
  "granskning",
  "antagen",
  "laga_kraft",
  "bygglov_ansokan",
  "bygglov_beviljat",
  "hotel_announced",
  "pagaende",
  "fardig",
  "unknown",
] as const;
export const SALES_STATUSES = ["new", "researching", "qualified", "contacted", "archived"] as const;
export const TENURES = [
  "agande_smahus",
  "bostadsratt",
  "hyresratt",
  "mixed",
  "not_applicable",
  "unknown",
] as const;
export const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  planbesked: "Planbesked",
  planuppdrag: "Planuppdrag",
  samrad: "Samråd",
  granskning: "Granskning",
  antagen: "Antagen",
  laga_kraft: "Laga kraft",
  bygglov_ansokan: "Building permit application",
  bygglov_beviljat: "Building permit granted",
  hotel_announced: "Hotel announced",
  pagaende: "Under construction",
  fardig: "Completed",
  unknown: "Unknown",
};
export const TENURE_LABELS: Record<(typeof TENURES)[number], string> = {
  agande_smahus: "Owned small houses",
  bostadsratt: "Tenant-owned apartments",
  hyresratt: "Rental",
  mixed: "Mixed tenure",
  not_applicable: "Not applicable",
  unknown: "Unknown",
};
const sourceSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
  title: z.string(),
  publisher: z.string(),
  documentDate: z.string(),
  accessedDate: z.string(),
});
const factSchema = z.object({
  id: z.string().min(1),
  field: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  sourceId: z.string().min(1),
});
const partySchema = z.object({
  name: z.string().nullable(),
  verified: z.boolean(),
  sourceId: z.string().optional(),
});
const projectBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  projectType: z.enum(["residential", "hotel", "mixed"]),
  municipality: z.string().trim().min(1),
  district: z.string(),
  planId: z.string().optional(),
  stage: z.enum(STAGES),
  stageDate: z.string().optional(),
  nextMilestone: z.string().optional(),
  units: z.object({
    value: z.number().int().positive().nullable(),
    kind: z.enum(["dwellings", "hotel_rooms"]),
    status: z.enum(["verified", "approximate", "unknown"]),
    sourceId: z.string().optional(),
  }),
  tenure: z.enum(TENURES),
  developer: partySchema,
  operator: partySchema.optional(),
  sources: z.array(sourceSchema).min(1),
  facts: z.array(factSchema),
  inferences: z.array(z.string()),
  missing: z.array(z.string()),
  conflicts: z.array(z.string()),
  salesStatus: z.enum(SALES_STATUSES),
  statusHistory: z.array(z.object({ status: z.enum(SALES_STATUSES), at: z.string() })),
  notes: z.string(),
  origin: z.enum(["seed", "user"]),
  edited: z.boolean(),
  updatedAt: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;
export type Fact = z.infer<typeof factSchema>;
export type Project = z.infer<typeof projectBaseSchema>;
