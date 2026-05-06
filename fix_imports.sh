#!/bin/bash
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i "s|'motion/react'|'framer-motion'|g" {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|"motion/react"|"framer-motion"|g' {} +
