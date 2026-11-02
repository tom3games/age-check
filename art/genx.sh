#!/bin/zsh
k=$1; cd ~/Desktop/claudecode/age-check/art
python3 ~/.claude/skills/3d-homepage/scripts/codex_imagegen.py raw/${k}_x.png prompts/${k}_x.md raw/${k}.png --quality high --size 1024x1536 > logs/${k}_x.log 2>&1; echo "$k $?"
