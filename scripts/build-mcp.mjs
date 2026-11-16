// Builds the MCP server in release mode and puts it where the installer build looks for it:
// src-tauri/binaries/mcp-server-<target triple>.exe (see tauri.release.conf.json).
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const run = (command, args) =>
  execFileSync(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });

const triple = run('rustc', ['--print', 'host-tuple']).toString().trim();
const extension = triple.includes('windows') ? '.exe' : '';

execFileSync('cargo', ['build', '--release', '-p', 'dashboard-mcp'], { stdio: 'inherit' });

const folder = join('src-tauri', 'binaries');
mkdirSync(folder, { recursive: true });
const target = join(folder, `mcp-server-${triple}${extension}`);
copyFileSync(join('target', 'release', `mcp-server${extension}`), target);
console.log(`MCP server ready: ${target}`);
