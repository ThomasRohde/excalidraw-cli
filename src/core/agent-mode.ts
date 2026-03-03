export function isAgentMode(): boolean {
  if (process.env.LLM === "true") return true;
  if (process.env.CI === "true") return true;
  if (!process.stdout.isTTY) return true;
  return false;
}
