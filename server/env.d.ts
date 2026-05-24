/// <reference types="node" />

// Ambient declarations for Node.js globals and built-in modules.
// Resolves editor type errors when @types/node is not directly installed
// (the code runs fine — Nitro/Node.js provides everything at runtime).

// ─── Global process ───────────────────────────────────────────────────────────
declare namespace NodeJS {
    interface ProcessEnv {
        [key: string]: string | undefined
    }
    interface Process {
        env: ProcessEnv
        cwd(): string
    }
}

declare var process: NodeJS.Process

// ─── Built-in modules ─────────────────────────────────────────────────────────
declare module 'fs' {
    export function readFileSync(path: string, encoding: string): string
    export function writeFileSync(path: string, data: string, encoding: string): void
    export function existsSync(path: string): boolean
    export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined
}

declare module 'path' {
    export function resolve(...paths: string[]): string
    export function dirname(path: string): string
    export function join(...paths: string[]): string
    export function basename(path: string, ext?: string): string
}
