# Wiren Board service gate — unauthenticated fallback, shared by every gate
# (cached or not). Wire it with `error_page 401 = @wb_unauth;` in `location /`.
#
# The calling `location /` must set $wb_return — the same-origin path homeui
# returns to after login (e.g. /open-foo).

location @wb_unauth {
    # Browser navigation -> homeui login form; anything else (XHR/API/CLI) -> 401.
    if ($http_sec_fetch_mode = "navigate") {
        return 302 https://$host/login/?externalReturn=$wb_return;
    }
    return 401;
}
