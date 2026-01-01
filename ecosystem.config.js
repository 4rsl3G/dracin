'use strict';

module.exports = {
  apps: [
    {
      name: 'panstream',
      script: 'app.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        TRUST_PROXY: 1
      },
      max_memory_restart: '350M',
      time: true
    }
  ]
};
