import { join, resolve } from "path";

const DEFAULT_WORKFORCE_DIRECTORY = "D:\\website-projects-backup\\Durrani_AI-Agents";

export function getWorkforceStorageRoot(): string {
  const configuredDirectory = process.env.WORKFORCE_DATA_DIR?.trim();
  return resolve(configuredDirectory || DEFAULT_WORKFORCE_DIRECTORY);
}

export function getWorkforceStateDirectory(): string {
  return getWorkforceStorageRoot();
}

export function getGeneratedTemplatesDirectory(): string {
  return join(getWorkforceStorageRoot(), "generated-templates");
}
