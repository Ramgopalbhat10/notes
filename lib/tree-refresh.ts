import { randomUUID } from "node:crypto";

import {
  generateFileTreeManifest,
  serializeFileTreeManifest,
  uploadFileTreeManifest,
} from "@/lib/file-tree-builder";
import type { FileTreeManifest } from "@/lib/file-tree-manifest";
import { writeManifestCache } from "@/lib/file-tree-cache";

export type RefreshJobStatus = "pending" | "running" | "completed" | "failed";

export interface RefreshJobRecord {
  id: string;
  status: RefreshJobStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: FileTreeManifest["metadata"];
  etag?: string;
  error?: string;
}

const jobs = new Map<string, RefreshJobRecord>();

function now(): string {
  return new Date().toISOString();
}

function setJob(job: RefreshJobRecord): void {
  job.updatedAt = now();
  jobs.set(job.id, job);
}

async function run(job: RefreshJobRecord): Promise<void> {
  try {
    job.status = "running";
    setJob(job);

    const manifest = await generateFileTreeManifest();
    const payload = serializeFileTreeManifest(manifest);
    const { etag } = await uploadFileTreeManifest(manifest);
    await writeManifestCache({ etag, body: payload });

    job.status = "completed";
    job.metadata = manifest.metadata;
    job.etag = etag;
    setJob(job);
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown error";
    console.error("Tree refresh job failed", error);
    setJob(job);
  }
}

export function startRefreshJob(): RefreshJobRecord {
  const job: RefreshJobRecord = {
    id: randomUUID(),
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
  };
  jobs.set(job.id, job);
  void run(job);
  return job;
}

export function getRefreshJob(id: string): RefreshJobRecord | undefined {
  return jobs.get(id);
}

export function listRefreshJobs(): RefreshJobRecord[] {
  return Array.from(jobs.values());
}
