---
type: ToolTestingAgent
role: Ledger Auditor
capabilities: [ "query_ledger", "describe_ledger" ]
llm_provider: none
llm_model: none
---

# Ledger Auditor Agent

A demo agent that focuses on auditing the internal state of the system through ledger queries.
It typically reads from the `master` ledger to verify project milestones.
