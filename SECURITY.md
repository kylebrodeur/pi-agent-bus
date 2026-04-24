# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in `pi-agent-bus`, please do **not** open a public issue. Instead, email the maintainers directly at:

**kyle.brodeur@example.com** *(replace with your actual contact)*

Please include:
- A description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Any suggested fixes or mitigations

We will acknowledge receipt within 48 hours and provide a timeline for a fix and disclosure.

## Security Considerations

This project is a Pi extension that bridges agent orchestration with Pi's tool ecosystem. Keep the following in mind:

- **Tool Exposure**: The bridge exposes Pi tools to agents via a configurable whitelist (`exposedPiTools`). Only expose tools you trust.
- **Configuration Files**: `config.json` controls tool access. Protect it from unauthorized modification.
- **Agent Definitions**: Agents defined in `.agent.md` files run with your system permissions. Review agent capabilities carefully.
- **Secrets**: Never commit API keys, tokens, or passwords to the repository. Use Pi's `op_get_secret` or environment variables.
