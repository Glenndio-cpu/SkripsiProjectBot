# Gunicorn configuration for PuskesBot Backend

import os

bind = f"0.0.0.0:{os.getenv('PORT', '4001')}"
workers = 1
threads = 4
worker_class = "gthread"
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = "info"
preload_app = True
