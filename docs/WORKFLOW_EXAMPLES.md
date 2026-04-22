# Workflow Examples: Leveraging `pi-agent-bus-node` with Pi Skills & Extensions

This document provides practical examples of how `pi-agent-bus-node` can be integrated with existing Pi skills and extensions to build powerful, event-driven agent workflows. `pi-agent-bus-node` acts as the foundational messaging and orchestration layer, enabling agents to communicate and coordinate effectively.

## Core Concepts

`pi-agent-bus-node` provides:
- **`MessageBus`**: A central hub for event-driven, stigmergic (environment-mediated) communication. Agents publish messages (events) to topics, and other agents subscribe to those topics. This avoids direct, tightly coupled communication and enables scalable, flexible coordination.
- **`Agent` base class**: A foundational class for creating specialized agents that interact with the `MessageBus` and can leverage LLMs for decision-making.
- **`TaskQueue`**: A simple mechanism for managing and tracking units of work.
- **`LLMProvider`**: An abstract interface for integrating various Large Language Models.

---

## The Pi Integration Layer: Structured Collaboration

To move beyond "prompt engineering hacking things together" and ensure robust, configuration-driven integration, we establish a **"Pi Integration Layer"**. This layer acts as a secure, structured bridge between isolated `pi-agent-bus-node` agents and the broader Pi runtime environment, including `pi.tools` and `pi-link`.

### 1. The Pi Tool Bridge

*   **Problem**: `pi-agent-bus-node` agents are designed for isolation (running in separate processes/threads), so they don't have direct access to the global `pi` object or `pi.tools`.
*   **Solution**: A **"Pi Tool Bridge"** is a dedicated component (likely a simple Pi extension or script) running in the main Pi process. It's responsible for:
    1.  Subscribing to a specific `MessageBus` topic (e.g., `pi_tool_requests`) from `pi-agent-bus-node`.
    2.  Receiving structured requests (e.g., `{ toolName: "append_ledger", args: { ... } }`) from agents via the bus.
    3.  Validating and executing the requested `pi.tools` call.
    4.  Publishing the result (or error) back to the `MessageBus` (e.g., `pi_tool_responses`).
*   **Benefits**:
    *   **Isolation**: `pi-agent-bus-node` agents remain clean, focused, and truly platform-agnostic.
    *   **Safety & Control**: Centralized control over `pi.tools` access, handling errors and permissions.
    *   **Configurable**: Which tools are exposed can be declared in agent configurations (e.g., markdown frontmatter) and dynamically registered.

### 2. `pi-link` for Cross-Terminal Orchestration

`pi-link` serves as the external communication layer, enabling communication between different Pi terminals. It's integrated into the Pi Integration Layer to:

*   **Trigger `pi-agent-bus-node` workflows**: `pi-link` messages can be interpreted by the Pi Integration Layer to initiate complex workflows managed by `pi-agent-bus-node` agent fleets.
*   **Report Results**: `pi-agent-bus-node` workflows can use the Pi Integration Layer to send messages (e.g., status updates, final results) back to other Pi terminals via `pi-link`.

---

## Integration Examples

The examples below demonstrate how `pi-agent-bus-node` forms the core communication fabric, integrating with other Pi skills and extensions via the Pi Integration Layer.

---

### 1. Distributed Research & Provenance Tracking Workflow

This workflow demonstrates how a research agent can gather information and seamlessly integrate verified facts into the Universal Citation Ledger (UCL) using `qmd-ledger` and `ucl-provenance`, mediated by the Pi Tool Bridge.

**Scenario**: A `ScoutAgent` needs to find technical evidence for a book claim, and a `FactExtractorAgent` needs to record these findings in the UCL.

**Agents Involved**:
- `ScoutAgent` (extends `pi-agent-bus-node/Agent`)
- `FactExtractorAgent` (extends `pi-agent-bus-node/Agent`)
- Pi Tool Bridge (executing `pi.tools.append_ledger`)

**Workflow**:
1.  **`ScoutAgent` Action**: The `ScoutAgent` uses its LLM to determine a search strategy. It then uses available tools (e.g., a tool that wraps `gh-my-starred` and `ad-hoc-research` via the Pi Tool Bridge) to search GitHub repositories.
2.  **Publishing Findings**: When `ScoutAgent` identifies a significant code-scent, it publishes a `CODE_SCENT_FOUND` message to the `MessageBus`.
    ```typescript
    // Inside ScoutAgent's tick() or handleResearchResult()
    await this.broadcast('CODE_SCENT_FOUND', {
      source: 'repo_url/file_path',
      lines: '10-50',
      evidence: 'function doSomething() { ... }',
      context: 'Implementation of algorithm X'
    });
    ```
