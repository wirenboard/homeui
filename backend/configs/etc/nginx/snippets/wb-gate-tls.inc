# Service gate — TLS for the dedicated HTTPS port (reuses homeui's sslip cert).
#
# The files are guaranteed to exist: wb-homeui-backend writes an expired self-signed
# placeholder on startup when no certificate is present, so this include can never
# fail `nginx -t`. Until homeui HTTPS is enabled and the real certificate is obtained,
# the gate serves that placeholder and browsers warn. See docs/wb-service-gate-howto.md.

ssl_certificate     /etc/ssl/sslip.pem;
ssl_certificate_key /etc/ssl/sslip.key;
ssl_protocols TLSv1.2 TLSv1.3;
