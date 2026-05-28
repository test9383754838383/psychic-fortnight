module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:react-hooks/recommended",
    "plugin:boundaries/recommended",
    "prettier"
  ],
  ignorePatterns: [
    "dist",
    ".eslintrc.cjs",
    "src/api/schema.ts",
    "playwright.config.ts",
    "vitest.config.ts",
    "e2e/**/*",
    "tmp"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  plugins: ["react-refresh", "boundaries"],
  settings: {
    "boundaries/elements": [
      {
        "type": "api",
        "pattern": "src/api/*"
      },
      {
        "type": "auth",
        "pattern": "src/auth/*"
      },
      {
        "type": "lib",
        "pattern": "src/lib/*"
      },
      {
        "type": "routes",
        "pattern": "src/routes/*"
      },
      {
        "type": "components",
        "pattern": "src/components/*"
      },
      {
        "type": "modules",
        "pattern": "src/modules/*/*"
      }
    ]
  },
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "boundaries/entry-point": [
      "error",
      {
        "default": "allow"
      }
    ],
    "boundaries/element-types": [
      "error",
      {
        "default": "allow",
        "rules": [
          {
            "from": "api",
            "disallow": ["routes", "components", "modules", "auth"]
          },
          {
            "from": "auth",
            "disallow": ["routes", "components", "modules"]
          },
          {
            "from": "lib",
            "disallow": ["routes", "components", "modules", "auth", "api"]
          },
          {
            "from": "components",
            "disallow": ["routes", "modules", "auth"]
          },
          {
            "from": "modules",
            "disallow": ["routes"],
            "message": "Modules cannot import from routing layers directly"
          }
        ]
      }
    ]
  },
};
