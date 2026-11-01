export function desktopEndpoint(
  endpoint = process.env.AGENT_DESKTOP_CDP_URL,
): string {
  if (!endpoint) {
    throw new Error(
      "Run this test through bun tests/run-desktop.ts <test file> to launch agent-desktop.",
    );
  }
  const url = new URL(endpoint);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("AGENT_DESKTOP_CDP_URL must be a loopback HTTP endpoint.");
  }
  return url.origin;
}
