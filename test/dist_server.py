import socketserver
import http.server as SimpleHTTPServer

class Proxy(SimpleHTTPServer.SimpleHTTPRequestHandler):
    """
    Set up custom headers
    """

    headers = {'Cache-Control': 'public, max-age=3600'}

    def end_headers(self):
        self.set_headers()
        SimpleHTTPServer.SimpleHTTPRequestHandler.end_headers(self)

    def set_headers(self):
        keys = set(self.headers.keys()).union(Proxy.headers.keys())
        custom_keys = Proxy.headers.keys()
        for key in keys:
            if key in custom_keys:
                self.send_header(key, Proxy.headers[key])
            else:
                self.send_header(key, self.headers[key])

PORT = 8080

httpd = socketserver.ForkingTCPServer(('', PORT), Proxy)
print('Starting web server...')
httpd.serve_forever()
