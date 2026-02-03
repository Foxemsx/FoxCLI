const { resolve } = require('node:path');

module.exports = {
  plugins: [
    require('tailwindcss')({ config: resolve(__dirname, 'tailwind.config.js') }),
    require('autoprefixer')
  ]
};
