import type {
  AlfaAuthConfig,
  AlfaTokenResponse,
  AlfaAccount,
  AlfaBalance,
  AlfaStatement,
  AlfaPaymentOrder,
  AlfaCounterparty,
  AlfaExchangeRate,
  AlfaSalaryRegistry,
} from "./types.js";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;

export class AlfaBankClient {
  private config: AlfaAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: AlfaAuthConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const resp = await fetch(`${this.config.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Auth failed: ${resp.status} ${await resp.text()}`);
    }

    const data = (await resp.json()) as AlfaTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    attempt = 1
  ): Promise<T> {
    const token = await this.getAccessToken();

    const resp = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (resp.status === 401) {
      this.accessToken = null;
      if (attempt <= 2) {
        return this.request<T>(method, path, body, attempt + 1);
      }
      throw new Error("Authentication failed after retry");
    }

    if (resp.status === 429 && attempt <= MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
      return this.request<T>(method, path, body, attempt + 1);
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Alfa-Bank API error ${resp.status}: ${errorText}`);
    }

    return resp.json() as Promise<T>;
  }

  async listAccounts(): Promise<AlfaAccount[]> {
    return this.request<AlfaAccount[]>("GET", "/api/v1/accounts");
  }

  async getAccountBalance(accountId: string): Promise<AlfaBalance> {
    return this.request<AlfaBalance>(
      "GET",
      `/api/v1/accounts/${accountId}/balance`
    );
  }

  async getAccountStatement(
    accountId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<AlfaStatement> {
    return this.request<AlfaStatement>(
      "GET",
      `/api/v1/accounts/${accountId}/statement?dateFrom=${dateFrom}&dateTo=${dateTo}`
    );
  }

  async createPaymentOrder(params: {
    fromAccount: string;
    toAccount: string;
    toBik: string;
    amount: number;
    purpose: string;
  }): Promise<AlfaPaymentOrder> {
    return this.request<AlfaPaymentOrder>("POST", "/api/v1/payments", {
      from_account: params.fromAccount,
      to_account: params.toAccount,
      to_bik: params.toBik,
      amount: params.amount,
      purpose: params.purpose,
    });
  }

  async getPaymentStatus(paymentId: string): Promise<AlfaPaymentOrder> {
    return this.request<AlfaPaymentOrder>(
      "GET",
      `/api/v1/payments/${paymentId}`
    );
  }

  async listCounterparties(): Promise<AlfaCounterparty[]> {
    return this.request<AlfaCounterparty[]>("GET", "/api/v1/counterparties");
  }

  async getExchangeRates(): Promise<AlfaExchangeRate[]> {
    return this.request<AlfaExchangeRate[]>("GET", "/api/v1/exchange-rates");
  }

  async getSalaryRegistry(): Promise<AlfaSalaryRegistry[]> {
    return this.request<AlfaSalaryRegistry[]>("GET", "/api/v1/salary/registry");
  }
}
