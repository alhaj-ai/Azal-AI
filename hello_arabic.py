"""hello_arabic.py — Test script for Azal Store AI Assistant via local/cloud LLM."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from api.llm_manager import chat_generate

reply = chat_generate(
    "أنت المساعد الذكي لـ 'منظومة آزال الذكية للتجارة والتجزئة'. أجب بلغة عربية فصحى موجزة.",
    "عرّف نفسك في جملتين."
)
print("رد المساعد الذكي:\n", reply)
