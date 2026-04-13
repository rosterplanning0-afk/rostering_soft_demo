# Security Audit Pro

## Overview
A security-focused tool for identifying potential vulnerabilities and data leaks.

## When to Apply
- Before production pushes
- When handling secrets or environment variables
- Reviewing security-sensitive code

## How to Use
- Scan for exposed API keys (especially Supabase service role keys)
- Identify dangerous function calls like `eval()`

## Rules
- **Secret Protection**: Never expose service role keys in client-side or committed code
- **Input Validation**: Avoid dangerous execution patterns like `eval()`
