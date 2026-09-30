export function findingHref(key: string): string {
  return `/findings/${encodeURIComponent(key)}`;
}

export function workflowHref(id: string): string {
  return `/workflows/${encodeURIComponent(id)}`;
}

export function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
