# DB Query Optimizer

## Overview
Analyzes SQL queries for performance improvements and anti-patterns.

## When to Apply
- Designing new database queries
- Debugging slow queries
- Reviewing Postgres schema interactions

## How to Use
- Check for "SELECT *" patterns
- Ensure "WHERE" clauses are present for performance
- Validate query structure

## Rules
- **Explicit Selection**: Always name columns instead of using `*`
- **Filtering**: Use `WHERE` clauses to limit result sets