3.  **`FactExtractorAgent` Action**: `FactExtractorAgent` subscribes to the `CODE_SCENT_FOUND` topic. Upon receiving a message, it uses its LLM to distill a verified fact from the evidence.
4.  **Request `append_ledger` via Pi Tool Bridge**: `FactExtractorAgent` then requests the `append_ledger` tool call by publishing to the `pi_tool_requests` topic on the `MessageBus`.
    ```typescript
    // Inside FactExtractorAgent's code
    await this.bus.publish('pi_tool_requests', this.config.id, {
      toolName: 'append_ledger',
      args: {
        ledger: 'UCL_LEDGER',
        mode: 'gated',
        entry: { /* structured fact data */ }
      },
      responseTopic: `pi_tool_responses:${this.config.id}:${message.id}` // Unique response topic
    });
    ```
5.  **Pi Tool Bridge Executes**: The Pi Tool Bridge receives the `pi_tool_requests` message, executes `pi.tools.append_ledger({ ... })`, and publishes the result/error back to the specified `responseTopic`.
6.  **`ucl-provenance` Integration**: The `ucl-provenance` skill can then interact with the updated `UCL_LEDGER`.

**Benefits**:
-   **Decoupled & Secure**: `ScoutAgent` and `FactExtractorAgent` remain isolated; `pi.tools` access is centralized and controlled.
-   **Automated Provenance**: Verifiable facts are seamlessly integrated into the `qmd-ledger`.
-   **Scalability**: Easily add more agents without changing the core Pi environment.

---

### 2. Autonomous Code Review & Refactoring Pipeline

This workflow enables event-driven code quality checks and automated fixes, creating a continuous feedback loop using the Pi Tool Bridge for code manipulation.

**Scenario**: After a code change, `ReviewerAgent` flags issues, and `RefactorAgent` attempts to fix them.

**Agents Involved**:
- `CodeWatcher` (a custom Pi extension that monitors file system changes or git commits)
- `ReviewerAgent` (extends `pi-agent-bus-node/Agent`, leveraging a configured `reviewer` agent definition)
- `RefactorAgent` (extends `pi-agent-bus-node/Agent`, leveraging a configured `worker` agent definition)
- Pi Tool Bridge (executing `pi.tools.edit` or `pi.tools.write`)

**Workflow**:
1.  **`CodeWatcher` Action**: A `CodeWatcher` detects a new commit or file modification. It broadcasts a `CODE_CHANGED` message containing the diff or changed file paths to the `MessageBus`.
2.  **`ReviewerAgent` Action**: `ReviewerAgent` subscribes to `CODE_CHANGED`. It uses its LLM (`LLMProvider`) to analyze the code (potentially by requesting `pi.tools.read` via the Bridge). If issues are found, it publishes `CODE_REVIEW_ISSUES`.
3.  **`RefactorAgent` Action**: `RefactorAgent` subscribes to `CODE_REVIEW_ISSUES`. For each issue, it plans a fix and requests `pi.tools.edit` or `pi.tools.write` via the Pi Tool Bridge to apply changes.
    ```typescript
    // Inside RefactorAgent's code (simplified)
    await this.bus.publish('pi_tool_requests', this.config.id, {
      toolName: 'edit',
      args: { path: filePath, edits: fixPlan.edits },
      responseTopic: `pi_tool_responses:${this.config.id}:${message.id}`
    });
    ```
4.  **Continuous Loop**: The `CodeWatcher` detects the new commit from `RefactorAgent` (after the Bridge executes `pi.tools.edit`/`write` and a commit is made by a Pi agent), triggering another review cycle until `CODE_CLEAN` is broadcast.

**Benefits**:
-   **Continuous Quality**: Automated detection and remediation of code issues.
-   **Event-Driven**: Changes trigger reactions across the system.
-   **Modular**: Easily swap out different `ReviewerAgent` or `RefactorAgent` implementations.

---

### 3. `pi-link` Coordinated Multi-Terminal Orchestration

This demonstrates high-level orchestration where a main Pi terminal delegates complex tasks to a dedicated "orchestrator" terminal using `pi-link`, which then uses `pi-agent-bus-node` to manage sub-agents.

**Scenario**: User initiates a complex task (e.g., a large refactoring) in the main Pi terminal.

**Agents/Components Involved**:
- Main Pi Terminal (user-facing)
- Orchestrator Pi Terminal (background process)
- `OrchestratorAgent` (extends `pi-agent-bus-node/Agent`, runs in Orchestrator Terminal)
- Multiple `WorkerAgent`s (extends `pi-agent-bus-node/Agent`, managed by `OrchestratorAgent`)
- Pi Tool Bridge (in Orchestrator Terminal, processing `pi-link` and `pi.tools`)

