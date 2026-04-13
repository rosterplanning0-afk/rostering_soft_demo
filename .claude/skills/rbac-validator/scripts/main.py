def run(role: str, action: str):
    permissions = {
        "system_admin": ["read", "write", "delete"],
        "roster_planner": ["read", "write"],
        "employee": ["read"]
    }

    allowed = action in permissions.get(role, [])

    return {
        "allowed": allowed,
        "role": role,
        "action": action
    }