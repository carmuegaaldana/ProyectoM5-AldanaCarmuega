import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/create-server.js";

const mocks = vi.hoisted(() => ({ listRepositories: vi.fn(), listIssues: vi.fn() }));
vi.mock("../src/github/operations.js", () => ({
    listRepositories: mocks.listRepositories,
    listIssues: mocks.listIssues,
    createIssue: vi.fn(), createRepository: vi.fn(), createCommit: vi.fn(),
}));

let client: Client;
let server: ReturnType<typeof createServer>;

beforeEach(async () => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    server = createServer();
    client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
});
afterEach(async () => {
    await client.close();
    await server.close();
    vi.restoreAllMocks();
});

describe("contrato MCP", () => {

    it("rechaza parámetros inválidos antes de ejecutar la operación", async () => {
        const result = await client.callTool({
            name: "list_repositories", arguments: { perPage: 101 },
        });
        expect(result.isError).toBe(true);
        expect(mocks.listRepositories).not.toHaveBeenCalled();
    });
});
