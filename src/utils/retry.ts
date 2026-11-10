import {
    getErrorStatus, getRateLimitWaitMs, getResponseHeader,
    isNetworkError, isRateLimitError,
} from "../errors/index.js";
import { logEvent } from "./logging.js";

function getRetryWaitMs(error: unknown, attempt: number): number | undefined {
    if (isRateLimitError(error)) {
        return getRateLimitWaitMs(error) * 2 ** attempt;
    }
    const status = getErrorStatus(error);
    if (isNetworkError(error) || [500, 502, 503, 504].includes(status ?? 0)) {
        // También respetamos Retry-After en respuestas temporales del servidor.
        if (getResponseHeader(error, "retry-after") !== undefined) {
            return Math.max(1000 * 2 ** attempt, getRateLimitWaitMs(error));
        }
        return 1000 * 2 ** attempt;
    }
    return undefined;
}

// Solo para lecturas: un intento inicial y hasta dos reintentos.
// T es el tipo del resultado y permite conservar los tipos de Octokit.
export async function retryRead<T>(operation: () => Promise<T>): Promise<T> {
    const maxAttempts = 3;
    const maxWaitMs = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error: unknown) {
            const waitMs = getRetryWaitMs(error, attempt);
            // Si GitHub pide una espera larga, devolvemos el error: no reintentamos antes.
            if (attempt === maxAttempts - 1 || waitMs === undefined || waitMs > maxWaitMs) {
                throw error;
            }
            logEvent("warn", "github_read_retry", {
                attempt: attempt + 2, waitMs, status: getErrorStatus(error),
            });
            await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        }
    }
    throw new Error("No se pudo completar la lectura");
}
