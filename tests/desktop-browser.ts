import puppeteer from "puppeteer-core";
import { execFile } from "node:child_process";

export class DesktopCommandError extends Error {
  constructor(
    message: string,
    readonly delivery?: string,
  ) {
    super(message);
    this.name = "DesktopCommandError";
  }
}

type DesktopResponse<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        suggestion?: string;
        disposition?: { delivery?: string };
      };
    };

export async function desktopCommand<T>(...args: string[]): Promise<T> {
  const command = process.env.AGENT_DESKTOP_BIN ?? "agent-desktop";
  const { stdout, stderr, error } = await new Promise<{
    stdout: string;
    stderr: string;
    error: Error | null;
  }>((resolve) => {
    execFile(
      command,
      args,
      { maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
      },
    );
  });

  let response: DesktopResponse<T>;
  try {
    response = JSON.parse(stdout) as DesktopResponse<T>;
  } catch {
    throw new DesktopCommandError(
      `${command} ${args[0]} returned invalid JSON${stderr ? `: ${stderr.trim()}` : error ? `: ${error.message}` : ""}`,
    );
  }
  if (!response.ok) {
    const { code, message, suggestion, disposition } = response.error;
    throw new DesktopCommandError(
      `${command} ${args[0]}: ${code}: ${message}${suggestion ? ` ${suggestion}` : ""}`,
      disposition?.delivery,
    );
  }
  if (error) {
    throw new DesktopCommandError(`${command} ${args[0]}: ${error.message}`);
  }
  return response.data;
}

export async function connectDesktopBrowser(
  endpoint = process.env.AGENT_DESKTOP_CDP_URL,
) {
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
  return puppeteer.connect({ browserURL: url.origin, protocolTimeout: 60_000 });
}
