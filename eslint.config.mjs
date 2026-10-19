import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/node_modules/**',
      'client/next-env.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
);
