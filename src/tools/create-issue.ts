import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createIssue } from "../github/operations.js";
import {
    ownerSchema,
    repositoryNameSchema,
} from "../schemas/index.js";

export function registerCreateIssueTool(server: McpServer) {
    server.registerTool(
        "create_issue",
        {
            description:
                "Crea un issue en un repositorio de GitHub. " +
                "Usar cuando el usuario solicite registrar un error, tarea o propuesta. " +
                "Requiere propietario, repositorio, título y descripción.",
            inputSchema: {
                owner: ownerSchema,
                repo: repositoryNameSchema,

                title: z
                    .string()
                    .trim()
                    .min(1, "El título no puede estar vacío")
                    .describe("Título breve que identifica el error, tarea o propuesta"),

                body: z
                    .string()
                    .trim()
                    .min(1, "La descripción no puede estar vacía")
                    .describe("Descripción del issue, admite formato Markdown"),
            },
        },
        async ({ owner, repo, title, body }) => {
            try {
                const issue = await createIssue(owner, repo, title, body);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(issue, null, 2),
                        },
                    ],
                };
            } catch {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text:
                                `No se pudo crear el issue en ${owner}/${repo}. ` +
                                "Verificá el repositorio, tus permisos y la conexión.",
                        },
                    ],
                };
            }
        }
    );
}