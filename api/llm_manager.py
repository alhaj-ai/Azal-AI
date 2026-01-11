"""llm_manager.py - Dynamic Multi-Provider LLM Integration for Azal AI."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from openai import OpenAI

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "llm_config.json"


def get_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {
            "active_provider": "lm_studio",
            "temperature": 0.7,
            "max_tokens": 1024,
            "providers": {
                "lm_studio": {
                    "name": "LM Studio (محلي - Local GPU)",
                    "base_url": "http://127.0.0.1:1234/v1",
                    "api_key": "lm-studio",
                    "model": "gemma-4-e2b-it",
                    "is_local": True,
                    "enabled": True,
                }
            },
        }
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(new_config: dict[str, Any]) -> dict[str, Any]:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(new_config, f, ensure_ascii=False, indent=2)
    return new_config


def get_active_client() -> tuple[OpenAI, str, int, float]:
    config = get_config()
    active_key = config.get("active_provider", "lm_studio")
    providers = config.get("providers", {})
    provider = providers.get(active_key, {})

    base_url = provider.get("base_url", "http://127.0.0.1:1234/v1")
    api_key = provider.get("api_key") or "dummy-key"
    model = provider.get("model", "gemma-4-e2b-it")
    max_tokens = int(config.get("max_tokens", 1024))
    temperature = float(config.get("temperature", 0.7))

    client = OpenAI(base_url=base_url, api_key=api_key, timeout=25.0)
    return client, model, max_tokens, temperature


def chat_generate(system_prompt: str, user_prompt: str) -> str:
    """Generate completion using currently configured LLM provider."""
    client, model, max_tokens, temperature = get_active_client()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        msg = response.choices[0].message
        content = (msg.content or "").strip()
        if not content and hasattr(msg, "reasoning_content") and msg.reasoning_content:
            content = msg.reasoning_content.strip()
        return content or "تمت معالجة الطلب بنجاح."
    except Exception as exc:
        return f"خطأ في الاتصال بمزود الذكاء الاصطناعي ({model}): {str(exc)}"


def test_provider_connection(provider_data: dict[str, Any]) -> dict[str, Any]:
    base_url = provider_data.get("base_url", "").strip()
    api_key = provider_data.get("api_key", "").strip() or "dummy"
    model = provider_data.get("model", "").strip() or "default"

    if not base_url:
        return {"status": "error", "message": "رابط المزود (Base URL) مطلوب."}

    client = OpenAI(base_url=base_url, api_key=api_key, timeout=10.0)
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "مرحبا! أجب بكلمة واحدة: متصل"}],
            max_tokens=200,
        )
        content = (response.choices[0].message.content or "").strip()
        return {
            "status": "ok",
            "message": f"تم الاتصال بنجاح بالمزود ({model})!",
            "sample_reply": content or "متصل",
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"فشل الاتصال: {str(e)}",
        }
