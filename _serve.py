# -*- coding: utf-8 -*-
"""Static server for the prototype: serves redesign/ at the site root so URLs
look like production (/vienna/ua/services/private/...). Vite can't be used
here: its Preact plugin rewrites every .js file into an ES module.

Run:  python redesign/_serve.py [port]   (default 5174)
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        return TYPES.get(os.path.splitext(path)[1].lower(), 'application/octet-stream')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            body = ('<!DOCTYPE html><meta charset="utf-8"><title>404 | Shine Guards</title>'
                    '<body style="font:16px system-ui;padding:40px"><h1>Сторінку не знайдено</h1>'
                    '<p><a href="/vienna/ua/">На головну</a></p></body>').encode('utf-8')
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):
        sys.stdout.write('%s %s\n' % (self.log_date_time_string(), fmt % args))
        sys.stdout.flush()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=ROOT))
    print(f'Shine Guards prototype: http://localhost:{port}/vienna/ua/', flush=True)
    server.serve_forever()
