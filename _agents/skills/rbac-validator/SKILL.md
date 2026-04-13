# RBAC Validator

## Overview
Validates Role-Based Access Control (RBAC) permissions.

## When to Apply
- Implementing new features with permissions
- Verifying user authorization logic
- Auditing role assignments

## How to Use
- Check if a specific role has permission for an action
- Verify against the permission matrix

## Rules
- **Admin**: Has read, write, delete access
- **Planner**: Has read and write access
- **Employee**: Has read-only access
- **Default**: No access unless specified
