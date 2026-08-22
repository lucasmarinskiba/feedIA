#!/bin/bash

# Get all unused import errors (not params)
npm run lint 2>&1 | grep "is defined but never used" | grep -v "Allowed unused args" | while IFS= read -r line; do
  # Extract file, line number, and variable name
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  varname=$(echo "$line" | grep -oE "'[^']+'" | head -1 | tr -d "'")
  
  if [ -f "$file" ] && [ ! -z "$varname" ]; then
    # Remove the import/declaration line
    sed -i "${linenum}d" "$file"
    echo "✓ Removed unused $varname from $file:$linenum"
  fi
done

echo "✓ Cleanup complete"
