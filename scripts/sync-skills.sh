#!/bin/bash
# Copies skills/ to provider plugin directories.
# Run this after editing any file in skills/.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
TARGETS=(
  "$REPO_ROOT/providers/claude/plugin/skills"
  "$REPO_ROOT/providers/cursor/plugin/skills"
)

for target in "${TARGETS[@]}"; do
  # Remove old skill directories (preserve .gitkeep)
  find "$target" -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +

  # Copy each skill directory
  for skill_dir in "$SKILLS_DIR"/*/; do
    [ -d "$skill_dir" ] || continue
    cp -r "$skill_dir" "$target/"
  done

  echo "Synced skills to $target"
done
