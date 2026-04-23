import { describe, it, expect } from '@jest/globals';

// Bridge tests require a live Pi environment.
// These are integration tests that should be run after symlink installation.

describe('pi-agent-bus-bridge', () => {
  it('should have config.json in package root', () => {
    const fs = require('fs');
    const configPath = require('path').join(__dirname, '..', 'config.json');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config).toHaveProperty('exposedPiTools');
    expect(config).toHaveProperty('piLinkEventMappings');
    expect(config).toHaveProperty('busToPiLinkMappings');
    expect(Array.isArray(config.exposedPiTools)).toBe(true);
  });

  it('should have essential config preset', () => {
    const fs = require('fs');
    const configPath = require('path').join(__dirname, '..', 'config.essential.json');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.exposedPiTools.length).toBeGreaterThan(0);
    expect(config.piLinkEventMappings.length).toBe(2);
  });

  it('should have secure config preset', () => {
    const fs = require('fs');
    const configPath = require('path').join(__dirname, '..', 'config.secure.json');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.exposedPiTools.length).toBeGreaterThan(0);
  });

  it('should expose correct types', () => {
    const fs = require('fs');
    
    const typesPath = require('path').join(__dirname, '..', 'types', 'pi.d.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
    
    const types = fs.readFileSync(typesPath, 'utf8');
    expect(types).toContain('pi:');
    expect(types).toContain('tools:');
    expect(types).toContain('link:');
    expect(types).toContain('context:');
  });

  it('should compile without errors', () => {
    const fs = require('fs');
    const distPath = require('path').join(__dirname, '..', 'dist', 'index.js');
    
    // Build should have been run before tests
    expect(fs.existsSync(distPath)).toBe(true);
    
    const compiled = fs.readFileSync(distPath, 'utf8');
    expect(compiled.length).toBeGreaterThan(0);
  });
});

// Integration tests (require live Pi environment)
describe.skip('pi-agent-bus-bridge integration', () => {
  it('should load config from file on startup', () => {
    // Requires live Pi environment
  });

  it('should discover available pi tools', () => {
    // Requires live Pi environment with /pi-agent-bus tools discover
  });

  it('should handle tool invocation requests', () => {
    // Requires live Pi environment with bridge installed
  });

  it('should map pi-link commands to bus events', () => {
    // Requires live Pi environment with /start-agent-workflow
  });

  it('should send bus events as pi-link messages', () => {
    // Requires live Pi environment
  });
});
