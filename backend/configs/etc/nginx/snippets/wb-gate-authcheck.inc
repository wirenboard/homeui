# Service gate — auth_request to homeui /auth/check. Pair with wb-gate-unauth.inc.
# The calling `location /` must set $wb_role (admin|operator|user, "this and above").

location = /wb_auth_check {
    internal;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Required-User-Type $wb_role;
    proxy_pass http://wb-homeui-back/auth/check;
}
