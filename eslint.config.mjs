import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default [
    // Ignora arquivos gerados/artefatos
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            ".wrangler/**",
            "worker-configuration.d.ts",
        ],
    },

    // Regras base para TS
    ...tseslint.configs.recommended,

    // Config do projeto
    {
        files: ["**/*.ts", "**/*.mts", "**/*.tsx"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            // deixa o prettier mandar na formatação
            "prettier/prettier": "error",

            // ajustes comuns (opcional)
            "@typescript-eslint/no-explicit-any": "off",
        },
    },

    // Desliga regras que conflitam com prettier
    prettier,
];
