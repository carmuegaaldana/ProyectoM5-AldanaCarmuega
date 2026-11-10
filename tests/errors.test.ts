import { describe, expect, it } from "vitest";
import {
    AuthenticationError,
    GitHubAPIError,
    NetworkError,
    ValidationError,
    getRateLimitWaitMs,
    isRateLimitError,
    getErrorStatus,
    isNetworkError,
    toGitHubAPIError,
} from "../src/errors/index.js";

describe("getErrorStatus", () => {
    it("obtiene el estado HTTP de un error", () => {
        expect(getErrorStatus({ status: 404 })).toBe(404);
    });

    it("acepta un error sin estado HTTP", () => {
        expect(getErrorStatus(null)).toBeUndefined();
        expect(getErrorStatus(new Error("Fallo"))).toBeUndefined();
    });
});

describe("errores de red", () => {
    it("reconoce un código de conexión interrumpida", () => {
        const result = isNetworkError({ code: "ECONNRESET" });

        expect(result).toBe(true);
    });

    it("reconoce un código dentro de la causa del error", () => {
        const result = isNetworkError({
            cause: { code: "ETIMEDOUT" },
        });

        expect(result).toBe(true);
    });

    it("no clasifica un error de programación como error de red", () => {
        const result = isNetworkError(new TypeError("Dato inesperado"));

        expect(result).toBe(false);
    });

    it("transforma un fallo de conexión en NetworkError", () => {
        const error = toGitHubAPIError(
            { code: "ECONNRESET" },
            "el repositorio de prueba"
        );

        expect(error).toBeInstanceOf(NetworkError);
        expect(error.message).toContain("problema de red");
        expect(error.message).toContain("antes de repetir");
    });
});

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

    it("preserva un AuthenticationError ya identificado", () => {
        const original = new AuthenticationError(
            "Falta configurar GITHUB_TOKEN en el archivo .env"
        );

        const result = toGitHubAPIError(
            original,
            "el repositorio de prueba"
        );

        expect(result).toBe(original);
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

    it("no expone el mensaje técnico de un error desconocido", () => {
        const error = toGitHubAPIError(
            new Error("Detalle interno que no debe publicarse"),
            "el repositorio de prueba"
        );

        expect(error.message).not.toContain(
            "Detalle interno que no debe publicarse"
        );
        expect(error.message).toContain(
            "No se pudo completar la operación en GitHub"
        );
    });
});


describe("clasificación adicional", () => {
    it("reconoce un fallo de red envuelto por Octokit y fetch", () => {
        const error = { status: 500, cause: { cause: { code: "ENOTFOUND" } } };
        expect(toGitHubAPIError(error, "el repositorio")).toBeInstanceOf(NetworkError);
    });

    it("reconoce un timeout de fetch", () => {
        expect(isNetworkError({ cause: { name: "TimeoutError" } })).toBe(true);
    });

    it("preserva el mensaje de validación controlado por la aplicación", () => {
        const error = new ValidationError("La ruta es una carpeta");
        expect(toGitHubAPIError(error, "el archivo")).toBe(error);
    });

    it("distingue un 403 sin señales de rate limiting", () => {
        expect(isRateLimitError({ status: 403 })).toBe(false);
        expect(toGitHubAPIError({ status: 403 }, "el repositorio").message).toContain("permisos");
    });

    it("reconoce un 403 con el cupo agotado", () => {
        expect(isRateLimitError({ status: 403, response: {
            headers: { "x-ratelimit-remaining": "0" },
        } })).toBe(true);
    });

    it("reconoce un límite secundario informado por GitHub", () => {
        expect(isRateLimitError({ status: 403, message: "You have exceeded a secondary rate limit" }))
            .toBe(true);
    });

    it("informa una espera ante un 429", () => {
        const error = toGitHubAPIError({ status: 429 }, "el repositorio");
        expect(error.status).toBe(429);
        expect(error.message).toContain("60 segundos");
    });

    it("usa la mayor espera entre Retry-After y el reinicio del cupo", () => {
        const error = { status: 429, response: { headers: {
            "retry-after": "2", "x-ratelimit-remaining": "0", "x-ratelimit-reset": "110",
        } } };
        expect(getRateLimitWaitMs(error, 100_000)).toBe(11_000);
    });

    it("mantiene una espera prudente con headers inválidos", () => {
        const error = { status: 429, response: { headers: {
            "retry-after": "desconocido", "x-ratelimit-remaining": "0", "x-ratelimit-reset": "NaN",
        } } };
        expect(getRateLimitWaitMs(error)).toBe(60_000);
    });

    it("convierte un 422 en un error de validación sin filtrar detalles", () => {
        const error = toGitHubAPIError({ status: 422, message: "detalle privado" }, "el repositorio");
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.status).toBe(422);
        expect(error.message).not.toContain("detalle privado");
    });

    it("explica un conflicto sin indicar que se reintente ciegamente", () => {
        const error = toGitHubAPIError({ status: 409 }, "el archivo");
        expect(error.status).toBe(409);
        expect(error.message).toContain("conflicto");
        expect(error.message).toContain("ya se realizó");
    });
});
