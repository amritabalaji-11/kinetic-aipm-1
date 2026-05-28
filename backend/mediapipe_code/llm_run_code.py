import datetime
import json
import os
import re
import time
import uuid
import anthropic
from dotenv import load_dotenv, find_dotenv

from prompts.coaching_prompt import COACHING_SYSTEM, build_analysis_prompt
from prompts.progression_prompt import COMPARISON_SYSTEM, build_comparison_prompt

load_dotenv(find_dotenv(), override=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
HAIKU_MODEL  = os.getenv("HAIKU_MODEL")


def extract_json(raw: str) -> dict:
    raw = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", raw)
    if fence:
        raw = fence.group(1)
    return json.loads(raw)


def run_llm_analysis(mp_json: dict, image_base64, debug = False) -> tuple[dict, float, float]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    
    prompt = build_analysis_prompt(mp_json, "Attached: composite grid of frames from original squat video.")
    schema_reminder = (
        "\n\nCRITICAL: Return ONLY a valid JSON object matching the schema above. "
        "No markdown fences, no extra text outside the JSON. "
        "Fill `reasoning` first, then scores, then coaching. "
        "All user-facing text must use plain body-position language — NO raw angle numbers."
    )
    
    start = time.time()
    resp = client.messages.create(
        model=HAIKU_MODEL, max_tokens=4096, system=COACHING_SYSTEM,
        messages=[{"role":"user","content":[
            {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":image_base64}},
            {"type":"text","text":prompt + schema_reminder},
        ]}],
    )
    
    if resp.stop_reason == "max_tokens":
        raise ValueError("Haiku truncated — increase max_tokens")
    
    lat = (time.time() - start) * 1000

    if debug:
      print("Time:", lat)

      usage = resp.usage

      print("=" * 20)
      print("Input tokens:", usage.input_tokens)
      print("Output tokens:", usage.output_tokens)

      input_price_per_million = 1.00
      output_price_per_million = 5.00

      input_cost = (usage.input_tokens / 1000000) * input_price_per_million
      output_cost = (usage.output_tokens / 1000000) * output_price_per_million
      total_cost = input_cost + output_cost

      print(f"Input cost:  ${input_cost:.8f}")
      print(f"Output cost: ${output_cost:.8f}")
      print(f"Total cost:  ${total_cost:.8f}")
      print("=" * 20)

    return extract_json(resp.content[0].text)


def run_llm_comparison(current_json: dict, previous_json, debug=False):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # Reconcile if history list or single dictionary is passed
    if isinstance(previous_json, list):
        history_list = previous_json
    else:
        history_list = [previous_json] if previous_json else []

    prompt = build_comparison_prompt(current_json, history_list)

    max_tokens_reminder = "\n\nMake sure your response not exceed 2000 tokens"
    
    start = time.time()
    resp = client.messages.create(
        model=HAIKU_MODEL, max_tokens=2000, system=COMPARISON_SYSTEM,
        messages=[{"role":"user","content":[
            {"type":"text","text":prompt + max_tokens_reminder},
        ]}],
    )

    resp_json = extract_json(resp.content[0].text)
    
    if resp.stop_reason == "max_tokens":
        raise ValueError("Haiku truncated — increase max_tokens")
    
    lat = (time.time() - start) * 1000

    if debug:
      print("Time:", lat)

      usage = resp.usage

      print("=" * 20)
      print("Input tokens:", usage.input_tokens)
      print("Output tokens:", usage.output_tokens)

      input_price_per_million = 1.00
      output_price_per_million = 5.00

      input_cost = (usage.input_tokens / 1000000) * input_price_per_million
      output_cost = (usage.output_tokens / 1000000) * output_price_per_million
      total_cost = input_cost + output_cost

      print(f"Input cost:  ${input_cost:.8f}")
      print(f"Output cost: ${output_cost:.8f}")
      print(f"Total cost:  ${total_cost:.8f}")
      print("=" * 20)

    return resp_json