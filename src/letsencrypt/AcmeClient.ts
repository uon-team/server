
import * as os from 'os';
import * as https from 'https';
import * as child_process from 'child_process';
import * as crypto from 'crypto';
import { URL } from 'url';

import { ObjectUtils } from '@uon/core';
import { LetsEncryptConfig } from './LetsEncryptConfig';
import { Account, Certificate, Challenge } from './Models';
import { GetModulus, DER2PEM, UrlBase64Encode, Base64Encode, ParseHeaderLinks } from './Utils';
import { IncomingHttpHeaders } from 'http';



// Default header to be used in requests to Let's Encrypt
const DEFAULT_REQUEST_HEADERS = {
    'User-Agent': `uon/1.0.0`,
    'Accept': '*/*'
};



interface AcmeResponse {
    statusCode: number;
    headers: IncomingHttpHeaders;
    body: Buffer;
}

/**
 * All ACME methods
 */
enum AcmeMethod {
    KeyChange = "key-change",
    NewAuthz = "new-authz",
    NewCert = "new-cert",
    NewReg = "new-reg",
    RevokeCert = "revoke-cert"
};

/**
 * Makes all request's to Let's Encrypt's ACME servers
 */
export class AcmeClient {

    private directory: any;
    private agreementUrl: string;
    private directoryUrl: string;

    constructor(private account: Account, private baseUrl: string) {

        this.directoryUrl = this.baseUrl + '/directory';

    }

    /**
     * Async init of the acme client 
     */
    init() {

        return this.loadDirectory();
    }


    /**
     * In the case we change the email but want to keep the same key
     * @param url 
     */
    updateAccount(url: string) {

        console.log('updateAccount: %s %s', url, this.account.email);

        // https://github.com/ietf-wg-acme/acme/issues/30
        var payload = {
            resource: 'reg',
            contact: ['mailto:' + this.account.email],
            agreement: this.agreementUrl
        };

        return this.sendSignedRequest(
            url,
            JSON.stringify(payload)
        ).then((result) => {

            if (result.statusCode !== 202) {
                throw new Error(`Failed to update account. Expecting 202, got ${result.statusCode} ${result.body}`);

            }

            console.log(`updateAccount: contact of user updated to ${this.account.email}`);

        });
    }

    /**
     * Register an account with Let's Encrypt
     */
    registerAccount() {

        console.log('registerAccount: %s', this.account.email);

        // build the payload
        const payload = {
            resource: 'new-reg',
            contact: ['mailto:' + this.account.email],
            agreement: this.agreementUrl
        };

        // send the request
        return this.sendSignedRequest(
            this.directory[AcmeMethod.NewReg],
            JSON.stringify(payload, null, 2)
        ).then((result) => {

            if (result.statusCode === 409) {
                return this.updateAccount(result.headers.location); // already exists
            }

            if (result.statusCode !== 201) {
                throw new Error(`Failed to register user. Expecting 201, got ${result.statusCode}, ${result.body}`);
            }

            //console.log('registerAccount: registered user %s', this.account.email);

        });

    }

    /**
     * Register a domain with Let's Encrypt
     * @param domain 
     */
    registerDomain(domain: string) {

        console.log('registerDomain: %s', domain);

        // build a payload
        let payload = {
            resource: 'new-authz',
            identifier: {
                type: 'dns',
                value: domain
            }
        };

        // sign and send
        return this.sendSignedRequest(
            this.directory[AcmeMethod.NewAuthz],
            JSON.stringify(payload)
        ).then((result) => {

            if (result.statusCode !== 201) {
                throw new Error(`Failed to register domain. Expecting 201, got ${result.statusCode}, ${result.body}`);
            }

            console.log('registerDomain: registered %s', domain);

            // all done, return the response body as an object
            return JSON.parse(result.body.toString('utf8'));

        });
    }


