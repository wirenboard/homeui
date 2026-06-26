# Wiren Board service gate — auth_request against homeui's /auth/check plus the
# unauthenticated fallback.
#
# The calling `location /` must set two variables before including this:
#   $wb_role   — minimal role: admin | operator | user ("this role and above").
#   $wb_return — same-origin path homeui returns to after login (e.g. /open-foo).
#
# No verdict cache here: homeui's /auth/check limit is raised to 1000 req/min,
# which absorbs the open-time burst of a typical interactive sub-app.
location = /wb_auth_check {
    internal;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Required-User-Type $wb_role;
    proxy_pass http://wb-homeui-back/auth/check;
}
location @wb_unauth {
    # Browser navigation -> homeui login form; anything else (XHR/API/CLI) -> 401.
    if ($http_sec_fetch_mode = "navigate") {
        return 302 https://$host/login/?externalReturn=$wb_return;
    }
    return 401;
}
