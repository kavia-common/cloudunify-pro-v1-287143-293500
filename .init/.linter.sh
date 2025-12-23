#!/bin/bash
cd /home/kavia/workspace/code-generation/cloudunify-pro-v1-287143-293500/WebFrontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

