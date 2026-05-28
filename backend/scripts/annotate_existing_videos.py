import os
import sys
import json
import sqlite3
from dotenv import load_dotenv
import subprocess

# Ensure mediapipe_code is in search path with high priority
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../mediapipe_code")))

from landmark_framework import LandmarkQualityFramework, MEDIAPIPE_MODEL

# Resolve dynamic paths
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../kinetic.db"))

def main():
    # Load .env relative to this script
    dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
    load_dotenv(dotenv_path, override=True)
        
    print("=" * 60)
    print("RETROACTIVE BIOMECHANICAL VIDEO ANNOTATION RUNNER (SQLITE)")
    print("=" * 60)
    
    # Initialize landmark framework
    framework = LandmarkQualityFramework(model_path=MEDIAPIPE_MODEL)
    
    # Connect to SQLite database
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Please run init_db.py first!")
        return
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Fetch all completed analyses
    cur.execute("""
        SELECT session_id, video_url, weight_kg 
        FROM form_analyses 
        WHERE status = 'completed' AND video_url IS NOT NULL;
    """)
    sessions = cur.fetchall()
    print(f"Found {len(sessions)} completed session(s) to process.")
    
    processed_count = 0
    failed_count = 0
    
    for idx, session in enumerate(sessions, 1):
        session_id = session["session_id"]
        video_url = session["video_url"]
        weight_kg = float(session["weight_kg"]) if session["weight_kg"] else 0.0
        
        # Resolve absolute video path relative to backend folder
        video_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../", video_url))
        
        print(f"\n[{idx}/{len(sessions)}] Processing session: {session_id}")
        print(f" -> Video file path: {video_path}")
        
        if not os.path.exists(video_path):
            print(f" -> ERROR: Video file does not exist on disk!")
            failed_count += 1
            continue
            
        temp_annotated_path = video_path + ".annotated_temp.mp4"
        output_reencoded_path = video_path + ".annotated.mp4"
        
        # Clean up any leftover files first
        for path in (temp_annotated_path, output_reencoded_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except:
                    pass
                
        try:
            print(" -> Running landmark framework and rendering overlays...")
            final_json, quality_result, collage_b64, rep_frames_list = framework.process_video_once(
                video_path, "goblet squat", weight_kg
            )
            
            if not os.path.exists(temp_annotated_path):
                print(" -> ERROR: Landmark framework finished but temp annotated video was not created!")
                failed_count += 1
                continue
                
            print(" -> Compressing and re-encoding with FFmpeg (H.264, AAC audio, faststart)...")
            cmd = [
                "ffmpeg", "-y",
                "-i", temp_annotated_path,
                "-i", video_path,
                "-map", "0:v",
                "-map", "1:a?",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-shortest",
                output_reencoded_path
            ]
            
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            if os.path.exists(output_reencoded_path):
                os.replace(output_reencoded_path, video_path)
                print(f" -> SUCCESS: Overwrote original file with H.264 annotated video!")
                processed_count += 1
            else:
                print(" -> ERROR: FFmpeg failed to produce the final re-encoded video!")
                failed_count += 1
                
        except Exception as e:
            print(f" -> CRITICAL EXCEPTION processing session {session_id}: {str(e)}")
            failed_count += 1
        finally:
            # Clean up temp raw annotated video
            if os.path.exists(temp_annotated_path):
                try:
                    os.remove(temp_annotated_path)
                except:
                    pass
                    
    cur.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"Total Completed Sessions: {len(sessions)}")
    print(f"Successfully Annotated:  {processed_count}")
    print(f"Failed / Skipped:        {failed_count}")
    print("=" * 60)

if __name__ == "__main__":
    main()
