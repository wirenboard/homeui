# Wiren Board service gate — TLS for the dedicated HTTPS port.
#
# Reuses the sslip certificate homeui generates on first HTTPS access. Included
# from a per-service gate file's server{} block. See the "wb-service-gate"
# how-to for the full per-service template.
ssl_certificate     /etc/ssl/sslip.pem;
ssl_certificate_key /etc/ssl/sslip.key;
ssl_protocols TLSv1.2 TLSv1.3;
