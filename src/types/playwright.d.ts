/**
 * Minimal local ambient type declarations for the 'playwright' package.
 *
 * 'playwright' is not currently an installed dependency (BROWSER_AUTOMATION_LAYER.ts
 * is not wired into any live code path). This shim covers only the subset of the
 * Playwright API actually used in this codebase, so the file can typecheck without
 * pulling in the real (heavy, binary-bundled) package.
 *
 * If/when real browser automation is activated, replace this with the actual
 * `playwright` dependency + its bundled types.
 */
declare module 'playwright' {
  export interface ElementHandle {
    click(): Promise<void>;
    fill(value: string): Promise<void>;
    setInputFiles(path: string): Promise<void>;
    textContent(): Promise<string | null>;
  }

  export interface Keyboard {
    press(key: string): Promise<void>;
  }

  export interface Page {
    goto(url: string): Promise<void>;
    click(selector: string): Promise<void>;
    fill(selector: string, value: string): Promise<void>;
    $(selector: string): Promise<ElementHandle | null>;
    $$eval<R>(selector: string, pageFunction: (elements: Element[]) => R): Promise<R>;
    textContent(selector: string): Promise<string | null>;
    waitForTimeout(ms: number): Promise<void>;
    waitForLoadState(state?: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void>;
    waitForNavigation(options?: { timeout?: number }): Promise<void>;
    setViewportSize(size: { width: number; height: number }): Promise<void>;
    keyboard: Keyboard;
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export interface BrowserType {
    launch(options?: { headless?: boolean }): Promise<Browser>;
  }

  export const chromium: BrowserType;
}
