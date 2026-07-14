# Service gate — TLS for the dedicated HTTPS port (reuses homeui's sslip cert).
# Included only while a usable certificate exists; on cert loss gates re-render as HTTP.

ssl_certificate     /etc/ssl/sslip.pem;
ssl_certificate_key /etc/ssl/sslip.key;
ssl_protocols TLSv1.2 TLSv1.3;
