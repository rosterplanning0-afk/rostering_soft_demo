def run(code: str):
    issues = []

    if "SUPABASE_SERVICE_ROLE_KEY" in code:
        issues.append("Service role key exposed in code")

    if "eval(" in code:
        issues.append("Avoid using eval() - security risk")

    return {
        "issues": issues,
        "status": "pass" if not issues else "fail"
    }