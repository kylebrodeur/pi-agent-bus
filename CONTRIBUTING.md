# Contributing to `pi-agent-bus`

Thank you for your interest in contributing to the `pi-agent-bus` monorepo! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pi-agent-bus.git
   cd pi-agent-bus
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Build all packages**:
   ```bash
   pnpm build
   ```
5. **Run tests**:
   ```bash
   pnpm test
   ```

## Monorepo Structure

| Package | Path | Description |
|---------|------|-------------|
| `pi-agent-bus-node` | `packages/pi-agent-bus-node/` | Core agent runtime library |
| `pi-agent-bus-bridge` | `packages/pi-agent-bus-bridge/` | Pi extension bridging core library to Pi environment |

## Development Workflow

### Making Changes

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-bugfix
   ```

2. Make your changes in the relevant package(s).

3. Ensure your changes follow the existing code style. We use TypeScript with strict mode enabled.

4. Add or update tests as needed.

5. Build and test your changes:
   ```bash
   pnpm build
   pnpm test
   ```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean and readable history:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, semicolons, etc.)
- `refactor:` — Code refactoring
- `perf:` — Performance improvements
- `test:` — Adding or updating tests
- `chore:` — Build process or auxiliary tool changes

Example:
```
feat(pi-agent-bus-bridge): add new config preset for minimal mode

Adds a new `config.minimal.json` preset that exposes only read and
bash tools for users who want the most restrictive setup.
```

### Pull Request Process

1. Update the `README.md` or relevant documentation with details of your changes if applicable.
2. Ensure all tests pass and the build succeeds.
3. Update `TODO.md` if your changes affect the project roadmap.
4. Submit your pull request with a clear title and description.
5. Link any related issues in your PR description.

## Reporting Bugs

If you find a bug, please open an issue with the following information:

- **Package:** Which package is affected (`pi-agent-bus-node` or `pi-agent-bus-bridge`)
- **Version:** The version you are using
- **Environment:** Node.js version, OS, Pi version if relevant
- **Description:** A clear description of the bug
- **Reproduction:** Steps to reproduce the issue
- **Expected behavior:** What you expected to happen
- **Actual behavior:** What actually happened

## Reporting Security Issues

If you discover a security vulnerability, please do NOT open a public issue. Instead, email the maintainers directly at the address listed in the repository profile.

## Questions?

Feel free to open a discussion on GitHub or reach out to the maintainers.

Thank you for contributing!
