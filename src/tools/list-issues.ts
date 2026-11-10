import { listIssuesSchema } from "../schemas/index.js";
import { logToolError } from "../utils/logging.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listIssues } from "../github/operations.js";
import { toGitHubAPIError } from "../errors/index.js";

export function registerListIssuesTool(server: McpServer) {
    server.registerTool(
        "list_issues",
        {
            description:
                "Lista los issues abiertos de un repositorio de GitHub. " +
                "Requiere el propietario y el nombre del repositorio. " +
                "Excluye los pull requests y permite consultar distintas páginas.",
            inputSchema: listIssuesSchema.shape,
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

                logToolError("list_issues", publicError);

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
