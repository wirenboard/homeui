# Service gate — unauthenticated fallback. Wire with `error_page 401 = @wb_unauth;`.
# The calling `location /` must set $wb_return (same-origin path to return to after login).

location @wb_unauth {
    # Browser navigation -> login form; anything else -> 401.
    if ($http_sec_fetch_mode = "navigate") {
        return 302 https://$host/login/?externalReturn=$wb_return;
    }
    return 401;
}
