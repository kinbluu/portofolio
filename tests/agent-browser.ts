import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { delimiter, resolve } from "node:path";
import { desktopEndpoint } from "./desktop-endpoint";

type AgentResponse<T> =
  { success: true; data: T } | { success: false; error: string };

type MediaFeature = {
  name: "prefers-color-scheme" | "prefers-reduced-motion";
  value: string;
};

export class AgentBrowser {
  private readonly session = `e${randomBytes(4).toString("hex")}`;
  private colorScheme = "light";
  private reducedMotion = false;

  async command<T>(...args: string[]): Promise<T> {
    const executable = process.env.AGENT_BROWSER_BIN ?? "agent-browser";
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: [resolve("node_modules/.bin"), process.env.PATH ?? ""].join(
        delimiter,
      ),
    };
    if (!env.AGENT_BROWSER_SOCKET_DIR && env.EMPRYO_TMP) {
      env.AGENT_BROWSER_SOCKET_DIR = env.EMPRYO_TMP;
    }
    const { stdout, stderr, error } = await new Promise<{
      stdout: string;
      stderr: string;
      error: Error | null;
    }>((resolve) => {
      execFile(
        executable,
        ["--session", this.session, "--json", ...args],
        { env, maxBuffer: 8 * 1024 * 1024, timeout: 60_000 },
        (error, stdout, stderr) => resolve({ error, stdout, stderr }),
      );
    });

    let response: AgentResponse<T>;
    try {
      response = JSON.parse(stdout) as AgentResponse<T>;
    } catch {
      throw new Error(
        `${executable} ${args[0]} returned invalid JSON${stderr ? `: ${stderr.trim()}` : error ? `: ${error.message}` : ""}`,
      );
    }
    if (!response.success) {
      throw new Error(`${executable} ${args[0]}: ${response.error}`);
    }
    if (error) throw new Error(`${executable} ${args[0]}: ${error.message}`);
    return response.data;
  }

  async connect(endpoint = desktopEndpoint()): Promise<void> {
    await this.command("connect", desktopEndpoint(endpoint));
  }

  async newPage(): Promise<AgentPage> {
    const { tabId } = await this.command<{ tabId: string }>(
      "tab",
      "new",
      "about:blank",
    );
    return new AgentPage(this, tabId);
  }

  currentPage(): AgentPage {
    return new AgentPage(this);
  }

  async setMedia(features: MediaFeature[]): Promise<void> {
    this.colorScheme = "light";
    this.reducedMotion = false;
    for (const feature of features) {
      if (feature.name === "prefers-color-scheme")
        this.colorScheme = feature.value;
      if (feature.name === "prefers-reduced-motion") {
        this.reducedMotion = feature.value === "reduce";
      }
    }
    await this.command(
      "set",
      "media",
      this.colorScheme,
      ...(this.reducedMotion ? ["reduced-motion"] : []),
    );
  }

  async disconnect(): Promise<void> {
    await this.command("close");
  }
}

export class AgentPage {
  constructor(
    private readonly browser: AgentBrowser,
    private readonly tabId?: string,
  ) {}

  async setViewport(viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  }): Promise<void> {
    await this.browser.command(
      "set",
      "viewport",
      String(viewport.width),
      String(viewport.height),
      ...(viewport.deviceScaleFactor
        ? [String(viewport.deviceScaleFactor)]
        : []),
    );
  }

  async emulateMediaFeatures(features: MediaFeature[]): Promise<void> {
    await this.browser.setMedia(features);
  }

  async goto(url: string, _options?: { waitUntil?: string }): Promise<void> {
    await this.browser.command("open", url);
  }

  private async evaluateExpression<T>(expression: string): Promise<T> {
    const encoded = Buffer.from(expression).toString("base64");
    const { result } = await this.browser.command<{ result: T }>(
      "eval",
      "-b",
      encoded,
    );
    return result;
  }

  async evaluate<Args extends unknown[], Result>(
    fn: (...args: Args) => Result,
    ...args: Args
  ): Promise<Awaited<Result>> {
    return this.evaluateExpression<Awaited<Result>>(
      `(${fn.toString()})(...${JSON.stringify(args)})`,
    );
  }

  async $eval<Result>(
    selector: string,
    fn: (element: Element) => Result,
  ): Promise<Awaited<Result>> {
    return this.evaluateExpression<Awaited<Result>>(
      `((selector, fn) => { const node = document.querySelector(selector); if (!node) throw new Error('Selector not found: ' + selector); return fn(node); })(${JSON.stringify(selector)}, (${fn.toString()}))`,
    );
  }

  async waitForFunction<Args extends unknown[]>(
    fn: (...args: Args) => unknown,
    options: { timeout?: number } = {},
    ...args: Args
  ): Promise<void> {
    const timeout = options.timeout ?? 30_000;
    await this.evaluateExpression(
      `(async () => { const deadline = Date.now() + ${timeout}; while (Date.now() < deadline) { if (await (${fn.toString()})(...${JSON.stringify(args)})) return true; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('Timed out waiting for browser condition'); })()`,
    );
  }

  async close(): Promise<void> {
    if (this.tabId) await this.browser.command("tab", "close", this.tabId);
  }

  async $(selector: string): Promise<boolean> {
    return this.evaluate(
      (value) => Boolean(document.querySelector(value)),
      selector,
    );
  }

  async focus(selector: string): Promise<void> {
    await this.browser.command("focus", selector);
  }
}

export async function connectAgentBrowser(): Promise<AgentBrowser> {
  const browser = new AgentBrowser();
  await browser.connect();
  return browser;
}
