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
    it("expone exactamente las cinco herramientas obligatorias", async () => {
        const result = await client.listTools();
        expect(result.tools.map((tool) => tool.name).sort()).toEqual([
            "create_commit", "create_issue", "create_repository", "list_issues", "list_repositories",
        ]);
    });

    it("aplica los valores predeterminados y devuelve un resultado MCP", async () => {
        mocks.listRepositories.mockResolvedValue([]);
        const result = await client.callTool({ name: "list_repositories", arguments: {} });
        expect(mocks.listRepositories).toHaveBeenCalledExactlyOnceWith(1, 30);
        expect(result.isError).not.toBe(true);
        expect(result.content).toEqual([{
            type: "text", text: JSON.stringify({ page: 1, perPage: 30, repositories: [] }, null, 2),
        }]);
    });

    it("rechaza parámetros inválidos antes de ejecutar la operación", async () => {
        const result = await client.callTool({
            name: "list_repositories", arguments: { perPage: 101 },
        });
        expect(result.isError).toBe(true);
        expect(mocks.listRepositories).not.toHaveBeenCalled();
    });

    it("devuelve un error de autenticación sin exponer el mensaje técnico", async () => {
        mocks.listIssues.mockRejectedValue({ status: 401, message: "detalle interno simulado" });
        const result = await client.callTool({ name: "list_issues", arguments: {
            owner: "equipo", repo: "demo",
        } });
        expect(result.isError).toBe(true);
        expect(JSON.stringify(result.content)).toContain("GitHub rechazó las credenciales");
        expect(JSON.stringify(result.content)).not.toContain("detalle interno simulado");
    });
});