**Workflow**:
1.  **User Request (Main Terminal)**: User types a command like `/complex-refactor "Refactor module X"` in the main Pi terminal.
2.  **`pi-link` Delegation (Main Terminal)**: A custom Pi skill in the main terminal captures `/complex-refactor` and uses `link_send` to send a message to the Orchestrator Pi Terminal's Pi Tool Bridge.
    ```typescript
    // In main terminal's custom skill
    link_send({
      to: 'orchestrator-terminal', // Target the background orchestrator terminal
      message: JSON.stringify({ type: 'START_REFACTOR_TASK', payload: 'Refactor module X' }),
      triggerTurn: true // Triggers LLM in orchestrator terminal
    });
    ```
3.  **Pi Tool Bridge Receives & Forwards (Orchestrator Terminal)**: The Pi Tool Bridge in the Orchestrator Terminal receives the `pi-link` message. It translates this external command into an internal `MessageBus` event (e.g., `ORCHESTRATOR_COMMAND`) which the `OrchestratorAgent` subscribes to.
4.  **`OrchestratorAgent` Action**: The `OrchestratorAgent` receives the `ORCHESTRATOR_COMMAND` message. It uses its LLM (`LLMProvider`) to break down "Refactor module X" into smaller `Task`s and adds them to its `TaskQueue`.
5.  **`WorkerAgent` Dispatch**: `OrchestratorAgent` dispatches `WorkerAgent`s, assigning them tasks from the `TaskQueue`. Each `WorkerAgent` publishes its `TASK_PROGRESS` or `TASK_COMPLETED` messages to the `MessageBus`.
6.  **Status Reporting via `pi-link`**: `OrchestratorAgent` monitors `TASK_PROGRESS` messages. The Pi Tool Bridge collects these and uses `pi-link` to send periodic updates back to the main terminal, showing the user the progress of the complex refactoring.

**Benefits**:
-   **Scalable Delegation**: Offload complex, long-running tasks to dedicated background terminals, keeping the main terminal responsive.
-   **Clear Separation**: Main terminal stays responsive for user interaction, while heavy lifting occurs elsewhere.
-   **Robustness**: Background orchestration continues even if the main terminal is disconnected.

---

### 4. Secure Agent Operation with 1Password Integration

This workflow demonstrates how `pi-agent-bus-node` agents can securely access credentials and secrets managed by 1Password, mediated by the Pi Tool Bridge.

**Scenario**: An agent needs an API key to interact with an external service.

**Agents/Components Involved**:
- `DeploymentAgent` (extends `pi-agent-bus-node/Agent`)
- Pi Tool Bridge (executing `pi.tools.op_get_secret` or `pi.tools.op_load_env`)

**Workflow**:
1.  **`DeploymentAgent` Needs Secret**: `DeploymentAgent` determines it needs a secret (e.g., an API key for a cloud provider).
2.  **Request Secret via Pi Tool Bridge**: `DeploymentAgent` publishes a request to `pi_tool_requests` for the `op_get_secret` tool.
    ```typescript
    // Inside DeploymentAgent's code
    await this.bus.publish('pi_tool_requests', this.config.id, {
      toolName: 'op_get_secret',
      args: { reference: 'op://vault/item/field' },
      responseTopic: `pi_tool_responses:${this.config.id}:${message.id}`
    });
    ```
3.  **Pi Tool Bridge Executes**: The Pi Tool Bridge receives the request, executes `pi.tools.op_get_secret({ reference: '...' })`, and publishes the retrieved secret (or an error) back to the `responseTopic`.
4.  **`DeploymentAgent` Uses Secret**: `DeploymentAgent` receives the secret and uses it for its task.

**Benefits**:
-   **Enhanced Security**: Agents never directly handle sensitive credentials; access is mediated and logged by the secure Pi environment.
-   **Streamlined Provisioning**: Agents can dynamically request secrets as needed, reducing manual configuration.

---

## Considerations for Custom Skills/Extensions

Many of the synergies above require implementing the "Pi Tool Bridge" component. This bridge acts as an intermediary, translating `pi-agent-bus-node` messages into `pi.tools` calls and vice-versa.

For custom skills/extensions not yet in GitHub/NPM:
-   **Internal Use**: If they're highly specific to the Microfactory, they can remain project-local (e.g., `.pi/skills/` or a dedicated `packages/` directory).
-   **General Purpose**: If they offer broader utility, consider open-sourcing them to a GitHub repo and publishing to NPM, making them installable for any Pi user.

This document serves as a living guide for integrating `pi-agent-bus-node` into the broader Pi ecosystem, emphasizing structured, configuration-driven approaches for robust agentic workflows.
