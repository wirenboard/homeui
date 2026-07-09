# Service gate — TLS for the dedicated HTTPS port (reuses homeui's sslip cert).
# Included only while a usable certificate exists: when it disappears, the
# backend removes the TLS configs and re-renders gates as plain HTTP, so
# nginx -t never sees a reference to a missing file.

ssl_certificate     /etc/ssl/sslip.pem;
ssl_certificate_key /etc/ssl/sslip.key;
ssl_protocols TLSv1.2 TLSv1.3;
