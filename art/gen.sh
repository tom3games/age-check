#!/bin/zsh
k=$1; cd ~/Desktop/claudecode/age-check/art
if [[ $k == bg ]]; then s=1536x1024; elif [[ $k == items ]]; then s=1536x1024; else s=1024x1536; fi
python3 ~/.claude/skills/3d-homepage/scripts/codex_imagegen.py raw/$k.png prompts/$k.md --quality high --size $s > logs/$k.log 2>&1
echo "$k done $?"
