export const GUIDANCE_DEFAULTS = {
  startDelay: 5000,
  advanceDelay: 1200,
} as const;

export function resolveDelay(
  setting: number | undefined,
  defaultKey: keyof typeof GUIDANCE_DEFAULTS
): number {
  if (typeof setting === "number") return setting;
  return GUIDANCE_DEFAULTS[defaultKey];
}
