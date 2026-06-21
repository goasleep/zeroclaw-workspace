# Productization Roadmap

This roadmap describes how ZeroClaw Studio can become a more productized
desktop workspace while staying grounded in ZeroClaw as the runtime base.

The core positioning is:

> ZeroClaw Studio is the product control plane for private ZeroClaw agents. It
> helps users create, monitor, approve, automate, and organize agent work across
> local and remote runtimes.

This is intentionally different from the upstream ZeroClaw desktop experience.
The upstream desktop should make one ZeroClaw runtime easy to install, launch,
and operate. Studio should make agent work across one or more ZeroClaw runtimes
more organized, observable, and actionable.

## Product Boundary

Studio should not become a second ZeroClaw runtime or persistence layer.

- ZeroClaw owns execution, sessions, tools, memory, cron, config, logs, events,
  pairing, devices, and runtime state.
- Studio owns connections, product metadata, task shells, tags, pins, local app
  preferences, cross-runtime indexes, and presentation.
- Users own files, machines, repositories, private APIs, clipboard content, and
  other resources.

See [`product-data-boundaries.md`](product-data-boundaries.md) for the full
ownership model.

## Two Product Tracks

Studio should evolve along two connected tracks.

### Track A: Single-Gateway Productization

Make one active ZeroClaw gateway feel like a complete task workspace.

This track turns gateway-native concepts such as sessions, messages, tools,
cron, logs, and memory into product objects such as tasks, runs, approvals,
automations, and results.

### Track B: Multi-Gateway Control Plane

Make Studio valuable beyond the upstream desktop by aggregating lightweight
state across multiple ZeroClaw runtimes.

This track should aggregate indexes, summaries, references, health, and pending
work. It should not copy full runtime databases into Studio.

## Multi-Runtime Sync Evolution

Studio follows an IM-style sync model:

- all configured reachable runtimes receive lightweight background sync
- the active runtime receives higher-frequency deep reconciliation
- the current task/chat loads full messages and live chat frames
- React displays read models maintained by Tauri instead of owning background
  discovery, approval lifecycle, or task status reconciliation

### v1: Observe-Only

Observe every configured runtime that already has a reachable URL/token.
Inactive runtimes are synced lightly; the active runtime is reconciled more
frequently. Empty URLs, inactive tunnels, missing pairing, and unreachable
gateways only update the runtime summary as unavailable.

v1 must not:

- auto-start inactive local runtimes
- auto-pair inactive remote runtimes
- silently open SSH, Tailscale, VPN, or other network tunnels
- copy complete messages, tool results, cron run records, memory, or logs into
  Studio state

The first productized multi-runtime UI surfaces are runtime badges and an
all-runtimes approvals inbox.

### v1.5: Managed Local Warm-Up

Allow Studio-managed inner/bundled runtimes to start in the background when the
user opts in. This should be limited to Studio-owned managed runtimes and should
not apply to local-attached or remote runtimes.

### v2: Background Policy

Add per-runtime background behavior:

- Always observe
- Observe when app open
- Only when active
- Never background sync

Pairing, credential refresh, and tunnel setup remain explicit UI flows. The
background observer may report that attention is needed, but it must not create
trust or network relationships by itself.

### v3: Full Multi-Runtime Operations

Productize global operations after summaries and approvals prove the model:

- global approvals
- global running tasks
- failed automations
- runtime health and doctor summaries
- credential refresh and reconnect strategy

UI should evolve in this order: runtime badges, all-runtimes approvals inbox,
optional all-runtimes task list, then a full global dashboard. The current
Dashboard remains active-runtime-first until that information architecture is
designed deliberately.

## Responsibility Matrix

