def run(query: str):
    suggestions = []

    if "SELECT *" in query:
        suggestions.append("Avoid SELECT *, specify columns")

    if "WHERE" not in query:
        suggestions.append("Query missing WHERE clause")

    return {
        "suggestions": suggestions
    }