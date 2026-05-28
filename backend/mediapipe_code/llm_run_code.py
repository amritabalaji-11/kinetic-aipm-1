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


def run_llm_comparison(current_json: dict, previous_json: dict, debug=False):
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def get_coaching_params(data_json):
        coaching = data_json.get("coaching", {}) or {}
        params = coaching.get("parameters", {}) or {}
        
        def get_score(p_name):
            p = params.get(p_name)
            if isinstance(p, dict):
                try:
                    return int(float(str(p.get("score", 80)).strip()))
                except:
                    return 80
            elif isinstance(p, (int, float, str)):
                try:
                    return int(float(str(p).strip()))
                except:
                    return 80
            return 80
            
        rom_val = get_score("range_of_motion") if params.get("range_of_motion") is not None else get_score("tempo")
        tempo_val = get_score("tempo") if params.get("tempo") is not None else get_score("range_of_motion")
        return {
            "posture": get_score("posture"),
            "stability": get_score("stability"),
            "movement_quality": get_score("movement_quality"),
            "range_of_motion": rom_val,
            "tempo": tempo_val
        }

    current_reps = current_json.get("reps") or []
    current_rep_scores = []
    if isinstance(current_reps, list):
        for rep in current_reps:
            if isinstance(rep, dict) and "form_score" in rep:
                try:
                    current_rep_scores.append(int(float(str(rep["form_score"]).strip())))
                except:
                    current_rep_scores.append(80)
            elif isinstance(rep, (int, float, str)):
                try:
                    current_rep_scores.append(int(float(str(rep).strip())))
                except:
                    current_rep_scores.append(80)

    previous_reps = previous_json.get("reps") or []
    previous_rep_scores = []
    if isinstance(previous_reps, list):
        for rep in previous_reps:
            if isinstance(rep, dict) and "form_score" in rep:
                try:
                    previous_rep_scores.append(int(float(str(rep["form_score"]).strip())))
                except:
                    previous_rep_scores.append(80)
            elif isinstance(rep, (int, float, str)):
                try:
                    previous_rep_scores.append(int(float(str(rep).strip())))
                except:
                    previous_rep_scores.append(80)

    def safe_float(val):
        try:
            if val is None:
                return 0.0
            return float(str(val).strip())
        except:
            return 0.0

    comparison_dict = {
        "has_comparison": True,
        "empty_state_message": None,

        "current": {
            "analysis_id": current_json.get("analysis_id"),
            "date": current_json.get("created_at"),
            "exercise": current_json.get("exercise"),
            "weight_value": safe_float(current_json.get("weight_value")),
            "weight_unit": current_json.get("weight_unit"),
            "overall_score": int(float(str(current_json.get("overall_score", 70)).strip())) if current_json.get("overall_score") is not None else 70,
            "annotated_frame_url": current_json.get("annotated_frame_url") or (current_json.get("annotated_frame_urls")[0] if current_json.get("annotated_frame_urls") else None),
            "rep_scores": current_rep_scores,
            "parameters": get_coaching_params(current_json)
        },

        "previous": {
            "analysis_id": previous_json.get("analysis_id"),
            "date": previous_json.get("created_at"),
            "exercise": previous_json.get("exercise"),
            "weight_value": safe_float(previous_json.get("weight_value")),
            "weight_unit": previous_json.get("weight_unit"),
            "overall_score": int(float(str(previous_json.get("overall_score", 70)).strip())) if previous_json.get("overall_score") is not None else 70,
            "annotated_frame_url": previous_json.get("annotated_frame_url") or (previous_json.get("annotated_frame_urls")[0] if previous_json.get("annotated_frame_urls") else None),
            "rep_scores": previous_rep_scores,
            "parameters": get_coaching_params(previous_json)
        }
    }
    
    prompt = build_comparison_prompt(current_json, previous_json)

    max_tokens_reminder = "\n\nMake sure your response not exceed 2000 tokens"
    
    start = time.time()
    resp = client.messages.create(
        model=HAIKU_MODEL, max_tokens=2000, system=COMPARISON_SYSTEM,
        messages=[{"role":"user","content":[
            {"type":"text","text":prompt + max_tokens_reminder},
        ]}],
    )

    resp_json = extract_json(resp.content[0].text)

    comparison_dict["comparison_coaching"] = resp_json["comparison_coaching"]
    
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

    return comparison_dict