| Area | ZeroClaw owns | Studio owns |
| --- | --- | --- |
| Runtime execution | Agent loop, tool execution, approvals, sessions | Runtime selection and user-facing context |
| Connections | Pairing endpoint, token issuance, devices | Saved connection records, active runtime, SSH tunnel metadata |
| Tasks | Session messages and runtime events | Task shell, title, tags, status, archive state, linked session id |
| Runs | Session state, tool calls, approval events | Timeline presentation and result organization |
| Automations | Cron schedules, cron runs, webhooks, channels | Template gallery, setup wizard, cross-runtime overview |
| Memory | Runtime memory records | Browsing, filtering, editing UI, task references |
| Tools | Tool catalog, schemas, execution | Tool catalog UI, risk labels, capability summaries |
| Logs and doctor | Health, logs, events, diagnostics | Runtime health dashboard and support-oriented presentation |
| Artifacts | Files or outputs in workspace/shared/agent storage | Pins, references, summaries, open/copy/export actions |
| Multi-runtime views | Per-gateway state | Cross-runtime index, summaries, filters, inboxes |

## What Studio Should Not Do

Avoid these until ZeroClaw provides explicit stable APIs or the product need
clearly outweighs the ownership risk:

- implement a separate agent runtime
- implement a separate cron or workflow engine
- directly edit ZeroClaw runtime files when a gateway API exists
- duplicate the full upstream web dashboard as the main product
- become a replacement for the upstream desktop launcher
- copy full messages, memory, logs, or tool results into Studio-owned storage
- build cross-runtime migration of sessions or memory without upstream export
  and import support
- build a complete artifact registry before ZeroClaw has a stable artifact
  model
- centrally manage provider credentials outside the runtime or OS keychain
  boundary

## Phase 0: Product Objects And Information Architecture

Goal: define the objects Studio presents to users before adding more runtime
surface area.

Primary objects:

- `Runtime`: one ZeroClaw gateway or running location.
- `Workspace`: a selected file or project scope on a runtime.
- `Task`: a Studio-owned product shell for user intent and organization.
- `Run`: a ZeroClaw-backed execution view, usually linked to a session or cron
  run.
- `Automation`: a productized schedule or trigger backed by ZeroClaw cron,
  channels, or webhooks.

Deliverables:

- Replace a settings/chat-centered mental model with a work-centered model.
- Define task metadata stored by Studio.
- Define how tasks link to ZeroClaw session ids and cron ids.
- Define UI labels for active runtime, workspace, and trust boundary.
- Decide what appears in the main navigation.

Can do now:

- product design
- UI restructuring
- Studio-owned metadata schema
- navigation changes

Do not do:

- migrate or copy ZeroClaw runtime data into Studio
- invent a second source of truth for messages, memory, cron, or logs

## Phase 1: Single-Gateway Work Dashboard

Goal: make the currently active gateway feel like a task workspace rather than
a collection of runtime panels.

Core views:

- Work Dashboard
- Task Detail
- Runtime Detail

Work Dashboard should show:

- current runtime
- recent tasks
- running tasks
- pending approvals
- recent workspaces
- recent failures
- new task entry point

Task Detail should show:

- task title and goal
- linked session or run
- runtime and workspace
- selected agent
- timeline
- tool calls
- approvals
- final result or pinned output

Runtime Detail should show:

- health
- doctor checks
- logs
- tools
- memory
- cron
- devices
- integrations

ZeroClaw provides:

- sessions and messages
- WebSocket chat frames
- SSE events
- tool calls
- approval requests and responses
- logs
- doctor and status
- cron
- memory
- tools
- config

Studio must build:

- task metadata
- task-to-session links
- dashboard UI
- task detail UI
- timeline grouping
- user tags and archive state
- pinned result references
- trust-boundary presentation

## Phase 2: Run Timeline And Approval Center

Goal: turn agent work into an inspectable execution record.

Run Timeline should include:

- user messages
- agent status
- tool call start
- tool call result
- approval request
- approval decision
- errors
- completion
- generated or referenced artifacts

Approval Center should show:

- pending approvals for the active runtime
- task association
- requested tool
- target runtime
- affected workspace or resource
- argument summary
- approve, deny, and always-allow actions where supported

ZeroClaw provides:

- approval events
- approval response endpoint or chat frame
- tool events
- session events

Studio must build:

- approval inbox UI
- timeline presentation
- risk and scope labels
- runtime and workspace context
- notifications for pending approvals

## Phase 3: Automations Productization

Goal: present long-running and scheduled work as automations, not raw cron
configuration.

Start with templates instead of a workflow builder.

Initial templates:

- daily project summary
- weekly report
- log check
- endpoint monitor
- folder cleanup
- webhook-triggered task
- workspace change check
- completion notification

