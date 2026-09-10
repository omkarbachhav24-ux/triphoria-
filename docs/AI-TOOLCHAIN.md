# TRIPHORIA AI Development Toolchain

This document defines the architecture, responsibilities, and constraints of the AI tools used in the TRIPHORIA development environment.

## Goal

To provide AI coding agents with deep, structural understanding of the TRIPHORIA codebase, equip them with specialized roles for critical tasks, and maintain strict architectural boundaries—without creating tool conflicts or unnecessary dependencies.

## Tool Responsibility Matrix

| Tool | Purpose | Scope | Input | Output | When to Use | When NOT to Use | Dependency? | Global / Project | Conflicts |
|---|---|---|---|---|---|---|---|---|---|
| **Codebase Memory MCP** | Structural code graph, dependency mapping, and architecture querying. | Codebase understanding, routing, schema mapping. | MCP Queries (e.g., `trace_path`, `detect_changes`) | Precise graph data (SQL/structural) | When debugging complex routes, tracing state changes, or understanding API boundaries. | For stylistic choices or visual design feedback. | External (Native Binary + MCP) | Global (Index in `~/.cache`) | Replaces Graft |
| **Agency Agents (Backend, DB, Review)** | Specialized prompts for rigorous backend and architectural work. | Code review, schema optimization, and security gating. | Code diffs, architectural requirements | Secure schema designs, optimized queries, code reviews | When modifying SQLite schemas, designing Auth flows, or reviewing PRs. | When doing frontend design, CSS, or UI animations. | None (Markdown files) | Global (`~/.claude/agents`) | Do not install frontend personas |
| **TRIPHORIA Skills (`ui-ux-pro-max`, `design-system`)** | Enforces the strict TRIPHORIA visual and interactive design language. | UI/UX, motion, typography, and layout. | UI requirements, component files | Styled React components, Framer Motion springs | When building or modifying React pages and UI components. | When writing pure backend logic or db schemas. | None (Markdown files) | Project (`.agents/skills`) | Conflicts with generic UI tools |
| **OpenMontage** | Autonomous video production pipeline. | Video generation, asset compilation. | Natural language video prompts | Rendered video files (MP4) | When generating actual video content for the application. | Inside the main TRIPHORIA web repository. | External Microservice | Separate Repository | None (Standalone) |

## Excluded Tools

- **Graft**: Not installed. Codebase Memory MCP handles structural analysis without the heavy Markdown generation overhead or LLM token costs associated with Graft.
- **Agency Agents (Frontend/UI)**: Not installed. We strictly use our own `ui-ux-pro-max` and `design-system` skills to ensure compliance with the unique TRIPHORIA aesthetic.

## Architecture

The AI tooling is layered to separate structural knowledge from stylistic enforcement:

```text
                    ANTIGRAVITY
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       MEMORY         SKILLS         AGENTS
          │              │              │
Codebase Memory MCP   TRIPHORIA       Agency Agents
    (Structural)       Skills       (Backend/Review)
          │              │              │
          └──────────────┼──────────────┘
                         │
                  TRIPHORIA REPO
                         │
             ┌───────────┴───────────┐
             │                       │
          frontend                backend
```
