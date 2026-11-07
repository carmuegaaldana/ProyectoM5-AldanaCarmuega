import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createCommit } from "../github/operations.js";
import {
    ownerSchema,
    repositoryNameSchema,
} from "../schemas/index.js";

export function registerCreateCommitTool(server: McpServer) {
    server.registerTool(
        "create_commit",
        {
            description:
                "Agrega o reemplaza un archivo de texto en una rama existente " +
                "de GitHub y crea un commit. " +
                "El contenido recibido reemplaza todo el archivo; no es un parche.",
            inputSchema: {
                owner: ownerSchema,
                repo: repositoryNameSchema,

                branch: z
                    .string()
                    .trim()
                    .min(1, "La rama no puede estar vacía")
                    .describe("Nombre de una rama existente, por ejemplo main"),

                path: z
                    .string()
                    .trim()
                    .min(1, "La ruta no puede estar vacía")
                    .refine(
                        (value) =>
                            !value.includes("\\") &&
                            !value.includes("\0") &&
                            value.split("/").every(
                                (segment) =>
                                    segment !== "" &&
                                    segment !== "." &&
                                    segment !== ".."
                            ),
                        "Usá una ruta relativa de archivo, sin segmentos vacíos, . o .."
                    )
                    .describe("Ruta dentro del repositorio, por ejemplo docs/notas.txt"),

                content: z
                    .string()
                    .describe("Contenido completo del archivo como texto"),

                message: z
                    .string()
                    .trim()
                    .min(1, "El mensaje del commit no puede estar vacío")
                    .describe("Mensaje que explica el cambio realizado"),
            },
        },
        async ({ owner, repo, branch, path, content, message }) => {
            try {
                const result = await createCommit(
                    owner,
                    repo,
                    branch,
                    path,
                    content,
                    message
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
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
                                `No se pudo guardar ${path} en ${owner}/${repo}. ` +
                                "Verificá la rama, la ruta, tus permisos y la conexión.",
                        },
                    ],
                };
            }
        }
    );
}