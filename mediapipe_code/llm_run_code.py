import datetime
import json
import os
import re
import time
import uuid
import anthropic
from dotenv import load_dotenv

from prompt_configuration import COACHING_SYSTEM, COMPARISON_SYSTEM, PROMPT_TEST_SYSTEM, build_analysis_prompt, build_comparison_prompt, get_user_prompt_test

load_dotenv()

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
        "faults_detected must be an OBJECT with three boolean keys — not an array. "
        "No markdown fences, no extra text outside the JSON."
    )
    max_tokens_reminder = "\n\nMake sure your response not exceed 2000 tokens"
    
    start = time.time()
    resp = client.messages.create(
        model=HAIKU_MODEL, max_tokens=2000, system=COACHING_SYSTEM,
        messages=[{"role":"user","content":[
            {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":image_base64}},
            {"type":"text","text":prompt + schema_reminder + max_tokens_reminder},
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

    comparison_dict = {
        "has_comparison": True,
        "empty_state_message": None,

        "current": {
            "analysis_id": current_json["analysis_id"],
            "date": current_json["created_at"],
            "exercise": current_json["exercise"],
            "weight_value": current_json["weight_value"],
            "weight_unit": current_json["weight_unit"],
            "overall_score": current_json["overall_score"],
            "annotated_frame_url": current_json["annotated_frame_url"],
            "rep_scores": [rep["form_score"] for rep in current_json["reps"]],
            "parameters": {
            "posture":          current_json["coaching"]["parameters"]["posture"]["score"],
            "stability":        current_json["coaching"]["parameters"]["stability"]["score"],
            "movement_quality": current_json["coaching"]["parameters"]["movement_quality"]["score"],
            "tempo":            current_json["coaching"]["parameters"]["tempo"]["score"]
            }
        },

        "previous": {
            "analysis_id": previous_json["analysis_id"],
            "date": previous_json["created_at"],
            "exercise": previous_json["exercise"],
            "weight_value": previous_json["weight_value"],
            "weight_unit": previous_json["weight_unit"],
            "overall_score": previous_json["overall_score"],
            "annotated_frame_url": previous_json["annotated_frame_url"],
            "rep_scores": [rep["form_score"] for rep in previous_json["reps"]],
            "parameters": {
            "posture":          previous_json["coaching"]["parameters"]["posture"]["score"],
            "stability":        previous_json["coaching"]["parameters"]["stability"]["score"],
            "movement_quality": previous_json["coaching"]["parameters"]["movement_quality"]["score"],
            "tempo":            previous_json["coaching"]["parameters"]["tempo"]["score"]
            }
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


def get_analysis_result(angles_json, collage_b64, gate_status, output_filename):

    response = run_llm_analysis(angles_json, collage_b64, debug=True)

    response["quality_gate_status"] = gate_status
    response["created_at"] = str(datetime.date.today())
    response["rep_count"] = angles_json["session"]["rep_count"]
    response["weight_unit"] = "kg"
    response["weight_value"] = angles_json["session"]["weight_kg"]
    response["exercise"] = angles_json["session"]["exercise"]
    response["analysis_id"] = str(uuid.uuid4())

    output_dir = "./mediapipe_code/results"
    os.makedirs(output_dir, exist_ok=True)
    json_filename = os.path.join(output_dir, f"{output_filename}.json")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(
            response,
            f,
            indent=4,
            ensure_ascii=False,
        )

    return response


def get_comparison_result(current_json_path, previous_json_path, output_filename):
    with open(current_json_path, "r", encoding="utf-8") as f:
        current_json = json.load(f)

    with open(previous_json_path, "r", encoding="utf-8") as f:
        previous_json = json.load(f)

    response = run_llm_comparison(previous_json, current_json, debug=True)

    output_dir = "./mediapipe_code/results"
    os.makedirs(output_dir, exist_ok=True)
    json_filename = os.path.join(output_dir, f"{output_filename}.json")
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(
            response,
            f,
            indent=4,
            ensure_ascii=False,
        )

    return response


def run_llm_analysis_test(mp_json: dict, image_base64, debug = False) -> tuple[dict, float, float]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    
    prompt = get_user_prompt_test(mp_json["consolidated"]["total_reps"], mp_json["session"]["analysis_id"], mp_json)
    schema_reminder = (
        "\n\nCRITICAL: Return ONLY a valid JSON object matching the schema above. "
        "faults_detected must be an OBJECT with three boolean keys — not an array. "
        "No markdown fences, no extra text outside the JSON."
    )
    max_tokens_reminder = "\n\nMake sure your response not exceed 2000 tokens"
    
    start = time.time()
    resp = client.messages.create(
        model=HAIKU_MODEL, max_tokens=3000, system=PROMPT_TEST_SYSTEM,
        messages=[{"role":"user","content":[
            {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":image_base64}},
            {"type":"text","text":prompt + schema_reminder + max_tokens_reminder},
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