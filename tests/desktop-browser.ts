import { execFile } from "node:child_process";
import puppeteer from "puppeteer-core";
import { desktopEndpoint } from "./desktop-endpoint";

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
  return puppeteer.connect({
    browserURL: desktopEndpoint(endpoint),
    protocolTimeout: 60_000,
  });
}
