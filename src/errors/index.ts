export class GitHubAPIError extends Error {
    constructor(message: string, public readonly status?: number) {
        super(message);
        this.name = "GitHubAPIError";
    }
}

export class AuthenticationError extends GitHubAPIError {
    constructor(message: string, status?: number) {
        super(message, status);
        this.name = "AuthenticationError";
    }
}

export class NetworkError extends GitHubAPIError {
    constructor() {
        super(
            "No se pudo confirmar la respuesta de GitHub por un problema de red. " +
            "Verificá la conexión. Si estabas creando o modificando un recurso, " +
            "comprobá su estado en GitHub antes de repetir la operación."
        );
        this.name = "NetworkError";
    }
}

export class ValidationError extends GitHubAPIError {
    constructor(message: string, status?: number) {
        super(message, status);
        this.name = "ValidationError";
    }
}

export function getErrorStatus(error: unknown): number | undefined {
    if (error !== null && typeof error === "object" &&
        "status" in error && typeof error.status === "number") {
        return error.status;
    }
    return undefined;
}

// Octokit puede envolver el fallo de fetch, que a su vez guarda otra causa.
export function isNetworkError(error: unknown): boolean {
    const codes = [
        "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT",
        "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT",
        "UND_ERR_BODY_TIMEOUT", "UND_ERR_SOCKET",
    ];
    let current = error;
    for (let depth = 0; depth < 4; depth++) {
        if (current === null || typeof current !== "object") return false;
        if ("name" in current && current.name === "TimeoutError") return true;
        if ("code" in current && typeof current.code === "string" &&
            codes.includes(current.code)) return true;
        current = "cause" in current ? current.cause : undefined;
    }
    return false;
}

export function getResponseHeader(error: unknown, name: string): string | undefined {
    if (error === null || typeof error !== "object" || !("response" in error)) {
        return undefined;
    }
    const response = error.response;
    if (response === null || typeof response !== "object" || !("headers" in response)) {
        return undefined;
    }
    const headers = response.headers;
    if (headers === null || typeof headers !== "object" || !(name in headers)) {
        return undefined;
    }
    const value = (headers as Record<string, unknown>)[name];
    if (typeof value === "string" || typeof value === "number") return String(value);
    return undefined;
}

export function isRateLimitError(error: unknown): boolean {
    const status = getErrorStatus(error);
    if (status === 429) return true;
    if (status !== 403) return false;
    if (getResponseHeader(error, "x-ratelimit-remaining") === "0" ||
        getResponseHeader(error, "retry-after") !== undefined) return true;

    // Los límites secundarios también pueden identificarse por el mensaje.
    if (error !== null && typeof error === "object" &&
        "message" in error && typeof error.message === "string") {
        const message = error.message.toLowerCase();
        return message.includes("rate limit") || message.includes("abuse detection");
    }
    return false;
}

// GitHub recomienda esperar al menos un minuto si no indica otro plazo.
export function getRateLimitWaitMs(error: unknown, now = Date.now()): number {
    let wait: number | undefined;
    const retryAfter = getResponseHeader(error, "retry-after");
    if (retryAfter !== undefined) {
        const seconds = Number(retryAfter);
        if (retryAfter.trim() !== "" && Number.isFinite(seconds) && seconds >= 0) {
            wait = seconds * 1000;
        } else {
            const date = Date.parse(retryAfter);
            if (Number.isFinite(date)) wait = Math.max(0, date - now);
        }
    }
    if (getResponseHeader(error, "x-ratelimit-remaining") === "0") {
        const reset = Number(getResponseHeader(error, "x-ratelimit-reset"));
        if (Number.isFinite(reset) && reset > 0) {
            wait = Math.max(wait ?? 0, reset * 1000 - now + 1000);
        } else {
            wait = Math.max(wait ?? 0, 60_000);
        }
    }
    return Math.max(1000, wait ?? 60_000);
}

export function toGitHubAPIError(error: unknown, resource: string): GitHubAPIError {
    if (error instanceof GitHubAPIError) return error;
    if (isNetworkError(error)) return new NetworkError();
    const status = getErrorStatus(error);

    if (status === 401) {
        return new AuthenticationError(
            "GitHub rechazó las credenciales. " +
            "Verificá que GITHUB_TOKEN sea válido y no haya expirado.", status
        );
    }
    if (isRateLimitError(error)) {
        const seconds = Math.ceil(getRateLimitWaitMs(error) / 1000);
        return new GitHubAPIError(
            `GitHub limitó temporalmente las solicitudes. Esperá al menos ${seconds} segundos ` +
            "antes de volver a intentar la operación.", status
        );
    }
    if (status === 403) {
        return new GitHubAPIError(
            "GitHub bloqueó la operación. Revisá los permisos del token y las " +
            "restricciones de acceso. También puede tratarse de un límite de solicitudes; " +
            "evitá repetirla de inmediato.", status
        );
    }
    if (status === 404) {
        return new GitHubAPIError(
            `No se encontró ${resource} o no tenés acceso. ` +
            "Verificá el nombre y los permisos del token.", status
        );
    }
    if (status === 409) {
        return new GitHubAPIError(
            "GitHub detectó un conflicto. Actualizá el estado del repositorio y " +
            "verificá si el cambio ya se realizó antes de volver a intentarlo.", status
        );
    }
    if (status === 422) {
        return new ValidationError(
            "GitHub rechazó los datos. Verificá los parámetros, las restricciones " +
            "del repositorio y si el recurso ya existe. También puede ser una protección contra spam.", status
        );
    }
    if (status !== undefined && status >= 500) {
        return new GitHubAPIError(
            "GitHub no pudo completar la respuesta. Si estabas creando o modificando " +
            "un recurso, verificá su estado antes de repetir la operación.", status
        );
    }
    return new GitHubAPIError(
        "No se pudo completar la operación en GitHub. " +
        "Verificá la configuración y la conexión.", status
    );
}
