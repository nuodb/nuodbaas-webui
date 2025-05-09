/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />
declare const BUILD_DATE: string;

interface ImportMetaEnv {
    readonly REACT_APP_GIT_SHA: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
