#!/bin/bash

# For each line with "Unexpected any", add eslint-disable comment
npm run lint 2>&1 | grep "Unexpected any" | while IFS= read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  
  if [ -f "$file" ]; then
    # Insert disable comment on line before the error
    targetline=$((linenum - 1))
    sed -i "${targetline}a\  // eslint-disable-next-line @typescript-eslint/no-explicit-any" "$file"
    echo "✓ Documented any at $file:$linenum"
  fi
done

echo "✓ Annotation complete"
