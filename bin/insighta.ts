#!/usr/bin/env node

// Global error handler — must be registered before any async work.
// In production: print only the message, no stack trace (Requirement 8.3).
// In development: print the full error with stack.
process.on('uncaughtException', (err: Error) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  } else {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  } else {
    console.error(`Error: ${err.message}`);
  }
  process.exit(1);
});

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';

import { login } from '../src/commands/login';
import { logout } from '../src/commands/logout';
import { whoami } from '../src/commands/whoami';
import { listProfiles } from '../src/commands/profiles/list';
import { getProfile } from '../src/commands/profiles/get';
import { createProfile } from '../src/commands/profiles/create';
import { deleteProfile } from '../src/commands/profiles/delete';
import { searchProfiles } from '../src/commands/profiles/search';
import { exportProfiles } from '../src/commands/profiles/export';

// Read version from package.json
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
) as { version: string };

const program = new Command();

program
  .name('insighta')
  .description('CLI for the Insighta Labs+ platform')
  .version(pkg.version, '-v, --version');

// ── Auth commands ────────────────────────────────────────────────────────────

program
  .command('login')
  .description('Log in with your GitHub account')
  .action(login);

program
  .command('logout')
  .description('Log out and revoke your session')
  .action(logout);

program
  .command('whoami')
  .description('Show the currently authenticated user')
  .action(whoami);

// ── Profiles subcommands ─────────────────────────────────────────────────────

const profiles = program
  .command('profiles')
  .description('Manage profiles');

profiles
  .command('list')
  .description('List profiles with optional filters')
  .option('--gender <value>', 'Filter by gender (male|female)')
  .option('--page <n>', 'Page number (positive integer)')
  .option('--limit <n>', 'Results per page (positive integer)')
  .action((opts: { gender?: string; page?: string; limit?: string }) =>
    listProfiles(opts)
  );

profiles
  .command('get <id>')
  .description('Get a profile by ID')
  .action((id: string) => getProfile(id));

profiles
  .command('create <name>')
  .description('Create a new profile by name')
  .action((name: string) => createProfile(name));

profiles
  .command('delete <id>')
  .description('Delete a profile by ID (admin only)')
  .action((id: string) => deleteProfile(id));

profiles
  .command('search <query>')
  .description('Search profiles using natural language')
  .action((query: string) => searchProfiles(query));

profiles
  .command('export')
  .description('Export all profiles to a CSV file')
  .action(exportProfiles);

// ── Unrecognized commands ────────────────────────────────────────────────────

program.on('command:*', (operands: string[]) => {
  console.error(`Unknown command: \`${operands[0]}\`. Run \`insighta --help\` for available commands.`);
  process.exit(1);
});

program.parse(process.argv);
