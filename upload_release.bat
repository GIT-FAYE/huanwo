@echo off
set GH_TOKEN=***
"/c/Program Files/GitHub CLI/gh" release upload v0.3.0 "dist/HuanWo-Setup-0.3.0.exe" "dist/HuanWo-Setup-0.3.0.exe.blockmap" "dist/latest.yml" --clobber
