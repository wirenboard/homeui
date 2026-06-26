# Wiren Board service gate — auth_request backend (homeui /auth/check).
#
# The calling `location /` must set $wb_role — the minimal role:
# admin | operator | user ("this role and above"). Pair with wb-gate-unauth.inc
# for the unauthenticated fallback. A gate whose open-time burst beats even the
# raised /auth/check limit (e.g. an editor) ships its OWN cached check instead of
# this file, and still reuses wb-gate-unauth.inc as-is.

location = /wb_auth_check {
    internal;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Required-User-Type $wb_role;
    proxy_pass http://wb-homeui-back/auth/check;
}
