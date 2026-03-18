/**
 * Last-write-wins conflict resolution based on `updated_at` timestamp.
 * Returns whichever record was updated most recently.
 */
export function resolveConflict<T extends { updated_at: string }>(
  local: T,
  remote: T
): T {
  return local.updated_at >= remote.updated_at ? local : remote;
}
