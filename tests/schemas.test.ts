import { describe, expect, it } from "vitest";
import {
    createRepositorySchema,
    createIssueSchema,
    createCommitSchema,
} from "../src/schemas/index.js";

describe("contratos completos de las herramientas", () => {

    it("crea repositorios privados por defecto y exige una descripción", () => {
        const result = createRepositorySchema.parse({ name: "demo", description: "Prueba" });
        expect(result.isPrivate).toBe(true);
        expect(createRepositorySchema.safeParse({ name: "demo", description: " " }).success).toBe(false);
    });

    it("rechaza un título vacío después de quitar espacios", () => {
        expect(createIssueSchema.safeParse({
            owner: "equipo", repo: "demo", title: "   ", body: "Detalle",
        }).success).toBe(false);
    });

    it("rechaza rutas y ramas inválidas antes de consultar GitHub", () => {
        const input = { owner: "equipo", repo: "demo", branch: "main", path: "a.txt",
            content: "Hola", message: "Guardar" };
        for (const path of ["/a.txt", "../a.txt", "docs//a.txt", "docs/./a.txt", "docs/", "a\\b.txt"]) {
            expect(createCommitSchema.safeParse({ ...input, path }).success).toBe(false);
        }
        for (const branch of ["bad branch", "a..b", "refs//main", ".hidden", "main.lock"]) {
            expect(createCommitSchema.safeParse({ ...input, branch }).success).toBe(false);
        }
    });
});
