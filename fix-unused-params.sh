#!/bin/bash

# Find files with unused param warnings
npm run lint 2>&1 | grep "Allowed unused args must match" | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  param=$(echo "$line" | grep -oE "'[^']+'" | head -1 | tr -d "'")
  
  if [ ! -z "$param" ]; then
    # Use sed to prefix param with _ (case insensitive, word boundary)
    sed -i "${linenum}s/\b${param}\b/_${param}/g" "$file"
    echo "✓ $file:$linenum - prefixed ${param} → _${param}"
  fi
done
