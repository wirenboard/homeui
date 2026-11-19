"""Web terminal: a listener process plus one process per session, each session its own systemd unit.

The listener peeks at the request for the session id, sent as the subprotocol
(``Sec-WebSocket-Protocol``), finds that session or starts a new one (``systemd-run`` of
``wb-terminal-session`` as a transient service, waiting until it reports ready), and passes the
client descriptor over the session's control socket; the session does the WebSocket handshake.
The only registry is the runtime directory (``<id>.<login_pid>.sock``) and ``/proc``.
See docs/web-terminal-sessions.md.
"""
