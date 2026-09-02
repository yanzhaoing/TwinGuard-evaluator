import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      // The portal is a fully static export: cross-page navigation uses plain
      // <a> so the client never issues App Router RSC requests that 404 on
      // plain static hosts (GitHub Pages).
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]);

export default eslintConfig;