    /**
     * 
     * @param leChallenge is provided by registerDomain
     */
    prepareHttpChallenge(domain: string, leChallenge: any): Challenge {

        console.log(`prepareHttpChallenge: preparing for challenge ${leChallenge}`);

        const token = leChallenge.token;

        const jwk = {
            e: Base64Encode(Buffer.from([0x01, 0x00, 0x01])), // Exponent - 65537
            kty: 'RSA',
            n: Base64Encode(GetModulus(this.account.pem))
        };

        var shasum = crypto.createHash('sha256');
        shasum.update(JSON.stringify(jwk));
        var thumbprint = UrlBase64Encode(shasum.digest('base64'));
        var key_auth = token + '.' + thumbprint;

        // return our own generated challenge
        return {
            token: token,
            keyauth: key_auth,
            domain: domain
        };

    }

    /**
     * Tell Let's Encrypt that we have prepared a challenge
     * @param uri 
     * @param challenge 
     */
    notifyChallengeReady(uri: string, challenge: Challenge) {

        let payload = {
            resource: 'challenge',
            keyAuthorization: challenge.keyauth
        };

        return this.sendSignedRequest(
            uri,
            JSON.stringify(payload)
        ).then((result) => {

            if (result.statusCode !== 202) {
                throw new Error(`Failed to notify challenge. Expecting 202, got ${result.statusCode},  ${result.body}`);
            }

        });


    }


    /**
     * Poll LE to get the challenge status, we want to wait for it before
     * continuing generating and signing certificates
     * @param challengeUri 
     */
    waitForChallenge(challengeUri: string) {

        let try_count = 0;
        const max_count = 5;

        const retry_func = (count: number): Promise<boolean> => {

            // throw on max retries reached
            if (count >= max_count) {
                throw new Error('Max retry count reached.')
            }

            // make the request
            return this.makeRequest('GET', challengeUri)
                .then((result) => {

                    // check for a valid status code
                    if (result.statusCode !== 202) {
                        console.log('waitForChallenge: invalid response code getting uri %s', result.statusCode);
                        throw new Error('Bad response code:' + result.statusCode);
                    }

                    // parse the response body
                    let body = JSON.parse(result.body.toString('utf8'));

                    // Challenge is still pending, retry
                    if (body.status === 'pending') {
                        return retry_func(try_count++);
                    }
                    // challenge has passed, we can continue
                    else if (body.status === 'valid') {
                        return true;
                    }
                    // challenge is invalid, we cannot continue
                    else if (body.status === 'invalid') {
                        return false;
                    }

                });


        };

        return new Promise((resolve, reject) => {

            retry_func(try_count++)
                .then((result) => {

                    // when result is false, we have and invalid status
                    if (!result) {
                        return reject(new Error('Challenge failed'));
                    }

                    // otherwise it's all good
                    resolve();

                })
                // reject on any error
                .catch(reject);

        });

    }

    /**
     * Send the certificate signing request to Let's Encrypt
     * @param cert 
     * @returns The URL from where to download the signed certificate
     */
    signCertificate(cert: Certificate): Promise<string> {

        let payload = {
            resource: 'new-cert',
            csr: cert.csr
        };

        return this.sendSignedRequest(
            this.directory[AcmeMethod.NewCert],
            JSON.stringify(payload)
        ).then((result) => {

            if (result.statusCode !== 201) {
                throw new Error(`Failed to sign certificate. Expecting 201, got ${result.statusCode}, ${result.body}`);
            }

            return result.headers.location;

        });
    }

    /**
     * Fetch the certificate and save it
     */
    downloadCertificate(url: string) {


        return this.makeRequest('GET', url).then((res) => {

            if (res.statusCode !== 200) {
                throw new Error(`Failed to get certificate. Expecting 200, got ${res.statusCode} ${res.body}`);
            }

            // convert from der to pem
            let certificate_pem = DER2PEM(res.body);

            return this.downloadChain(res.headers['link'] as string)
                .then((chain) => {

                    // set cert buffer in certificate object
                    let full_chain = Buffer.concat([certificate_pem, chain]);

                    // save and return certificate object
                    return full_chain;

                });


        });
    }

