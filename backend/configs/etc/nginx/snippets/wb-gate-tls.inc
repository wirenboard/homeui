# Service gate — TLS for the dedicated HTTPS port (reuses homeui's sslip cert).
# The files always exist: the backend writes an expired placeholder until the
# real certificate is obtained, so this include can never fail nginx -t.

ssl_certificate     /etc/ssl/sslip.pem;
ssl_certificate_key /etc/ssl/sslip.key;
ssl_protocols TLSv1.2 TLSv1.3;
