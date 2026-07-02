# Service gate — unauthenticated fallback. Wire with `error_page 401 = @wb_unauth;`.
# The calling `location /` must set $wb_return (same-origin path to return to after login).

location @wb_unauth {
    # Browser navigation -> login form; anything else -> 401.
    # $scheme (not a hardcoded https) so the bounce follows the scheme the gate is
    # actually served on. NB: /login/ lives on homeui's MAIN port, so it must be
    # reachable at $host on this scheme — i.e. homeui HTTPS must be ON when the gate
    # is a TLS port (see wb-gate-tls.inc).
    if ($http_sec_fetch_mode = "navigate") {
        return 302 $scheme://$host/login/?externalReturn=$wb_return;
    }
    return 401;
}
