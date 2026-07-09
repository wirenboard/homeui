# Service gate — unauthenticated fallback. Wire with `error_page 401 = @wb_unauth;`.
# The calling `location /` must set $wb_return (same-origin path to return to after login).

location @wb_unauth {
    # Redirect a top-level browser navigation to the login form; APIs get 401.
    # Sec-Fetch-Mode is only sent over HTTPS/localhost, so over plain HTTP fall back
    # to an `Accept: text/html` request (a page navigation) — otherwise a logged-out
    # browser hitting an HTTP gate would get a bare 401 instead of the login form.
    if ($http_sec_fetch_mode = "navigate") {
        return 302 $scheme://$host/login/?externalReturn=$wb_return;
    }
    if ($http_accept ~* text/html) {
        return 302 $scheme://$host/login/?externalReturn=$wb_return;
    }
    return 401;
}
