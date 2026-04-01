import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlfaBankClient } from "./client.js";

const mockConfig = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  baseUrl: "https://test.alfabank.ru",
};

describe("AlfaBankClient", () => {
  let client: AlfaBankClient;

  beforeEach(() => {
    client = new AlfaBankClient(mockConfig);
    vi.restoreAllMocks();
  });

  it("should authenticate and list accounts", async () => {
    const mockAccounts = [
      { id: "acc1", number: "40702810000000001234", currency: "RUB", name: "Main", status: "ACTIVE", type: "CHECKING" },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccounts,
      } as Response);

    const result = await client.listAccounts();
    expect(result).toEqual(mockAccounts);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("should get account balance", async () => {
    const mockBalance = { accountId: "acc1", amount: 150000, currency: "RUB", date: "2026-04-01" };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalance,
      } as Response);

    const result = await client.getAccountBalance("acc1");
    expect(result.amount).toBe(150000);
  });

  it("should retry on 429 rate limit", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "Rate limited",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

    const result = await client.listAccounts();
    expect(result).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("should retry on 401 and re-authenticate", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-old", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-new", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "acc1" }],
      } as Response);

    const result = await client.listAccounts();
    expect(result).toEqual([{ id: "acc1" }]);
  });

  it("should throw on non-retryable HTTP error", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

    await expect(client.listAccounts()).rejects.toThrow("Alfa-Bank API error 500");
  });

  it("should create payment order", async () => {
    const mockOrder = {
      id: "pay1",
      status: "CREATED",
      fromAccount: "40702810000000001234",
      toAccount: "40702810000000005678",
      toBik: "044525225",
      amount: 50000,
      currency: "RUB",
      purpose: "Test payment",
      createdAt: "2026-04-01T12:00:00Z",
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok123", token_type: "Bearer", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      } as Response);

    const result = await client.createPaymentOrder({
      fromAccount: "40702810000000001234",
      toAccount: "40702810000000005678",
      toBik: "044525225",
      amount: 50000,
      purpose: "Test payment",
    });
    expect(result.id).toBe("pay1");
    expect(result.status).toBe("CREATED");
  });

  it("should throw on auth failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Invalid credentials",
    } as Response);

    await expect(client.listAccounts()).rejects.toThrow("Auth failed");
  });
});
