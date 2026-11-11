#!/bin/sh
echo "window.__CONFIG__ = { API_BASE_URL: \"${API_BASE_URL:-http://localhost:8080}\" };" > /usr/share/nginx/html/config.js

