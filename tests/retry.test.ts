import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retryRead } from "../src/utils/retry.js";

beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("reintentos de lectura", () => {
    it("devuelve una respuesta exitosa sin reintentar", async () => {
        const operation = vi.fn().mockResolvedValue("ok");
        expect(await retryRead(operation)).toBe("ok");
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it("espera 1 y 2 segundos antes de los siguientes intentos", async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce({ code: "ECONNRESET" })
            .mockRejectedValueOnce({ status: 503 })
            .mockResolvedValue("ok");
        const result = retryRead(operation);
        await vi.advanceTimersByTimeAsync(999);
        expect(operation).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(operation).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(1999);
        expect(operation).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(1);
        expect(await result).toBe("ok");
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it("se detiene después de tres intentos", async () => {
        const error = { status: 503 };
        const operation = vi.fn().mockRejectedValue(error);
        const rejection = expect(retryRead(operation)).rejects.toBe(error);
        await vi.runAllTimersAsync();
        await rejection;
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it("no reintenta autenticación, permisos, recursos ausentes o validación", async () => {
        for (const status of [401, 403, 404, 409, 422]) {
            const error = { status };
            const operation = vi.fn().mockRejectedValue(error);
            await expect(retryRead(operation)).rejects.toBe(error);
            expect(operation).toHaveBeenCalledTimes(1);
        }
        expect(vi.getTimerCount()).toBe(0);
    });

    it("respeta Retry-After antes de repetir un 429", async () => {
        const operation = vi.fn().mockRejectedValueOnce({
            status: 429, response: { headers: { "retry-after": "2" } },
        }).mockResolvedValue("ok");
        const result = retryRead(operation);
        await vi.advanceTimersByTimeAsync(1999);
        expect(operation).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(await result).toBe("ok");
    });

    it("respeta el reinicio del cupo en un 403", async () => {
        vi.setSystemTime(100_000);
        const operation = vi.fn().mockRejectedValueOnce({
            status: 403, response: { headers: {
                "x-ratelimit-remaining": "0", "x-ratelimit-reset": "102",
            } },
        }).mockResolvedValue("ok");
        const result = retryRead(operation);
        await vi.advanceTimersByTimeAsync(2999);
        expect(operation).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(await result).toBe("ok");
    });

    it("devuelve el error si GitHub exige una espera larga, sin reintentar antes", async () => {
        const error = { status: 429, response: { headers: { "retry-after": "120" } } };
        const operation = vi.fn().mockRejectedValue(error);
        await expect(retryRead(operation)).rejects.toBe(error);
        expect(operation).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("no repite un límite secundario sin esperar el mínimo de un minuto", async () => {
        const error = { status: 403, message: "Secondary rate limit exceeded" };
        const operation = vi.fn().mockRejectedValue(error);
        await expect(retryRead(operation)).rejects.toBe(error);
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it("respeta Retry-After también en un 503", async () => {
        const error = { status: 503, response: { headers: { "retry-after": "30" } } };
        const operation = vi.fn().mockRejectedValue(error);
        await expect(retryRead(operation)).rejects.toBe(error);
        expect(operation).toHaveBeenCalledTimes(1);
    });
});
