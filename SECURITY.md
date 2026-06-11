# Security Policy

## Reporting a Vulnerability

Please do not disclose security issues in public issues, discussions, pull requests, screenshots, or logs.

Use GitHub private vulnerability reporting if it is enabled for this repository. If it is not enabled, contact the project maintainer privately and include only the minimum information needed to reproduce the issue.

Good reports include:

- affected route, feature, or migration;
- reproduction steps;
- expected and actual behavior;
- impact assessment;
- whether any secrets, user data, or production systems may be exposed.

Do not include real API keys, Supabase service role keys, SSH keys, cookies, private database dumps, or real user content in a report.

## Supported Versions

SuperWriter is currently pre-release software. Security fixes are handled on the main development line unless a maintained release branch is announced.

## Sensitive Areas

Please be especially careful around:

- Supabase RLS policies and database functions;
- authentication and session middleware;
- AI provider key storage and routing;
- admin routes and model configuration;
- import, export, and migration workflows;
- deployment scripts and GitHub Actions secrets.