    /**
     * Download the intermediate certificate
     * @param headerLink 
     */
    downloadChain(headerLink: string) {

        let link_info = ParseHeaderLinks(headerLink);
        if (!link_info || !link_info.up) {
            throw new Error('Failed to parse link header when downloading certificate chain');

        }

        let intermediate_cert_url = link_info.up.startsWith('https://') ? link_info.up : (this.baseUrl + link_info.up);

        return this.makeRequest('GET', intermediate_cert_url)
            .then((res) => {

                // convert from der to pem
                let chain_pem = DER2PEM(res.body);

                return chain_pem;
            });


    }

    /**
     * Retrieve the directory entries
     */
    private loadDirectory() {

        console.log("Requesting ACME directory");
        return this.makeRequest('GET', this.directoryUrl)
            .then((response) => {
                this.directory = JSON.parse(response.body.toString('utf8'));
                this.agreementUrl = this.directory['meta']['terms-of-service'];
            });

    }


    /**
     * Retrieve a Number-Used-Once from Let's Encrypt for a subsequent request 
     */
    private getNonce(): Promise<string> {

        return this.makeRequest('HEAD', this.directoryUrl)
            .then((response) => {

                if (response && 'replay-nonce' in response.headers) {

                    return response.headers['replay-nonce'] as string;
                }
                else {
                    throw new Error('Failed to get nonce from response');
                }
            });

    }

    private makeRequest(method: string, url: string, data?: string, encoding?: string): Promise<AcmeResponse> {

        let uri = new URL(url);


        // build request options
        let options: https.RequestOptions = {
            host: uri.host,
            path: uri.pathname,
            method: method,
            headers: DEFAULT_REQUEST_HEADERS,
            protocol: 'https:'

        };

        // promisify the request
        return new Promise<AcmeResponse>((resolve, reject) => {

            let req = https.request(options, (res) => {

                // get all the data
                let buffer: any[] = [];

                // accumulate data into a buffer
                res.on('data', (chunk) => {
                    buffer.push(chunk);
                });

                // finished receiving data
                res.on('end', () => {

                    resolve({
                        statusCode: res.statusCode,
                        body: Buffer.concat(buffer),
                        headers: res.headers
                    });

                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            //req.write();
            req.end(data || '', encoding);

        });
    }


    /**
     * Sign and send a payload to Let's Encrypt
     * @param url 
     * @param payload 
     */
    private sendSignedRequest(url: string, payload: any) {

        // build the headers
        let header = {
            alg: 'RS256',
            jwk: {
                e: Base64Encode(Buffer.from([0x01, 0x00, 0x01])), // exponent - 65537
                kty: 'RSA',
                n: Base64Encode(GetModulus(this.account.pem))
            }
        };

        // base64 encode the payload
        let payload64 = Base64Encode(payload);

        // get a nonce for the request
        return this.getNonce()
            .then((nonce) => {

                //console.log('sendSignedRequest: using nonce %s for url %s', nonce, url);

                // encode the protected headers
                let protected64 = Base64Encode(
                    JSON.stringify(ObjectUtils.extend({}, header, { nonce: nonce }))
                );

                // create a signer
                let signer = crypto
                    .createSign('RSA-SHA256')
                    .update(protected64 + '.' + payload64, 'utf8');

                // get a signature
                let signature64 = UrlBase64Encode(
                    signer.sign(this.account.pem, 'base64')
                );

                // build the request data object
                let data = {
                    header: header,
                    protected: protected64,
                    payload: payload64,
                    signature: signature64
                };

                // finally make the request
                return this.makeRequest('POST', url, JSON.stringify(data, null, 2))
                    .then((response) => {

                        return response;
                    });

            });
    }
}



