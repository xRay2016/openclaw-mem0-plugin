import { version } from "../package.json";

// Telemetry Constants
const MEM0_TELEMETRY = process.env.MEM0_TELEMETRY === "true" ? true : false;
const POSTHOG_API_KEY = "phc_hgJkUVJFYtmaJqrvf6CYN67TIQ8yhXAkWzUn9AMU4yX";
const POSTHOG_HOST = "https://us.i.posthog.com/i/v0/e/";

function generateHash(input: string): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

class UnifiedTelemetry {
  private apiKey: string;
  private host: string;

  constructor(projectApiKey: string, host: string) {
    this.apiKey = projectApiKey;
    this.host = host;
  }

  async captureEvent(distinctId: string, eventName: string, properties: Record<string, any> = {}) {
    if (!MEM0_TELEMETRY) return;
    
    const eventProperties = {
      client_version: version, // Using package version
      timestamp: new Date().toISOString(),
      ...properties,
      $process_person_profile: false,
      $lib: "posthog-node"
    };

    const payload = {
      api_key: this.apiKey,
      distinct_id: distinctId,
      event: eventName,
      properties: eventProperties
    };

    try {
      const response = await fetch(this.host, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error("Telemetry event capture failed:", await response.text());
      }
    } catch (error) {
      console.error("Telemetry event capture failed:", error);
    }
  }
}

const telemetry = new UnifiedTelemetry(POSTHOG_API_KEY, POSTHOG_HOST);

async function captureClientEvent(eventName: string, instance: MemoryClient, additionalData: Record<string, any> = {}) {
  if (!instance.telemetryId) {
    // console.warn("No telemetry ID found for instance");
    return;
  }
  const eventData = {
    function: instance.constructor.name,
    method: eventName,
    api_host: instance.getHost(),
    timestamp: new Date().toISOString(),
    client_version: version,
    keys: additionalData?.keys || [],
    ...additionalData
  };
  await telemetry.captureEvent(
    instance.telemetryId,
    `client.${eventName}`,
    eventData
  );
}

export class APIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "APIError";
  }
}

export interface MemoryClientOptions {
  apiKey: string;
  host?: string;
  organizationName?: string;
  projectName?: string;
  organizationId?: string;
  projectId?: string;
}

export class MemoryClient {
  private apiKey: string;
  private host: string;
  private organizationName: string | null;
  private projectName: string | null;
  private organizationId: string | null;
  private projectId: string | null;
  private headers: Record<string, string>;
  public telemetryId: string;

  constructor(options: MemoryClientOptions) {
    this.apiKey = options.apiKey;
    this.host = options.host || "https://api.mem0.ai";
    this.organizationName = options.organizationName || null;
    this.projectName = options.projectName || null;
    this.organizationId = options.organizationId || null;
    this.projectId = options.projectId || null;

    this.headers = {
      Authorization: `Token ${this.apiKey}`,
      "Content-Type": "application/json"
    };

    this._validateApiKey();
    this.telemetryId = "";
    this._initializeClient();
  }

  getHost() {
    return this.host;
  }

  private _validateApiKey() {
    if (!this.apiKey) {
      throw new Error("Mem0 API key is required");
    }
    if (typeof this.apiKey !== "string") {
      throw new Error("Mem0 API key must be a string");
    }
    if (this.apiKey.trim() === "") {
      throw new Error("Mem0 API key cannot be empty");
    }
  }

  private _validateOrgProject() {
    if ((this.organizationName === null && this.projectName !== null) || (this.organizationName !== null && this.projectName === null)) {
      console.warn(
        "Warning: Both organizationName and projectName must be provided together when using either. This will be removed from version 1.0.40. Note that organizationName/projectName are being deprecated in favor of organizationId/projectId."
      );
    }
    if ((this.organizationId === null && this.projectId !== null) || (this.organizationId !== null && this.projectId === null)) {
      console.warn(
        "Warning: Both organizationId and projectId must be provided together when using either. This will be removed from version 1.0.40."
      );
    }
  }

  private async _initializeClient() {
    try {
      await this.ping();
      if (!this.telemetryId) {
        this.telemetryId = generateHash(this.apiKey);
      }
      this._validateOrgProject();
      captureClientEvent("init", this, {
        api_version: "v1",
        client_type: "MemoryClient"
      }).catch((error) => {
        console.error("Failed to capture event:", error);
      });
    } catch (error: any) {
      console.error("Failed to initialize client:", error);
      await captureClientEvent("init_error", this, {
        error: error?.message || "Unknown error",
        stack: error?.stack || "No stack trace"
      });
    }
  }

