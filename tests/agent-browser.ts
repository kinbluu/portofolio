import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { delimiter, resolve, join } from "node:path";
import { desktopEndpoint } from "./desktop-endpoint";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

type AgentResponse<T> =
  { success: true; data: T } | { success: false; error: string };

type MediaFeature = {
  name: "prefers-color-scheme" | "prefers-reduced-motion";
  value: string;
};

export class AgentBrowser {
  private readonly session = `e${randomBytes(6).toString("base64url")}`;
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
    delete env.AGENT_BROWSER_CDP;
    delete env.AGENT_BROWSER_AUTO_CONNECT;
    delete env.AGENT_BROWSER_RESTORE;
    delete env.AGENT_BROWSER_PROFILE;
    delete env.AGENT_BROWSER_INIT_SCRIPTS;
    if (this.options.profile) {
      env.AGENT_BROWSER_PROFILE = this.options.profile;
      env.AGENT_BROWSER_EXECUTABLE_PATH =
        process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";
    }
    if (this.options.initScriptPath)
      env.AGENT_BROWSER_INIT_SCRIPTS = this.options.initScriptPath;
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
    const expected = new URL(desktopEndpoint(endpoint));
    await this.command("connect", expected.href);
    const { cdpUrl } = await this.command<{ cdpUrl: string }>("get", "cdp-url");
    const actual = new URL(cdpUrl);
    if (
      !["ws:", "wss:"].includes(actual.protocol) ||
      actual.hostname !== expected.hostname ||
      actual.port !== expected.port
    ) {
      throw new Error(
        "agent-browser connected to a different browser endpoint.",
      );
    }
    this.connectedBrowserUrl = cdpUrl;
  }

  async newPage(): Promise<AgentPage> {
    const { tabId } = await this.command<{ tabId: string }>(
      "tab",
      "new",
      "about:blank",
    );
    this.activeTabId = tabId;
    return new AgentPage(this, tabId);
  }

  async currentPage(): Promise<AgentPage> {
    const { tabs } = await this.command<{
      tabs: { tabId: string; active: boolean }[];
    }>("tab", "list");
    const active = tabs.find((tab) => tab.active);
    if (!active) throw new Error("agent-browser did not report an active tab.");
    this.activeTabId = active.tabId;
    return new AgentPage(this, active.tabId);
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
    if (this.options.ownedDirectory)
      await rm(this.options.ownedDirectory, { recursive: true, force: true });
  }

  async closeOwnedBrowser(): Promise<void> {
    if (!this.connectedBrowserUrl)
      throw new Error("agent-browser has not verified its browser endpoint.");
    const { cdpUrl } = await this.command<{ cdpUrl: string }>("get", "cdp-url");
    if (cdpUrl !== this.connectedBrowserUrl)
      throw new Error(
        "agent-browser connected to a different browser endpoint.",
      );
    const { tabs } = await this.command<{ tabs: { tabId: string }[] }>(
      "tab",
      "list",
    );
    const { tabId: finalTab } = await this.command<{ tabId: string }>(
      "tab",
      "new",
      "about:blank",
    );
    for (const tab of tabs) {
      if (tab.tabId !== finalTab) await this.command("tab", "close", tab.tabId);
    }
    const expression = Buffer.from("window.close()").toString("base64");
    await this.command("eval", "-b", expression);
  }

  private activeTabId?: string;

  constructor(private readonly options: AgentBrowserOptions = {}) {}

  async selectTab(tabId: string): Promise<void> {
    if (this.activeTabId !== tabId) {
      await this.command("tab", tabId);
      this.activeTabId = tabId;
    }
  }

  async closeTab(tabId: string): Promise<void> {
    await this.command("tab", "close", tabId);
    if (this.activeTabId === tabId) this.activeTabId = undefined;
  }

  private readonly contexts = new Set<AgentBrowser>();
  private parent?: AgentBrowser;

  async createBrowserContext(
    options: IsolatedBrowserOptions = {},
  ): Promise<AgentBrowser> {
    const context = await launchIsolatedAgentBrowser(options);
    context.parent = this;
    this.contexts.add(context);
    return context;
  }

  async close(): Promise<void> {
    const results = await Promise.allSettled(
      [...this.contexts].map((context) => context.close()),
    );
    const failures = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    try {
      await this.disconnect();
    } catch (error) {
      failures.push(error);
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        "Failed to close agent-browser sessions.",
      );
    this.parent?.contexts.delete(this);
  }

  private connectedBrowserUrl?: string;
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
    await this.activate();
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
    await this.activate();
    await this.browser.setMedia(features);
  }

  async goto(
    url: string,
    options?: { waitUntil?: "domcontentloaded" | "load" | "networkidle0" },
  ): Promise<void> {
    await this.activate();
    await this.browser.command("open", url);
    if (options?.waitUntil) {
      await this.browser.command(
        "wait",
        "--load",
        options.waitUntil === "networkidle0"
          ? "networkidle"
          : options.waitUntil,
      );
    }
  }

  private async evaluateExpression<T>(expression: string): Promise<T> {
    await this.activate();
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
    if (this.tabId) await this.browser.closeTab(this.tabId);
  }

  async $(selector: string): Promise<boolean> {
    return this.evaluate(
      (value) => Boolean(document.querySelector(value)),
      selector,
    );
  }

  async focus(selector: string): Promise<void> {
    await this.activate();
    await this.browser.command("focus", selector);
  }

  private async activate(): Promise<void> {
    if (this.tabId) await this.browser.selectTab(this.tabId);
  }

  async click(selector: string): Promise<void> {
    await this.activate();
    await this.browser.command("click", selector);
  }

  async press(key: string): Promise<void> {
    await this.activate();
    await this.browser.command("press", key);
  }

  async mouseMove(x: number, y: number): Promise<void> {
    await this.activate();
    await this.browser.command(
      "mouse",
      "move",
      String(Math.round(x)),
      String(Math.round(y)),
    );
  }

  async mouseWheel(deltaY: number, x: number, y: number): Promise<void> {
    await this.activate();
    await this.evaluate(() => {
      const target = window as Window & {
        __agentWheelResult?: { trusted: boolean };
      };
      delete target.__agentWheelResult;
      document.addEventListener(
        "wheel",
        (event) => {
          target.__agentWheelResult = { trusted: event.isTrusted };
        },
        { once: true, capture: true, passive: true },
      );
    });
    const socket = await this.openInputStream();
    try {
      socket.send(
        JSON.stringify({
          type: "input_mouse",
          eventType: "mouseWheel",
          x,
          y,
          deltaX: 0,
          deltaY,
        }),
      );
      await this.waitForFunction(
        () =>
          Boolean(
            (window as Window & { __agentWheelResult?: unknown })
              .__agentWheelResult,
          ),
        { timeout: 5_000 },
      );
      const trusted = await this.evaluate(() => {
        const target = window as Window & {
          __agentWheelResult?: { trusted: boolean };
        };
        const trusted = target.__agentWheelResult?.trusted ?? false;
        delete target.__agentWheelResult;
        return trusted;
      });
      if (!trusted)
        throw new Error("agent-browser did not deliver a trusted wheel event.");
    } finally {
      socket.close();
    }
  }

  async waitForSelector(selector: string): Promise<void> {
    await this.activate();
    await this.browser.command("wait", selector);
  }

  async reload(options?: {
    waitUntil?: "domcontentloaded" | "load" | "networkidle0";
  }): Promise<void> {
    await this.activate();
    await this.browser.command("reload");
    if (options?.waitUntil) {
      await this.browser.command(
        "wait",
        "--load",
        options.waitUntil === "networkidle0"
          ? "networkidle"
          : options.waitUntil,
      );
    }
  }

  async javascriptIsDisabled(): Promise<boolean> {
    return this.evaluate(() => {
      const target = window as Window & { __agentScriptProbe?: number };
      target.__agentScriptProbe = 0;
      const script = document.createElement("script");
      script.textContent = "window.__agentScriptProbe = 1";
      document.head.appendChild(script);
      script.remove();
      const disabled = target.__agentScriptProbe === 0;
      delete target.__agentScriptProbe;
      return disabled;
    });
  }

  async touchSwipe(points: { x: number; y: number }[]): Promise<void> {
    if (points.length < 2)
      throw new Error("A touch swipe needs at least two points.");
    await this.activate();
    await this.evaluate(() => {
      const target = window as Window & {
        __agentTouchResult?: { ended: boolean; trusted: boolean };
      };
      target.__agentTouchResult = { ended: false, trusted: false };
      document.addEventListener(
        "touchend",
        (event) => {
          target.__agentTouchResult = { ended: true, trusted: event.isTrusted };
        },
        { once: true, capture: true },
      );
    });
    const socket = await this.openInputStream();
    try {
      for (const [index, point] of points.entries()) {
        socket.send(
          JSON.stringify({
            type: "input_touch",
            eventType: index === 0 ? "touchStart" : "touchMove",
            touchPoints: [point],
          }),
        );
      }
      socket.send(
        JSON.stringify({
          type: "input_touch",
          eventType: "touchEnd",
          touchPoints: [],
        }),
      );
      await this.waitForFunction(
        () =>
          (window as Window & { __agentTouchResult?: { ended: boolean } })
            .__agentTouchResult?.ended === true,
        { timeout: 5_000 },
      );
      const trusted = await this.evaluate(() => {
        const target = window as Window & {
          __agentTouchResult?: { trusted: boolean };
        };
        const trusted = target.__agentTouchResult?.trusted ?? false;
        delete target.__agentTouchResult;
        return trusted;
      });
      if (!trusted)
        throw new Error("agent-browser did not deliver a trusted touch event.");
    } finally {
      socket.close();
    }
  }

  private async openInputStream(): Promise<WebSocket> {
    let stream = await this.browser.command<{ enabled: boolean; port: number }>(
      "stream",
      "status",
    );
    if (!stream.enabled) {
      await this.browser.command("stream", "enable");
      stream = await this.browser.command<{ enabled: boolean; port: number }>(
        "stream",
        "status",
      );
    }
    if (
      !Number.isInteger(stream.port) ||
      stream.port < 1 ||
      stream.port > 65535
    )
      throw new Error("Invalid agent-browser stream port.");
    const socket = new WebSocket(`ws://127.0.0.1:${stream.port}/?maxFps=1`);
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("agent-browser stream connection timed out")),
          5_000,
        );
        socket.addEventListener(
          "open",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        socket.addEventListener(
          "error",
          () => {
            clearTimeout(timeout);
            reject(new Error("agent-browser stream connection failed"));
          },
          { once: true },
        );
      });
      return socket;
    } catch (error) {
      socket.close();
      throw error;
    }
  }

  async setMobileViewport(): Promise<void> {
    await this.activate();
    await this.browser.command("set", "device", "iPhone 12");
  }

  async waitForResponse(
    path: string,
    status: number,
    timeout = 10_000,
  ): Promise<void> {
    await this.activate();
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const { requests } = await this.browser.command<{
        requests: { url: string; status?: number }[];
      }>("network", "requests", "--filter", path, "--status", String(status));
      if (
        requests.some(
          (request) =>
            new URL(request.url).pathname === path && request.status === status,
        )
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${path} response ${status}.`);
  }
}

export async function connectAgentBrowser(): Promise<AgentBrowser> {
  const browser = new AgentBrowser();
  await browser.connect();
  return browser;
}
type AgentBrowserOptions = {
  profile?: string;
  initScriptPath?: string;
  ownedDirectory?: string;
};
export async function launchIsolatedAgentBrowser(
  options: IsolatedBrowserOptions = {},
): Promise<AgentBrowser> {
  const directory = await mkdtemp(
    join(process.env.EMPRYO_TMP ?? tmpdir(), "agent-browser-profile-"),
  );
  let initScriptPath: string | undefined;
  try {
    if (options.javascriptEnabled === false) {
      await mkdir(join(directory, "Default"), { recursive: true });
      await writeFile(
        join(directory, "Default", "Preferences"),
        JSON.stringify({
          profile: { default_content_setting_values: { javascript: 2 } },
        }),
      );
    }
    if (options.initScript) {
      initScriptPath = join(directory, "test-init.js");
      await writeFile(initScriptPath, options.initScript);
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  const browser = new AgentBrowser({
    profile: directory,
    initScriptPath,
    ownedDirectory: directory,
  });
  try {
    await browser.command("open");
    return browser;
  } catch (error) {
    await browser.disconnect().catch(() => {
      console.error(`agent-browser profile retained at ${directory}`);
    });
    throw error;
  }
}
type IsolatedBrowserOptions = {
  javascriptEnabled?: boolean;
  initScript?: string;
};
