import os
import re

def walk_files(directory):
    for root, dirs, files in os.walk(directory):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.jsx'):
                yield os.path.join(root, f)

for fpath in walk_files('src'):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    i = 0
    n = len(content)
    while i < n:
        if content[i] == '<':
            m = re.match(r'^<(input|textarea|select)\b', content[i:])
            if m:
                tag = m.group(1)
                start_i = i
                j = i + len(m.group(0))
                brace_depth = 0
                in_quote = None
                end_i = -1
                while j < n:
                    ch = content[j]
                    if in_quote:
                        if ch == in_quote and content[j-1] != '\\':
                            in_quote = None
                    else:
                        if ch in ('"', "'", '`'):
                            in_quote = ch
                        elif ch == '{':
                            brace_depth += 1
                        elif ch == '}':
                            brace_depth -= 1
                        elif ch == '>' and brace_depth == 0:
                            end_i = j
                            break
                    j += 1
                if end_i != -1:
                    tag_str = content[start_i:end_i+1]
                    line_num = content[:start_i].count('\n') + 1

                    has_val = bool(re.search(r'\bvalue\s*=', tag_str))
                    has_change = bool(re.search(r'\bonChange\s*=', tag_str))
                    has_readonly = bool(re.search(r'\breadOnly\b', tag_str))
                    has_default = bool(re.search(r'\bdefaultValue\s*=', tag_str))
                    is_submit = bool(re.search(r'type\s*=\s*["\'](submit|button|file)["\']', tag_str))

                    print(f"[{fpath}:{line_num}] <{tag}> val={has_val} change={has_change} ro={has_readonly} submit={is_submit}")

                    if has_val and not has_change and not has_readonly and not is_submit:
                        print(f"!!! TARGET FOUND in {fpath}:{line_num} !!!")
                        print(tag_str)
                        print("=" * 60)

                    i = end_i
        i += 1
