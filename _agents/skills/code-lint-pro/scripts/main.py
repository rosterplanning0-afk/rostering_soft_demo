def run(code: str):
    issues = []

    if "console.log" in code:
        issues.append("Remove console.log statements")

    if "any" in code:
        issues.append("Avoid using 'any' type in TypeScript")

    return {
        "issues": issues,
        "status": "pass" if not issues else "fail"
    }