import { createRepositorySchema } from "../schemas/index.js";
import { logToolError } from "../utils/logging.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRepository } from "../github/operations.js";
import { toGitHubAPIError } from "../errors/index.js";

export function registerCreateRepositoryTool(server: McpServer) {
    server.registerTool(
        "create_repository",
        {
            description:
                "Crea un repositorio en la cuenta personal del usuario autenticado. " +
                "Recibe nombre, descripción y visibilidad. " +
                "Inicializa el repositorio con un README.",
            inputSchema: createRepositorySchema.shape,
        },
        async ({ name, description, isPrivate }) => {
            try {
                const repository = await createRepository(
                    name,
                    description,
                    isPrivate
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(repository, null, 2),
                        },
                    ],
                };
            } catch (error: unknown) {
                const publicError = toGitHubAPIError(
                    error,
                    `el recurso necesario para crear el repositorio ${name}`
                );
                logToolError("create_repository", publicError);

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
