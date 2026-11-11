import { describe, expect, it } from "vitest";
import {
    AuthenticationError,
    GitHubAPIError,
    toGitHubAPIError,
} from "../src/errors/index.js";

describe("toGitHubAPIError", () => {
    it("transforma un 401 en AuthenticationError", () => {
        const error = toGitHubAPIError(
            { status: 401 },
            "el repositorio de prueba"
        );

        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.status).toBe(401);
        expect(error.message).toContain("GitHub rechazó las credenciales");
    });

    it("incluye el recurso y una orientación ante un 404", () => {
        const error = toGitHubAPIError(
            { status: 404 },
            "el repositorio carmuegaaldana/no-existe"
        );

        expect(error).toBeInstanceOf(GitHubAPIError);
        expect(error.status).toBe(404);
        expect(error.message).toContain("carmuegaaldana/no-existe");
        expect(error.message).toContain("permisos");
    });
});
