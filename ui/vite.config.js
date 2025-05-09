
// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'build',
        sourcemap: true,
    },
    server: {
        open: true,
        port: 3000,
        host: "0.0.0.0",
        allowedHosts: true
    },
    define: {
        BUILD_DATE: JSON.stringify(new Date().toISOString()),
    },
    envPrefix: "REACT_",
    base: "/ui"
});