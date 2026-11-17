# Service gate — auth_request to homeui /auth/check. Pair with wb-gate-unauth.inc.
# The calling `location /` must set $wb_role (admin|operator|user, "this and above").

location = /wb_auth_check {
    internal;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Required-User-Type $wb_role;
    # Pin to server-controlled values: a client-supplied Allow-Unauthorized-Get would open GET.
    proxy_set_header Allow-Unauthorized-Get "";
    proxy_set_header X-Original-Method $request_method;
    proxy_set_header X-Real-IP $remote_addr;
    # 5s auth cache; the answer depends only on (session, role), so entries are shared between gates.
    proxy_cache wb_gate_auth;
    proxy_cache_key "$cookie_id|$wb_role";
    proxy_cache_valid 200 5s;
    proxy_cache_valid 401 403 2s;
    proxy_cache_lock on;
    proxy_ignore_headers Cache-Control Expires Set-Cookie Vary;
    proxy_pass http://wb-homeui-back/auth/check;
}
