import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listIssues } from "../github/operations.js";
import {
    ownerSchema,
    repositoryNameSchema,
} from "../schemas/index.js";
import { toGitHubAPIError } from "../errors/index.js";

export function registerListIssuesTool(server: McpServer) {
    server.registerTool(
        "list_issues",
        {
            description:
                "Lista los issues abiertos de un repositorio de GitHub. " +
                "Requiere el propietario y el nombre del repositorio. " +
                "Excluye los pull requests y permite consultar distintas páginas.",
            inputSchema: {
                owner: ownerSchema,
                repo: repositoryNameSchema,

                page: z.number().int().min(1).default(1)
                    .describe("Número de página, comenzando en 1"),

                perPage: z.number().int().min(1).max(100).default(30)
                    .describe("Cantidad de elementos por página antes de excluir pull requests"),
            },
        },
        async ({ owner, repo, page, perPage }) => {
            try {
                const issues = await listIssues(owner, repo, page, perPage);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                { owner, repo, page, perPage, issues },
                                null,
                                2
                            ),
                        },
                    ],
                };
            } catch (error: unknown) {
                const publicError = toGitHubAPIError(
                    error,
                    `el repositorio ${owner}/${repo}`
                );

                console.error("Falló list_issues", {
                    type: publicError.name,
                    status: publicError.status,
                });

                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: publicError.message,
                        },
                    ],
                };
            }
        }
    );
}