  private _captureEvent(methodName: string, args: any[]) {
    captureClientEvent(methodName, this, {
      success: true,
      args_count: args.length,
      keys: args.length > 0 ? args[0] : []
    }).catch((error) => {
      console.error("Failed to capture event:", error);
    });
  }

  private async _fetchWithErrorHandling(url: string, options: RequestInit): Promise<any> {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Token ${this.apiKey}`,
        "Mem0-User-ID": this.telemetryId
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new APIError(`API request failed: ${errorData}`);
    }

    // Handle empty responses (e.g. 204 No Content)
    const text = await response.text();
    if (!text) return {};
    
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
  }

  private _preparePayload(messages: any[], options: any) {
    const payload: any = {};
    payload.messages = messages;
    return { ...payload, ...options };
  }

  private _prepareParams(options: Record<string, any>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(options)
        .filter(([_, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    );
  }

  async ping() {
    try {
      const response = await this._fetchWithErrorHandling(
        `${this.host}/v1/ping/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${this.apiKey}`
          }
        }
      );
      if (!response || typeof response !== "object") {
        throw new APIError("Invalid response format from ping endpoint");
      }
      // Note: Original code checked response.status !== "ok", but simplified response might differ.
      // Assuming standard mem0 response structure.
      
      const { org_id, project_id, user_email } = response;
      if (org_id && !this.organizationId) this.organizationId = org_id;
      if (project_id && !this.projectId) this.projectId = project_id;
      if (user_email) this.telemetryId = user_email;
      
      return response;
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      } else {
        throw new APIError(
          `Failed to ping server: ${error.message || "Unknown error"}`
        );
      }
    }
  }

  async add(messages: Array<{ role: string; content: string }>, options: Record<string, any> = {}) {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    if (this.organizationName != null && this.projectName != null) {
      options.org_name = this.organizationName;
      options.project_name = this.projectName;
    }
    if (this.organizationId != null && this.projectId != null) {
      options.org_id = this.organizationId;
      options.project_id = this.projectId;
      if (options.org_name) delete options.org_name;
      if (options.project_name) delete options.project_name;
    }
    if (options.api_version) {
      options.version = options.api_version.toString() || "v2";
    }
    const payload = this._preparePayload(messages, options);
    const payloadKeys = Object.keys(payload);
    this._captureEvent("add", [payloadKeys]);
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/memories/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload)
      }
    );
    return response;
  }

  async update(memoryId: string, { text, metadata }: { text?: string, metadata?: Record<string, any> }) {
    if (text === undefined && metadata === undefined) {
      throw new Error("Either text or metadata must be provided for update.");
    }
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    const payload = {
      text,
      metadata
    };
    const payloadKeys = Object.keys(payload);
    this._captureEvent("update", [payloadKeys]);
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/memories/${memoryId}/`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify(payload)
      }
    );
    return response;
  }

  async get(memoryId: string) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("get", []);
    return this._fetchWithErrorHandling(
      `${this.host}/v1/memories/${memoryId}/`,
      {
        headers: this.headers
      }
    );
  }

  async getAll(options: Record<string, any> = {}) {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    const payloadKeys = Object.keys(options || {});
    this._captureEvent("get_all", [payloadKeys]);
    const { api_version, page, page_size, ...otherOptions } = options;
    if (this.organizationName != null && this.projectName != null) {
      otherOptions.org_name = this.organizationName;
      otherOptions.project_name = this.projectName;
    }
    let appendedParams = "";
    let paginated_response = false;
    if (page && page_size) {
      appendedParams += `page=${page}&page_size=${page_size}`;
      paginated_response = true;
    }
    if (this.organizationId != null && this.projectId != null) {
      otherOptions.org_id = this.organizationId;
      otherOptions.project_id = this.projectId;
      if (otherOptions.org_name) delete otherOptions.org_name;
      if (otherOptions.project_name) delete otherOptions.project_name;
    }
    if (api_version === "v2") {
      let url = paginated_response ? `${this.host}/v2/memories/?${appendedParams}` : `${this.host}/v2/memories/`;
      return this._fetchWithErrorHandling(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(otherOptions)
      });
    } else {
      const params = new URLSearchParams(this._prepareParams(otherOptions));
      const url = paginated_response ? `${this.host}/v1/memories/?${params}&${appendedParams}` : `${this.host}/v1/memories/?${params}`;
      return this._fetchWithErrorHandling(url, {
        headers: this.headers
      });
    }
  }

  async search(query: string, options: Record<string, any> = {}) {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    const payloadKeys = Object.keys(options || {});
    this._captureEvent("search", [payloadKeys]);
    const { api_version, ...otherOptions } = options;
    const payload: any = { query, ...otherOptions };
    if (this.organizationName != null && this.projectName != null) {
      payload.org_name = this.organizationName;
      payload.project_name = this.projectName;
    }
    if (this.organizationId != null && this.projectId != null) {
      payload.org_id = this.organizationId;
      payload.project_id = this.projectId;
      if (payload.org_name) delete payload.org_name;
      if (payload.project_name) delete payload.project_name;
    }
    const endpoint = api_version === "v2" ? "/v2/memories/search/" : "/v1/memories/search/";
    const response = await this._fetchWithErrorHandling(
      `${this.host}${endpoint}`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload)
      }
    );
    return response;
  }

  async delete(memoryId: string) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("delete", []);
    return this._fetchWithErrorHandling(
      `${this.host}/v1/memories/${memoryId}/`,
      {
        method: "DELETE",
        headers: this.headers
      }
    );
  }

  async deleteAll(options: Record<string, any> = {}) {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    const payloadKeys = Object.keys(options || {});
    this._captureEvent("delete_all", [payloadKeys]);
    if (this.organizationName != null && this.projectName != null) {
      options.org_name = this.organizationName;
      options.project_name = this.projectName;
    }
    if (this.organizationId != null && this.projectId != null) {
      options.org_id = this.organizationId;
      options.project_id = this.projectId;
      if (options.org_name) delete options.org_name;
      if (options.project_name) delete options.project_name;
    }
    const params = new URLSearchParams(this._prepareParams(options));
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/memories/?${params}`,
      {
        method: "DELETE",
        headers: this.headers
      }
    );
    return response;
  }

  async history(memoryId: string) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("history", []);
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/memories/${memoryId}/history/`,
      {
        headers: this.headers
      }
    );
    return response;
  }

  async users() {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    this._captureEvent("users", []);
    const options: any = {};
    if (this.organizationName != null && this.projectName != null) {
      options.org_name = this.organizationName;
      options.project_name = this.projectName;
    }
    if (this.organizationId != null && this.projectId != null) {
      options.org_id = this.organizationId;
      options.project_id = this.projectId;
      if (options.org_name) delete options.org_name;
      if (options.project_name) delete options.project_name;
    }
    const params = new URLSearchParams(options);
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/entities/?${params}`,
      {
        headers: this.headers
      }
    );
    return response;
  }

  async deleteUser(data: { entity_type?: string, entity_id: string }) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("delete_user", []);
    if (!data.entity_type) {
      data.entity_type = "user";
    }
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/entities/${data.entity_type}/${data.entity_id}/`,
      {
        method: "DELETE",
        headers: this.headers
      }
    );
    return response;
  }

  async deleteUsers(params: { user_id?: string, agent_id?: string, app_id?: string, run_id?: string } = {}) {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    let to_delete: Array<{ type: string, name: string }> = [];
    const { user_id, agent_id, app_id, run_id } = params;
    
    if (user_id) {
      to_delete = [{ type: "user", name: user_id }];
    } else if (agent_id) {
      to_delete = [{ type: "agent", name: agent_id }];
    } else if (app_id) {
      to_delete = [{ type: "app", name: app_id }];
    } else if (run_id) {
      to_delete = [{ type: "run", name: run_id }];
    } else {
      const entities = await this.users();
      to_delete = entities.results.map((entity: any) => ({
        type: entity.type,
        name: entity.name
      }));
    }
    if (to_delete.length === 0) {
      throw new Error("No entities to delete");
    }
    
    const requestOptions: any = {};
    if (this.organizationName != null && this.projectName != null) {
      requestOptions.org_name = this.organizationName;
      requestOptions.project_name = this.projectName;
    }
    if (this.organizationId != null && this.projectId != null) {
      requestOptions.org_id = this.organizationId;
      requestOptions.project_id = this.projectId;
      if (requestOptions.org_name) delete requestOptions.org_name;
      if (requestOptions.project_name) delete requestOptions.project_name;
    }

    for (const entity of to_delete) {
      try {
        const queryParams = new URLSearchParams(this._prepareParams(requestOptions));
        await this._fetchWithErrorHandling(
            `${this.host}/v2/entities/${entity.type}/${entity.name}/?${queryParams.toString()}`,
            { method: "DELETE", headers: this.headers }
        );
      } catch (error: any) {
        throw new APIError(
          `Failed to delete ${entity.type} ${entity.name}: ${error.message}`
        );
      }
    }
    this._captureEvent("delete_users", [
      {
        user_id,
        agent_id,
        app_id,
        run_id,
        sync_type: "sync"
      }
    ]);
    return {
      message: user_id || agent_id || app_id || run_id ? "Entity deleted successfully." : "All users, agents, apps and runs deleted."
    };
  }

  async batchUpdate(memories: Array<{ memoryId: string, text: string }>) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("batch_update", []);
    const memoriesBody = memories.map((memory) => ({
      memory_id: memory.memoryId,
      text: memory.text
    }));
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/batch/`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({ memories: memoriesBody })
      }
    );
    return response;
  }

  async batchDelete(memories: string[]) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("batch_delete", []);
    const memoriesBody = memories.map((memory) => ({
      memory_id: memory
    }));
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/batch/`,
      {
        method: "DELETE",
        headers: this.headers,
        body: JSON.stringify({ memories: memoriesBody })
      }
    );
    return response;
  }

  async getProject(options: { fields?: string[] } = {}) {
    if (this.telemetryId === "") await this.ping();
    this._validateOrgProject();
    const payloadKeys = Object.keys(options || {});
    this._captureEvent("get_project", [payloadKeys]);
    const { fields } = options;
    if (!(this.organizationId && this.projectId)) {
      throw new Error(
        "organizationId and projectId must be set to access instructions or categories"
      );
    }
    const params = new URLSearchParams();
    fields?.forEach((field) => params.append("fields", field));
    const response = await this._fetchWithErrorHandling(
      `${this.host}/api/v1/orgs/organizations/${this.organizationId}/projects/${this.projectId}/?${params.toString()}`,
      {
        headers: this.headers
      }
    );
    return response;
  }

  // WebHooks
  async getWebhooks(data?: { projectId?: string }) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("get_webhooks", []);
    const project_id = data?.projectId || this.projectId;
    const response = await this._fetchWithErrorHandling(
      `${this.host}/api/v1/webhooks/projects/${project_id}/`,
      {
        headers: this.headers
      }
    );
    return response;
  }

  async createWebhook(webhook: any) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("create_webhook", []);
    const response = await this._fetchWithErrorHandling(
      `${this.host}/api/v1/webhooks/projects/${this.projectId}/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(webhook)
      }
    );
    return response;
  }

  async updateWebhook(webhook: { webhookId: string, projectId?: string, [key: string]: any }) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("update_webhook", []);
    const project_id = webhook.projectId || this.projectId;
    const response = await this._fetchWithErrorHandling(
      `${this.host}/api/v1/webhooks/${webhook.webhookId}/`,
      {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({
          ...webhook,
          projectId: project_id
        })
      }
    );
    return response;
  }

  async deleteWebhook(data: { webhookId?: string } | string) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("delete_webhook", []);
    const webhook_id = typeof data === 'string' ? data : data.webhookId;
    const response = await this._fetchWithErrorHandling(
      `${this.host}/api/v1/webhooks/${webhook_id}/`,
      {
        method: "DELETE",
        headers: this.headers
      }
    );
    return response;
  }

  async feedback(data: any) {
    if (this.telemetryId === "") await this.ping();
    const payloadKeys = Object.keys(data || {});
    this._captureEvent("feedback", [payloadKeys]);
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/feedback/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data)
      }
    );
    return response;
  }

  async createMemoryExport(data: { filters: any, schema: any, org_id?: string | null, project_id?: string | null }) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("create_memory_export", []);
    if (!data.filters || !data.schema) {
      throw new Error("Missing filters or schema");
    }
    data.org_id = this.organizationId?.toString() || null;
    data.project_id = this.projectId?.toString() || null;
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/exports/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data)
      }
    );
    return response;
  }

  async getMemoryExport(data: { memory_export_id?: string, filters?: any, org_id?: string, project_id?: string }) {
    if (this.telemetryId === "") await this.ping();
    this._captureEvent("get_memory_export", []);
    if (!data.memory_export_id && !data.filters) {
      throw new Error("Missing memory_export_id or filters");
    }
    data.org_id = this.organizationId?.toString() || "";
    data.project_id = this.projectId?.toString() || "";
    const response = await this._fetchWithErrorHandling(
      `${this.host}/v1/exports/get/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(data)
      }
    );
    return response;
  }
}
