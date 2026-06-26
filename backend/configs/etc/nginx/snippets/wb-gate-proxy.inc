# Wiren Board service gate — proxy headers for the gated upstream.
#
# Included inside the per-service `location /`, after proxy_pass. Strips any
# client-supplied X-WB-* (these are trusted identity headers — never accept them
# from the client) and carries the websocket upgrade so editor/dashboard-style
# sub-apps work through the gate.

proxy_set_header X-WB-Role "";
proxy_set_header X-WB-User "";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
