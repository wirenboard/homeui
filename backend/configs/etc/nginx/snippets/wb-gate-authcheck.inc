# Service gate — auth_request to homeui /auth/check. Pair with wb-gate-unauth.inc.
# The calling `location /` must set $wb_role (admin|operator|user, "this and above").

location = /wb_auth_check {
    internal;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Required-User-Type $wb_role;
    # Pin the auth-decision inputs to server-controlled values so a client cannot
    # forge them: a gate must never honour a client-supplied Allow-Unauthorized-Get
    # (that would let GET through unauthenticated), and the method is nginx's own.
    proxy_set_header Allow-Unauthorized-Get "";
    proxy_set_header X-Original-Method $request_method;
    # Lets the backend key its /auth/check rate-limit bucket per client IP.
    proxy_set_header X-Real-IP $remote_addr;
    # Short auth cache: collapses request storms from chatty SPAs. The answer
    # depends only on (session, required role), so entries are shared between gates.
    proxy_cache wb_gate_auth;
    proxy_cache_key "$cookie_id|$wb_role";
    proxy_cache_valid 200 5s;
    proxy_cache_valid 401 403 2s;
    proxy_cache_lock on;
    proxy_ignore_headers Cache-Control Expires Set-Cookie Vary;
    proxy_pass http://wb-homeui-back/auth/check;
}