ZeroClaw provides:

- cron schedules
- cron runs
- channels
- webhooks
- tools
- memory
- logs and events

Studio must build:

- automation template gallery
- setup wizard
- template-to-cron configuration mapping
- recent run status
- failure summaries
- pause, resume, and manual-run controls
- task-to-automation conversion

Do not build yet:

- separate scheduler
- separate workflow engine
- complex DAG builder

## Phase 4: Multi-Gateway Control Plane

Goal: make Studio useful across multiple local and remote ZeroClaw runtimes.

This is the strongest product difference from an upstream single-runtime
desktop shell.

Studio should maintain a lightweight cross-runtime index:

```text
Studio Index:
- runtime id
- task id
- linked session id
- linked cron id
- workspace root
- title
- status
- last seen timestamp
- pending approval summary
- last error summary
- pinned result reference
```

Global views:

- All Runtimes
- Global Inbox
- Global Tasks
- Global Automations

All Runtimes should show:

- online and offline runtimes
- pairing state
- health
- recent errors
- running task count
- available capability summary

Global Inbox should show:

- approvals across runtimes
- failed tasks across runtimes
- running tasks across runtimes

Global Tasks should show:

- recent tasks
- filters by runtime
- filters by workspace
- filters by state
- archived and pinned work

Global Automations should show:

- cron-backed automation summaries across gateways
- next run time
- last run state
- recent failures
- enabled or paused state

Studio owns:

- connection registry
- cross-runtime index
- summary cache
- reference links
- refresh policy
- offline behavior
- filtering and grouping

ZeroClaw still owns:

- per-gateway runtime truth
- sessions
- messages
- memory
- cron
- logs
- config
- tool results

## Phase 5: Artifacts And Results

Goal: make completed work feel deliverable.

Start with lightweight references:

- pin final answer
- link generated file
- show changed files
- export task summary
- copy report
- open artifact location
- attach artifact reference to a task

ZeroClaw may provide:

- workspace writes
- shared directory files
- agent workspace files
- tool results
- session output

Studio should build:

- artifact references
- pinned result cards
- task summary cards
- artifact drawer
- open, copy, export, and reveal actions

Do not build a full artifact registry until ZeroClaw has a stable artifact
model or the product requirements are clear enough to justify a Studio-owned
reference-only model.

## Phase 6: Product Onboarding

Goal: make setup understandable without first teaching users gateway concepts.

The onboarding question should be:

> Where do you want your agent to work?

Entry choices:

- this computer
- remote server
- NAS or homelab
- company network machine
- existing ZeroClaw node

Each path can map to the existing connection model:

- bundled inner runtime
- locally managed runtime
- locally attached runtime
- direct remote gateway
- SSH-tunneled gateway
- private-network gateway

Studio must build:

- product-language setup wizard
- trust-boundary prompts
- first workspace selection
- first task templates
- clearer connection-state recovery

ZeroClaw provides:

- gateway
- pairing
- runtime
- config validation
- health checks

## Suggested Priority

1. Phase 0: Product objects and information architecture
2. Phase 1: Single-gateway Work Dashboard and task metadata
3. Phase 2: Run Timeline and Approval Center
4. Phase 3: Automation templates
5. Phase 4: Multi-gateway control plane
6. Phase 5: Artifacts and results
7. Phase 6: Product onboarding polish

The multi-gateway layer should come after task and run abstractions exist.
Without those abstractions, aggregation would only collect sessions, cron jobs,
and logs. With those abstractions, aggregation can present meaningful work.

## Roadmap Summary

Short term:

- turn one ZeroClaw gateway into a polished task workspace
- add Studio-owned task metadata
- organize sessions, tool calls, approvals, and results into run timelines

Medium term:

- productize cron, channels, and tools as automation templates
- add approval and failure inboxes
- make runtime health and trust boundaries first-class

Long term:

- build a lightweight multi-gateway control plane
- aggregate tasks, approvals, automation summaries, health, and pinned results
- keep runtime truth inside each ZeroClaw gateway

The guiding distinction is:

> The upstream desktop helps one ZeroClaw run. Studio helps users organize work
> across ZeroClaw runtimes.
