import { afterEach, expect, it, vi } from "vitest";
import { GitHubAPIError } from "../src/errors/index.js";
import { logToolError } from "../src/utils/logging.js";

afterEach(() => vi.restoreAllMocks());

it("registra errores por stderr sin incluir su mensaje ni usar stdout", () => {
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    logToolError("list_issues", new GitHubAPIError("detalle-interno-simulado", 403));
    const line = stderr.mock.calls[0]?.[0];
    expect(typeof line).toBe("string");
    const record = JSON.parse(String(line));
    expect(record.level).toBe("error");
    expect(record.tool).toBe("list_issues");
    expect(record.status).toBe(403);
    expect(line).not.toContain("detalle-interno-simulado");
    expect(stdout).not.toHaveBeenCalled();
});
