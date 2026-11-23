import { extractItems } from "./parse";

export class AlfaHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type AlfaConfig = {
  host: string;
  email: string;
  apiKey: string;
  branchId: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AlfaCrmClient {
  private token: string | null = null;
  private tokenAt = 0;

  constructor(private readonly config: AlfaConfig) {}

  private origin() {
    const host = this.config.host.trim().replace(/\/+$/, "").replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  private async login() {
    const response = await fetch(`${this.origin()}/v2api/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: this.config.email,
        api_key: this.config.apiKey,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload || typeof payload !== "object" || !("token" in payload)) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : "не удалось получить токен";
      throw new AlfaHttpError(`Авторизация AlfaCRM: ${message}`, response.status);
    }
    this.token = String(payload.token);
    this.tokenAt = Date.now();
  }

  private async ensureToken() {
    if (!this.token || Date.now() - this.tokenAt > 50 * 60 * 1000) {
      await this.login();
    }
  }

  async post(path: string, body: unknown = {}, retry = true): Promise<unknown> {
    await this.ensureToken();
    await sleep(220);
    const response = await fetch(`${this.origin()}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-ALFACRM-TOKEN": this.token ?? "",
      },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(25_000),
    });
    if (response.status === 401 && retry) {
      this.token = null;
      await this.login();
      return this.post(path, body, false);
    }
    const text = await response.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text.slice(0, 240) };
      }
    }
    if (!response.ok) {
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const message = String(record.message || record.name || `ошибка ${response.status}`);
      throw new AlfaHttpError(`${path}: ${message}`, response.status);
    }
    return payload;
  }

  async indexAll(path: string, filters: Record<string, unknown>, pageSize = 100) {
    const items: Record<string, unknown>[] = [];
    for (let page = 0; page < 20; page += 1) {
      const payload = await this.post(path, { ...filters, page, pageSize });
      const chunk = extractItems(payload);
      items.push(...chunk);
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const total = typeof record.total === "number" ? record.total : null;
      if (chunk.length === 0) break;
      if (total != null && items.length >= total) break;
      if (chunk.length < pageSize) break;
    }
    return items;
  }

  branchPath(controller: string, action: string, query = "") {
    return `/v2api/${this.config.branchId}/${controller}/${action}${query}`;
  }
}

export type AlfaApi = {
  mode: "live" | "mock";
  fetchCustomer(id: number): Promise<Record<string, unknown> | null>;
  fetchBonusBalance(id: number): Promise<unknown>;
  fetchBonusHistory(id: number): Promise<{ supported: boolean; items: Record<string, unknown>[]; note?: string }>;
  fetchMemberships(id: number): Promise<Record<string, unknown>[]>;
  fetchGroups(ids: number[]): Promise<Record<string, unknown>[]>;
  fetchLessons(filter: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  fetchSubjects(): Promise<Record<string, unknown>[]>;
  fetchStudyStatuses(): Promise<Record<string, unknown>[]>;
  fetchTests(id: number): Promise<{ supported: boolean; items: Record<string, unknown>[]; note?: string }>;
};

function unsupported(error: unknown) {
  return error instanceof AlfaHttpError && (error.status === 404 || error.status === 405);
}

export class LiveAlfaApi implements AlfaApi {
  mode = "live" as const;
  private readonly client: AlfaCrmClient;

  constructor(config: AlfaConfig) {
    this.client = new AlfaCrmClient(config);
  }

  async fetchCustomer(id: number) {
    const items = await this.client.indexAll(this.client.branchPath("customer", "index"), {
      id,
      is_study: 1,
      removed: 1,
      withGroups: true,
    });
    return items.find((item) => Number(item.id) === id) ?? items[0] ?? null;
  }

  fetchBonusBalance(id: number) {
    return this.client.post(this.client.branchPath("bonus", "balance-bonus", `?customer_id=${id}`), {});
  }

  async fetchBonusHistory(id: number) {
    try {
      const items = await this.client.indexAll(this.client.branchPath("bonus", "index"), {
        customer_id: id,
      });
      return { supported: true, items };
    } catch (error) {
      if (unsupported(error)) {
        return {
          supported: false,
          items: [],
          note: "bonus/index отвечает 404: история бонусов на этом ключе недоступна. Баланс берётся из поля клиента balance_bonus, начисления — из поля bonus в деталях урока.",
        };
      }
      throw error;
    }
  }

  fetchMemberships(id: number) {
    return this.client.indexAll(this.client.branchPath("cgi", "customer", `?customer_id=${id}`), {
      customer_id: id,
    });
  }

  async fetchGroups(ids: number[]) {
    if (ids.length === 0) return [];
    return this.client.indexAll(this.client.branchPath("group", "index"), {
      ids,
      removed: 1,
    });
  }

  fetchLessons(filter: Record<string, unknown>) {
    return this.client.indexAll(this.client.branchPath("lesson", "index"), filter);
  }

  fetchSubjects() {
    return this.client.indexAll(this.client.branchPath("subject", "index"), {});
  }

  fetchStudyStatuses() {
    return this.client.indexAll(this.client.branchPath("study-status", "index"), {});
  }

  async fetchTests(id: number) {
    try {
      const items = await this.client.indexAll(this.client.branchPath("test-result", "index"), {
        customer_id: id,
      });
      return { supported: true, items };
    } catch (error) {
      if (unsupported(error)) {
        return {
          supported: false,
          items: [],
          note: "Метод test-result/index недоступен. Результаты тестов заполняются в админке.",
        };
      }
      throw error;
    }
  }
}

export function readAlfaConfig() {
  if (process.env.ALFACRM_MOCK === "1") return null;
  const host = process.env.ALFACRM_HOST?.trim() ?? "";
  const email = process.env.ALFACRM_EMAIL?.trim() ?? "";
  const apiKey = process.env.ALFACRM_API_KEY?.trim() ?? "";
  const branchId = process.env.ALFACRM_BRANCH_ID?.trim() ?? "";
  if (!host || !email || !apiKey || !branchId) return null;
  if (!/^\d+$/.test(branchId)) {
    throw new Error("ALFACRM_BRANCH_ID должен быть целым числом филиала.");
  }
  return { host, email, apiKey, branchId };
}

export function alfaMode(): "live" | "mock" {
  return readAlfaConfig() ? "live" : "mock";
}
