import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./create-server.js";
import { logEvent } from "./utils/logging.js";

try {
    const server = createServer();
    await server.connect(new StdioServerTransport());
    logEvent("info", "mcp_server_started");
} catch {
    logEvent("error", "mcp_server_start_failed");
    process.exitCode = 1;
}
