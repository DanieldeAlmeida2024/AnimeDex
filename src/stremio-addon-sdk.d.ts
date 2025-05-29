// stremio-addon-sdk.d.ts

// Declaração básica para o módulo stremio-addon-sdk
// Isso informa ao TypeScript que este módulo existe e exporta uma classe Addon.
// Você pode adicionar mais detalhes de tipo aqui conforme a necessidade,
// mas para começar, isso resolve o erro TS7016.
declare module 'stremio-addon-sdk' {
    export interface Manifest {
        id: string;
        version: string;
        name: string;
        description: string;
        resources: string[];
        types: string[];
        catalogs: any[]; // Pode ser mais específico se necessário
        detailPage?: any;
    }

    export interface CatalogRequest {
        type: string;
        id: string;
        extra: {
            search?: string;
            skip?: string;
            [key: string]: any; // Para outras propriedades extras
        };
    }

    export interface MetaRequest {
        id: string;
        type: string;
    }

    export interface StreamRequest {
        id: string;
        type: string;
    }

    export interface Meta {
        id: string;
        type: string;
        name: string;
        poster?: string;
        description?: string;
        genres?: string[];
        releaseInfo?: string | number;
        videos?: any[]; // Para séries
        [key: string]: any;
    }

    export interface Stream {
        name?: string;
        title?: string;
        url: string;
        ytId?: string; // Para streams do YouTube
        externalUrl?: string; // Para streams de outras fontes
        infoHash?: string; // Para torrents
        fileIdx?: number;
        // Adicione outras propriedades de stream conforme a documentação do Stremio SDK
    }

    export class Addon {
        constructor(manifest: Manifest);
        defineCatalogHandler(handler: (args: CatalogRequest) => Promise<{ metas: Meta[] }>): void;
        defineMetaHandler(handler: (args: MetaRequest) => Promise<{ meta: Meta }>): void;
        defineStreamHandler(handler: (args: StreamRequest) => Promise<{ streams: Stream[] }>): void;
        run(app: any, port: number): void;
        getManifest(): Manifest;
    }

    // Exporta a classe Addon para ser usada no seu código
    export { Addon };
}