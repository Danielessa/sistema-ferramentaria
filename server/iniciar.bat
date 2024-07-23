@echo off
cd "server"
start /b node server.js
start /b "" "http://localhost:3000"