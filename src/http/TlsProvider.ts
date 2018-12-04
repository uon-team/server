import { InjectionToken } from "@uon/core";
import * as tls from "tls";

/**
 * SSL Certificate provider token
 */
export const HTTP_TLS_PROVIDER = new InjectionToken<HttpTLSProvider>("Provider for SSL certificates");


/**
 * Interface to implement for for providing ssl certificates
 */
export interface HttpTLSProvider {

    /**
     * Get the tls secure context for a given domain, used for SNICallback
     * @param domain 
     */
    getSecureContext(domain: string): Promise<tls.SecureContext>;

    /**
     * Fetch the default cert and key
     */
    getDefault(): Promise<{ key: any, cert: any }>;

}