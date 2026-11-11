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
});
