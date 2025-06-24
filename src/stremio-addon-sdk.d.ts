declare module 'stremio-addon-sdk' {
    export interface Manifest {
        id: string;
        version: string;
        name: string;
        description: string;
        resources: string[];
        types: string[];
        catalogs: any[]; 
        detailPage?: any;
    }

    export interface CatalogRequest {
        type: string;
        id: string;
        extra: {
            search?: string;
            skip?: string;
            [key: string]: any; 
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
        videos?: any[]; 
        [key: string]: any;
    }

    export interface Stream {
        name?: string;
        title?: string;
        url: string;
        ytId?: string; 
        externalUrl?: string; 
        infoHash?: string;
        fileIdx?: number;
    }

    export class Addon {
        constructor(manifest: Manifest);
        defineCatalogHandler(handler: (args: CatalogRequest) => Promise<{ metas: Meta[] }>): void;
        defineMetaHandler(handler: (args: MetaRequest) => Promise<{ meta: Meta }>): void;
        defineStreamHandler(handler: (args: StreamRequest) => Promise<{ streams: Stream[] }>): void;
        run(app: any, port: number): void;
        getManifest(): Manifest;
    }

}