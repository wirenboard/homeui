# Service gate — proxy headers. Include inside `location /` after proxy_pass.
# Strips client-supplied X-WB-* (trusted identity headers) and carries the WS upgrade.

proxy_set_header X-WB-Role "";
proxy_set_header X-WB-User "";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
