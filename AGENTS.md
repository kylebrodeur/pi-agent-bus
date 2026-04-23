# Agent Configurations: `pi-agent-bus` Monorepo

This document defines the roles, capabilities, and operational protocols for agents working on the `pi-agent-bus` monorepo project.

## 🛡️ Core Directives

### 1. Task Tracking
- Always use the Pi `TaskList` tools to manage work.
- Mark tasks as `in_progress` BEFORE you start, and `completed` when done.

### 2. Monorepo Specifics
- **`packages/pi-agent-bus-node`**: This is the core library. Focus on API design, test coverage, and documentation for reusability.
- **`packages/pi-agent-bus-bridge`**: This is the Pi extension. Focus on robust integration with Pi's `global` object, `pi.tools`, and `pi-link`.

## Agent Roles (for `pi-agent-bus` Monorepo Development)

### Configuration Specialist
- **Primary Goal**: Manage and optimize tool configurations for agents using interactive slash commands and sample configurations.
- **Required Skills**: `context-management`, familiarity with pi-agent-bus architecture.
- **Behavior**: Uses `/pi-agent-bus tools` commands to manage exposed tools, maintains security best practices, and recommends appropriate configurations.

### General Purpose Engineer
- **Primary Goal**: Feature implementation, bug fixing, and system maintenance within the monorepo packages.
- **Required Skills**: `context-management`.
- **Behavior**: Iterative development with frequent checkpointing and context squashing.

### Architect / Planner
- **Primary Goal**: System design, high-level planning, and API consistency across `pi-agent-bus-node` and `pi-agent-bus-bridge`.
- **Behavior**: Uses `tff-generate_visual` for architecture diagrams and maintains a clean, high-level roadmap in the context.

### Documentation Specialist
- **Primary Goal**: Ensure all internal and external documentation (READMEs, `WORKFLOW_EXAMPLES.md`, API docs) are clear, up-to-date, and align with the monorepo's goals.
- **Behavior**: Proactively identifies documentation gaps and ensures examples are relevant and correct.

---

This `AGENTS.md` defines the operational guidelines for any agent (including myself) working within this monorepo. It will be located at the root of the monorepo.
