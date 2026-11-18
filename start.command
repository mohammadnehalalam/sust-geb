#!/bin/bash
cd "$(dirname "$0")"
export ADMIN_PASSWORD=ChangeMe123
export GEMINI_API_KEY=""
export GROQ_API_KEY=""
(sleep 1; open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) &
node server.js
