module.exports = {
  apps: [
    {
      name: 'puskesbot-backend',
      cwd: '/var/www/puskesbot/backend',
      script: '/var/www/puskesbot/backend/.venv/bin/gunicorn',
      args: '-c gunicorn.conf.py wsgi:application',
      interpreter: 'none',
      env: {
        PORT: '4001'
      }
    }
  ]
};
