"""eval_customer.py — run built-in evaluators against the Customer Agent.

For each query in dataset.jsonl: retrieve context from AI Search,
invoke run_customer_agent, score response on groundedness, relevance,
fluency. Print per-case scores + aggregate.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.ai.evaluation import (
    GroundednessEvaluator,
    RelevanceEvaluator,
    FluencyEvaluator,
)

from agents.customer_agent import run_customer_agent

AZURE_OPENAI_ENDPOINT = "https://azal-ai.openai.azure.com/"
JUDGE_MODEL = "gpt-4o"
SEARCH_ENDPOINT = "https://azal-ai.search.windows.net"
INDEX_NAME = "azal-index"
DATASET_PATH = Path(__file__).parent / "dataset.jsonl"


def get_retrieval_context(query: str, credential) -> str:
    """Pull top-3 chunks from AI Search to feed groundedness evaluator."""
    search = SearchClient(
        endpoint=SEARCH_ENDPOINT,
        index_name=INDEX_NAME,
        credential=credential,
    )
    results = search.search(search_text=query, top=3)
    chunks = []
    for r in results:
        content = r.get("content") or r.get("chunk") or ""
        if content:
            chunks.append(content)
    return "\n---\n".join(chunks)


def main():
    credential = DefaultAzureCredential()

    # LLM-as-judge config
    model_config = {
        "azure_endpoint": AZURE_OPENAI_ENDPOINT,
        "api_version": "2024-10-21",
        "azure_deployment": JUDGE_MODEL,
    }

    groundedness = GroundednessEvaluator(model_config=model_config)
    relevance = RelevanceEvaluator(model_config=model_config)
    fluency = FluencyEvaluator(model_config=model_config)

    cases = [
        json.loads(line)
        for line in DATASET_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    results = []
    for i, case in enumerate(cases, 1):
        query = case["query"]
        print(f"\n[{i}/{len(cases)}] {query[:50]}...")

        context = get_retrieval_context(query, credential)
        agent_result = run_customer_agent(query)
        if agent_result["status"] != "ok":
            print(f"  Agent failed: {agent_result['error']}")
            continue
        response = agent_result["answer"]
        print(f"  RESPONSE: {response[:200]}")

        g = groundedness(query=query, response=response, context=context)
        r = relevance(query=query, response=response)
        f = fluency(response=response)

        results.append({
            "query": query,
            "intent": case.get("intent", ""),
            "response": response,
            "g_score": g["groundedness"],
            "g_result": g["groundedness_result"],
            "r_score": r["relevance"],
            "r_result": r["relevance_result"],
            "f_score": f["fluency"],
            "f_result": f["fluency_result"],
        })
        print(f"  G:{g['groundedness']:.1f}({g['groundedness_result']}) "
              f"R:{r['relevance']:.1f}({r['relevance_result']}) "
              f"F:{f['fluency']:.1f}({f['fluency_result']})")

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"{'Intent':<35} {'G':>5} {'R':>5} {'F':>5}")
    for r in results:
        print(f"{r['intent']:<35} {r['g_score']:>5.1f} "
              f"{r['r_score']:>5.1f} {r['f_score']:>5.1f}")

    if results:
        avg_g = sum(r["g_score"] for r in results) / len(results)
        avg_r = sum(r["r_score"] for r in results) / len(results)
        avg_f = sum(r["f_score"] for r in results) / len(results)
        print("-" * 60)
        print(f"{'AVERAGE':<35} {avg_g:>5.2f} {avg_r:>5.2f} {avg_f:>5.2f}")


if __name__ == "__main__":
    main()
    out = Path(__file__).parent / "results.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"\nFull results: {out}")