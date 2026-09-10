---
name: manus-api
description: Manage tasks, projects, and other data through the Manus API; build OAuth2 Open Apps and third-party integrations; create Manus tasks programmatically; or install and use the official Manus API skill for services and workflows that need agentic capabilities.
---

# Manus API Integration Guide

Use this skill when building or troubleshooting integrations that call the Manus API, automate Manus agents, retrieve generated results, manage projects/files/webhooks/connectors/agents/usage, request structured JSON outputs, publish websites created by Manus tasks, or implement OAuth2 authorization for third-party apps.

This file is the **routing and decision guide**. Keep implementation details in the live official documentation under `https://open.manus.ai/docs/`. When a user asks for exact request bodies, response schemas, validation rules, rate limits, or endpoint-specific edge cases, open the relevant API v2 page instead of relying on this overview.

**Version policy.** Use **API v2** for all new work. Use the [API v1 documentation](https://open.manus.ai/docs/v1/overview) only when the user is maintaining an existing v1 integration, because v1 is deprecated.

**Base URL and authentication.** Send requests to `https://api.manus.ai`. Use `x-manus-api-key: <key>` for your own integrations and scripts, or `Authorization: Bearer <access_token>` for an Open App acting on behalf of a user. Successful responses use an `ok: true` envelope; failures use `ok: false` with `error.code`, `error.message`, and `request_id`. Standard OAuth tokens are scoped and cannot access API-key-only endpoints; trusted team and trusted public apps bypass scope restrictions. Open the endpoint page to confirm its supported authentication methods.

---

## 1. Documentation Routing

Prefer reading the smallest relevant document before answering detailed implementation questions. For endpoint-specific parameters, open `https://open.manus.ai/docs/v2/<endpoint>`; for the full schema, inspect the [API v2 OpenAPI specification](https://open.manus.ai/docs/v2/openapi_v2.json).

| User intent | Read first |
| --- | --- |
| Create, continue, stop, delete, or inspect tasks | [Task lifecycle](https://open.manus.ai/docs/v2/task-lifecycle), then the relevant `task.*` endpoint page |
| Require JSON output that an application can parse | [Structured output](https://open.manus.ai/docs/v2/structured-output) |
| Publish or manage a website built by an agent | [Website guide](https://open.manus.ai/docs/v2/website), then the relevant `website.*` endpoint page |
| Upload or reference user files | [file.upload](https://open.manus.ai/docs/v2/file.upload), [file.detail](https://open.manus.ai/docs/v2/file.detail), [file.delete](https://open.manus.ai/docs/v2/file.delete) |
| Configure real-time callbacks | [Webhooks overview](https://open.manus.ai/docs/v2/webhooks-overview), [Webhook security](https://open.manus.ai/docs/v2/webhooks-security) |
| Add durable instructions/persona | [project.create](https://open.manus.ai/docs/v2/project.create), [project.list](https://open.manus.ai/docs/v2/project.list) |
| Use connectors, skills, agents, or browser clients | [Connectors](https://open.manus.ai/docs/v2/connectors), [connector.list](https://open.manus.ai/docs/v2/connector.list), [skill.list](https://open.manus.ai/docs/v2/skill.list), [Agents overview](https://open.manus.ai/docs/v2/agents-overview), [browser.onlineList](https://open.manus.ai/docs/v2/browser.onlineList) |
| Inspect usage, quotas, or logs | [usage.list](https://open.manus.ai/docs/v2/usage.list), [usage.teamStatistic](https://open.manus.ai/docs/v2/usage.teamStatistic), [usage.teamLog](https://open.manus.ai/docs/v2/usage.teamLog), [Rate limits](https://open.manus.ai/docs/v2/rate-limits) |
| Build an Open App or authorize on behalf of users | [Open App](https://open.manus.ai/docs/v2/open-app), [Authentication](https://open.manus.ai/docs/v2/authentication) |
| Install the website-hosted Manus API skill | [Manus API skill](https://open.manus.ai/docs/v2/manus-api-skill) |

---

## 2. Endpoint Map

Use this map for orientation only. Open the endpoint page for concrete request and response details.

| Group | Purpose | Representative endpoints |
| --- | --- | --- |
| **Tasks** | Agent task lifecycle and multi-turn conversation. | `task.create`, `task.sendMessage`, `task.listMessages`, `task.confirmAction`, `task.stop` |
| **Projects** | Durable shared instructions and organization. | `project.create`, `project.list` |
| **Files** | Upload, inspect, and delete files used by tasks. | `file.upload`, `file.detail`, `file.delete` |
| **Webhooks** | Production-grade task lifecycle notifications. | `webhook.create`, `webhook.list`, `webhook.delete`, `webhook.publicKey` |
| **Connectors and Skills** | Control third-party app access and skill availability. | `connector.list`, `skill.list` |
| **Agents** | List, inspect, and update custom IM agents. | `agent.list`, `agent.detail`, `agent.update` |
| **Usage** | Retrieve usage records and team statistics. | `usage.list`, `usage.teamStatistic`, `usage.teamLog` |
| **Website** | Inspect, publish, version, and update websites built by Manus tasks. | `website.status`, `website.listCheckpoints`, `website.publish`, `website.update` |

---

## 3. Core Integration Decisions

**Choose the right authentication method.** Use an API key for first-party integrations and scripts. Use OAuth2 when building an Open App that acts on behalf of users. Standard `team` apps are restricted by configured scopes: `create_task`, `manage_all_tasks`, `create_project`, `use_connectors`, and `use_my_browsers`. The `create_task` scope only exposes tasks created by the same app. Standard OAuth tokens cannot access `agent.*`, `webhook.*`, `usage.*`, or `website.*`; trusted team and trusted public apps have full access like an API key. Open App creation and standard authorization require a Team account, while trusted public apps are partner-only. Read the [Open App guide](https://open.manus.ai/docs/v2/open-app) before implementing OAuth2.

**Choose the right task flow.** For a new independent job, call `task.create`. For an ongoing thread or conversation, store the `task_id` and call `task.sendMessage` on later turns. For direct messaging to the default IM agent, `task.sendMessage` supports the shortcut `task_id: "agent-default-main_task"`.

**Use projects for durable behavior.** If the integration needs a persistent persona, formatting rule, or reusable instruction, create or reuse a Project and pass `project_id` when creating tasks. Do not duplicate large system-style instructions into every user message if a project is the cleaner abstraction.

**Use webhooks for production result delivery.** Polling `task.listMessages` is acceptable for scripts and prototypes, but production systems should prefer webhooks and verify signatures with the webhook public key. Still implement idempotency and retries because webhook delivery can be repeated by clients or infrastructure.

**Handle waiting states correctly.** If the agent asks the user a normal question, answer with `task.sendMessage`. If the agent is waiting for an action confirmation such as sending an email or deploying something, use `task.confirmAction` instead. Read [Task lifecycle](https://open.manus.ai/docs/v2/task-lifecycle) and [task.confirmAction](https://open.manus.ai/docs/v2/task.confirmAction) before automating confirmations.

**Pick agent profile intentionally.** `task.create` and `task.sendMessage` accept the stable `agent_profile` values `standard`, `lite`, and `max`. Omitting the field on `task.create` defaults to `standard`; omitting it on `task.sendMessage` keeps the task's current profile, while passing a value overrides the current and subsequent turns. Versioned profile names are compatibility aliases, not independent model selections. Use the endpoint docs for their accepted format.

**Attach tools through message fields.** Use `message.connectors` for connector IDs, `message.enable_skills` to control available skills, and `message.force_skills` when a skill must be invoked. Use `connector.list` and `skill.list` to discover IDs.

**Reference existing tasks to reuse prior work.** Pass `message.task_references` (task IDs) on `task.create` or `task.sendMessage` so the agent can browse those tasks' conversation and files on demand instead of you re-sending their content. References **accumulate** across turns and cannot be cleared, unlike connectors. Access is enforced when the agent reads, so referencing an unreachable task does not fail the request — except for a `create_task`-scope OAuth App, which may reference only its own tasks.

---

## 4. Structured Output Guidance

Use **Structured Output** when the integration needs machine-parseable JSON rather than human-facing prose. Before writing schemas or code, read the [Structured output guide](https://open.manus.ai/docs/v2/structured-output).

Remember only the routing-level behavior here: pass `structured_output_schema` to `task.create` or `task.sendMessage`; extraction runs after the agent finishes; schemas are **arm once, fire once** and can be re-armed on later turns; results appear in `task.listMessages` as `structured_output_result` or in webhooks as `task_stopped.task_detail.structured_output`. Always check `success` before trusting `value`.

---

## 5. Operational Limits

Confirm limits in the relevant endpoint page before relying on them because they may change.

- User text is limited to approximately **5,000 estimated tokens per request**. This applies to v1 task prompts, OpenAI-compatible Responses input, and v2 `task.create` / `task.sendMessage`; multipart input is estimated across all text parts combined, while file parts do not count.
- `file.upload` accepts files up to **512 MB** and enforces **10 GB** total storage per account. Exceeding either limit returns `QuotaExceededError`. Its upload URL expires after **3 minutes**, uploaded files are deleted after **48 hours**, and executable or script file types are prohibited.
- A task attachment using `file_id` inherits the `file.upload` limit. Direct `file_url` and decoded `file_data` attachments are limited to **20 MB**; 20 MB of decoded data is approximately 26.7 MB of base64 text. There is no hard limit on the number of attachments per message.
- `message.task_references` accepts up to **20** task IDs per request on `task.create` and `task.sendMessage`; entries must be bare 22-character task IDs (a full task URL or the `agent-default-main_task` shortcut is rejected with `InvalidArgument`), and the cap is checked before duplicates are removed. References accumulate across turns; a task that accumulates more than 20 keeps the 20 most recently referenced.

---

## 6. Minimal Implementation Pattern

A typical closed-loop integration follows this sequence: upload files if needed with `file.upload`; create or reuse a project for durable instructions; call `task.create`; deliver results through webhooks or poll `task.listMessages`; continue with `task.sendMessage` if the conversation needs another turn; and use `task.confirmAction` only for explicit action confirmations.

For structured-output tasks, add a post-task step that reads either the `structured_output_result` event or the webhook `structured_output` field.

---

## References

Open these live pages for authoritative details:

| Topic | Official documentation |
| --- | --- |
| Full OpenAPI specification | [API v2 OpenAPI specification](https://open.manus.ai/docs/v2/openapi_v2.json) |
| Task lifecycle and polling | [Task lifecycle](https://open.manus.ai/docs/v2/task-lifecycle), [task.listMessages](https://open.manus.ai/docs/v2/task.listMessages) |
| Task creation and follow-up turns | [task.create](https://open.manus.ai/docs/v2/task.create), [task.sendMessage](https://open.manus.ai/docs/v2/task.sendMessage) |
| Structured output | [Structured output](https://open.manus.ai/docs/v2/structured-output) |
| Website publishing | [Website guide](https://open.manus.ai/docs/v2/website), [website.status](https://open.manus.ai/docs/v2/website.status), [website.publish](https://open.manus.ai/docs/v2/website.publish), [website.listCheckpoints](https://open.manus.ai/docs/v2/website.listCheckpoints), [website.update](https://open.manus.ai/docs/v2/website.update) |
| Webhooks | [Webhooks overview](https://open.manus.ai/docs/v2/webhooks-overview), [Webhook security](https://open.manus.ai/docs/v2/webhooks-security) |
| File upload | [file.upload](https://open.manus.ai/docs/v2/file.upload) |
| Projects, connectors, skills, agents | [project.create](https://open.manus.ai/docs/v2/project.create), [connector.list](https://open.manus.ai/docs/v2/connector.list), [skill.list](https://open.manus.ai/docs/v2/skill.list), [Agents overview](https://open.manus.ai/docs/v2/agents-overview) |
| OAuth2 and Open Apps | [Open App](https://open.manus.ai/docs/v2/open-app), [Authentication](https://open.manus.ai/docs/v2/authentication) |
| Website-hosted skill installation | [Manus API skill](https://open.manus.ai/docs/v2/manus-api-skill) |
