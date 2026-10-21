# Security Guidelines

## Environment Files

**NEVER commit real credentials to git.**

### Correct Pattern

```bash
# .env.example (COMMITTED - empty values)
POSTGRES_PASSWORD=

# .env (NOT COMMITTED - in .gitignore)
POSTGRES_PASSWORD=actual_strong_password_here
```

### Wrong Pattern

```bash
# DON'T DO THIS - committing actual passwords
POSTGRES_PASSWORD=MyPassword123
POSTGRES_PASSWORD=changeme
POSTGRES_PASSWORD=localdev
```

## Docker Compose

**NEVER use default passwords in docker-compose.yml.**

### Correct Pattern

```yaml
# Requires .env to have POSTGRES_PASSWORD set
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
```

### Wrong Pattern

```yaml
# DON'T DO THIS - default password in code
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
```

## Pre-Commit Hook

A global gitleaks pre-commit hook should catch these issues. Install it:

```bash
brew install gitleaks
git config --global core.hooksPath ~/.git-hooks
```

See main CLAUDE.md for hook setup details.

## Checklist Before Commit

- [ ] No passwords in .env.example (only empty values)
- [ ] No default passwords in docker-compose.yml
- [ ] No connection strings with embedded passwords
- [ ] .env files are in .gitignore
- [ ] Production secrets are stored securely (not in repo)
