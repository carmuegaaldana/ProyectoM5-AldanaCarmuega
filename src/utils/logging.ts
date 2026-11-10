import { GitHubAPIError } from "../errors/index.js";

type LogLevel = "info" | "warn" | "error";

// Solo admitimos campos de diagnóstico controlados: nunca tokens, inputs ni errores crudos.
export function logEvent(
    level: LogLevel,
    event: string,
    details: { tool?: string; errorType?: string; status?: number; attempt?: number; waitMs?: number } = {}
) {
    console.error(JSON.stringify({ time: new Date().toISOString(), level, event, ...details }));
}

export function logToolError(tool: string, error: GitHubAPIError) {
    logEvent("error", "tool_failed", { tool, errorType: error.name, status: error.status });
}
