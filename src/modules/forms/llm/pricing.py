PRICING_MAP = {
    "gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.60 / 1_000_000},
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost of an LLM call in USD."""
    # Fallback to gpt-4o-mini prices if model not found
    prices = PRICING_MAP.get(model, PRICING_MAP["gpt-4o-mini"])
    return (input_tokens * prices["input"]) + (output_tokens * prices["output"])
