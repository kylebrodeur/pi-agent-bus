# GitHub Setup Instructions

1. **Create repository** at github.com:
   - Go to https://github.com/new
   - Owner: microfactory
   - Repository name: agent-node-bus
   - Description: "Lightweight, agnostic, event-driven Agent Runtime for Stigmergic coordination"
   - Public repository
   - Click "Create repository"

2. **Update remote and push** (run in agent-node-bus directory):
```bash
git remote set-url origin https://github.com/pi-agent-node-bus.git
git push -u origin main
```

3. **Setup npm publishing**:
```bash
npm login
npm publish --access public
```

4. **Update package.json** (already updated):
```json
{
  "name": "microfactory-agent-node-bus",
  "version": "0.1.0",
  "repository": "https://github.com/pi-agent-node-bus.git"
}
```

Once published, update projects to install from npm instead of local symlink.
