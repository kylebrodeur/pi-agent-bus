import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// __dirname is dist/test/, so package root is ../..
const PKG_ROOT = path.join(__dirname, '..', '..');

describe('pi-agent-bus-bridge config', () => {
  it('should have config.json in package root', () => {
    const configPath = path.join(PKG_ROOT, 'config.json');
    assert.ok(fs.existsSync(configPath), 'config.json should exist');
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(Array.isArray(config.exposedPiTools), 'exposedPiTools should be an array');
    assert.ok(Array.isArray(config.piLinkEventMappings), 'piLinkEventMappings should be an array');
    assert.ok(Array.isArray(config.busToPiLinkMappings), 'busToPiLinkMappings should be an array');
  });

  it('should have essential config preset', () => {
    const configPath = path.join(PKG_ROOT, 'config.essential.json');
    assert.ok(fs.existsSync(configPath), 'config.essential.json should exist');
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(config.exposedPiTools.length > 0, 'essential preset should have tools');
    assert.strictEqual(config.piLinkEventMappings.length, 2, 'essential preset should have 2 event mappings');
  });

  it('should have secure config preset', () => {
    const configPath = path.join(PKG_ROOT, 'config.secure.json');
    assert.ok(fs.existsSync(configPath), 'config.secure.json should exist');
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.ok(config.exposedPiTools.length > 0, 'secure preset should have tools');
  });

  it('should have TypeScript types for pi global', () => {
    const typesPath = path.join(PKG_ROOT, 'types', 'pi.d.ts');
    assert.ok(fs.existsSync(typesPath), 'types/pi.d.ts should exist');
    
    const types = fs.readFileSync(typesPath, 'utf8');
    assert.ok(types.includes('pi:'), 'should declare pi global');
    assert.ok(types.includes('tools:'), 'should declare tools');
    assert.ok(types.includes('link:'), 'should declare link');
    assert.ok(types.includes('context:'), 'should declare context');
  });

  it('should compile without errors', () => {
    const distPath = path.join(PKG_ROOT, 'dist', 'index.js');
    
    // Build should have been run before tests
    assert.ok(fs.existsSync(distPath), 'dist/index.js should exist after build');
    
    const compiled = fs.readFileSync(distPath, 'utf8');
    assert.ok(compiled.length > 0, 'compiled output should not be empty');
  });
});

describe('pi-agent-bus-bridge presets', () => {
  it('should load essential preset with correct tool count', () => {
    const configPath = path.join(PKG_ROOT, 'config.essential.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const expectedTools = [
      'append_ledger', 'query_ledger', 'describe_ledger', 'ledger_stats',
      'route_model',
      'context_tag', 'context_log', 'context_checkout',
      'link_send', 'link_prompt', 'link_list',
      'op_get_secret', 'op_load_env',
      'read', 'bash', 'write', 'edit'
    ];
    
    assert.deepStrictEqual(config.exposedPiTools, expectedTools, 
      'essential preset tools should match expected list');
  });

  it('should have valid event mapping structure', () => {
    const configPath = path.join(PKG_ROOT, 'config.essential.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const mapping = config.piLinkEventMappings[0];
    assert.ok(mapping.slashCommand, 'should have slashCommand');
    assert.ok(mapping.busTopic, 'should have busTopic');
    assert.ok(mapping.description, 'should have description');
    assert.ok(mapping.payloadMap, 'should have payloadMap');
  });

  it('should have valid outbound mapping structure', () => {
    const configPath = path.join(PKG_ROOT, 'config.essential.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const mapping = config.busToPiLinkMappings[0];
    assert.ok(mapping.busTopic, 'should have busTopic');
    assert.ok(mapping.messageBuilder, 'should have messageBuilder');
    assert.ok(typeof mapping.messageBuilder === 'string', 'messageBuilder should be a string template');
  });
});
