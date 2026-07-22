# Service gate — unauthenticated fallback. Wire with `error_page 401 = @wb_unauth;`.
# The calling `location /` must set $wb_return (same-origin path to return to after login).

location @wb_unauth {
    # Browser navigations go to the login form, APIs get 401. Sec-Fetch-Mode is
    # not sent over plain HTTP — fall back to `Accept: text/html` there.
    if ($http_sec_fetch_mode = "navigate") {
        return 302 $scheme://$host/login/?externalReturn=$wb_return;
    }
    if ($http_accept ~* text/html) {
        return 302 $scheme://$host/login/?externalReturn=$wb_return;
    }
    return 401;
}
