// Tailwind v4 is its own PostCSS plugin; Lightning CSS (bundled) handles vendor
// prefixing, so a standalone autoprefixer is no longer needed.
// SOURCE: https://tailwindcss.com/docs/installation/using-postcss
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
