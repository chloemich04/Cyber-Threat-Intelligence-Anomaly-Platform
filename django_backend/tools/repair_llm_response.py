import sys
import json
import re
from pathlib import Path

def strip_fence(s: str) -> str:
    # remove leading/trailing backtick fences and common language tags
    s = s.strip()
    s = re.sub(r"^```[a-zA-Z]*\n", '', s)
    s = re.sub(r"\n```$", '', s)
    return s


def try_repair(path: str):
    p = Path(path)
    if not p.exists():
        print('File not found:', path)
        return 2
    raw = p.read_text(encoding='utf-8')
    s = strip_fence(raw)
    # Try full parse first
    try:
        parsed = json.loads(s)
        print('OK: full parse succeeded')
        out = p.with_suffix('.repaired.json')
        out.write_text(json.dumps(parsed, indent=2), encoding='utf-8')
        print('Wrote repaired file to', out)
        return 0
    except Exception as e:
        # Try trimming the tail progressively until parse works
        # Start trimming at up to last 2000 chars
        max_trim = min(len(s), 8000)
        for trim in range(0, max_trim):
            candidate = s[:len(s)-trim]
            try:
                parsed = json.loads(candidate)
                out = p.with_suffix('.repaired.json')
                out.write_text(json.dumps(parsed, indent=2), encoding='utf-8')
                print(f'Repaired by trimming {trim} chars; wrote to {out}')
                return 0
            except Exception:
                continue
        # If still not parsed, try to extract the first balanced {...} block
        def extract_first_braced(s):
            start = None
            depth = 0
            in_string = False
            esc = False
            quote = None
            for i,ch in enumerate(s):
                if start is None:
                    if ch == '{':
                        start = i
                        depth = 1
                        continue
                else:
                    if esc:
                        esc = False
                        continue
                    if ch == '\\':
                        esc = True
                        continue
                    if in_string:
                        if ch == quote:
                            in_string = False
                            quote = None
                        continue
                    else:
                        if ch == '"' or ch == "'":
                            in_string = True
                            quote = ch
                            continue
                        if ch == '{':
                            depth += 1
                        elif ch == '}':
                            depth -= 1
                            if depth == 0:
                                return s[start:i+1]
            return None
        block = extract_first_braced(s)
        if block:
            try:
                parsed = json.loads(block)
                out = p.with_suffix('.repaired.json')
                out.write_text(json.dumps(parsed, indent=2), encoding='utf-8')
                print('Extracted first balanced block and wrote to', out)
                return 0
            except Exception:
                pass
    print('Unable to repair JSON from', path)
    return 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: repair_llm_response.py <path>')
        sys.exit(2)
    sys.exit(try_repair(sys.argv[1]))
