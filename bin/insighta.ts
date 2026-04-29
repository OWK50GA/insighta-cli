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
import { listProfiles, type ListProfilesOptions } from '../src/commands/profiles/list';
import { getProfile } from '../src/commands/profiles/get';
import { createProfile } from '../src/commands/profiles/create';
import { deleteProfile } from '../src/commands/profiles/delete';
import { searchProfiles } from '../src/commands/profiles/search';
import { exportProfiles, type ExportProfilesOptions } from '../src/commands/profiles/export';

// Read version from package.json (dist/bin/ → ../../package.json)
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')
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
  .option('--gender <value>',    'Filter by gender (male|female)')
  .option('--country <code>',    'Filter by country code (e.g. NG)')
  .option('--age-group <value>', 'Filter by age group (adult|child|teenager|senior)')
  .option('--min-age <n>',       'Filter by minimum age')
  .option('--max-age <n>',       'Filter by maximum age')
  .option('--sort-by <field>',   'Sort results by field (e.g. age)')
  .option('--order <asc|desc>',  'Sort order (asc or desc)')
  .option('--page <n>',          'Page number (positive integer)')
  .option('--limit <n>',         'Results per page (positive integer)')
  .action((opts: ListProfilesOptions) => listProfiles(opts));

profiles
  .command('get <id>')
  .description('Get a profile by ID')
  .action((id: string) => getProfile(id));

profiles
  .command('create')
  .description('Create a new profile (admin only)')
  .requiredOption('--name <name>', 'Name of the profile to create')
  .action((opts: { name: string }) => createProfile(opts));

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
  .description('Export profiles to a file')
  .requiredOption('--format <format>', 'Export format (csv)')
  .option('--gender <value>',          'Filter by gender (male|female)')
  .option('--country <code>',          'Filter by country code (e.g. NG)')
  .action((opts: ExportProfilesOptions) => exportProfiles(opts));

// ── Unrecognized commands ────────────────────────────────────────────────────

program.on('command:*', (operands: string[]) => {
  console.error(`Unknown command: \`${operands[0]}\`. Run \`insighta --help\` for available commands.`);
  process.exit(1);
});

program.parse(process.argv);
