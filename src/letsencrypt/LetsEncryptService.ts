
import { Injectable, Inject, Optional } from '@uon/core';

import { LetsEncryptConfig, LE_CONFIG } from './LetsEncryptConfig';
import { Certificate, Account } from './Models';
import { IncomingMessage, ServerResponse } from 'http';
import { AcmeClient } from './AcmeClient';
import { LetsEncryptStorageAdapter } from './StorageAdapter';
import { GenerateRSA, GenerateCSR, Base64Encode } from './Utils';

import { isMaster } from 'cluster';

import * as _path from 'path';
import * as fs from 'fs';
import * as os from 'os';


const ACME_PROD = 'https://acme-v01.api.letsencrypt.org';
const ACME_STAGING = 'https://acme-staging.api.letsencrypt.org';

@Injectable()
export class LetsEncryptService {

    private acmeClient: AcmeClient;
    private storageAdapter: LetsEncryptStorageAdapter;
    private waitingForChallenge: boolean = false;

    constructor(@Inject(LE_CONFIG) private config: LetsEncryptConfig) {

        // default for tempDir
        config.tempDir = config.tempDir || os.tmpdir();

        // get the storage adapter
        this.storageAdapter = config.storageAdapter;
        
    }

    /**
     * Retrieve certitificate for the domains in config from where ever they come from
     * 
     */
    getCertificates()/*: Promise<Certificate[]>*/ {

        // get the account first
        return this.storageAdapter.getAccount(this.config.account)
            .then((account) => {

                // no account found, we need to create one
                if (!account) {
                    account = this.createAccount(this.config.account);
                    return this.storageAdapter.saveAccount(account);
                }

                return account;

            })
            .then((account) => {

                // now that we have an account, create the acme client
                this.acmeClient = new AcmeClient(account, this.config.environment == 'production' ? ACME_PROD : ACME_STAGING);

                // init the acme client, this will fetch the acme directory
                return this.acmeClient.init();

            })
            .then(() => {

                // now lets get the certificates
                return this.loadCertificates(this.config.domains)
                    .then((certs) => {

                        let promises: Promise<Certificate>[] = [];

                        // check our domains list and make sure we have all certificates
                        this.config.domains.forEach((domain) => {

                            let cert: Certificate = null;
                            for (let i = 0; i < certs.length; ++i) {
                                if (certs[i].domain === domain && certs[i].cert) {
                                    cert = certs[i];
                                    break;
                                }
                            }


                            let must_renew = cert && cert.renewBy.getTime() < Date.now();

                            // didnt find cert or cert is (nearly) expired
                            if (!cert || must_renew) {

                                promises.push(this.createCertificate(domain));

                            } else {
                                promises.push(Promise.resolve(cert));
                            }

                        });

                        return Promise.all(promises)
                            .then((values) => {
                                return values;
                            });

                    });

            });

    }

    /**
     * Creates a PEM and returns an Account that you must save yourself
     * @param email 
     */
    createAccount(email: string): Account {

        let rsa = GenerateRSA(4096);

        return { email: email, pem: rsa.toString('utf8') };
    }

    /**
     * Handles challenge response over http
     * @param req 
     * @param res 
     */
    handleChallengeRequest(req: IncomingMessage, res: ServerResponse) {

        let parts = req.url.split('.well-known/acme-challenge/');
        let token = parts[1];

        return this.config.storageAdapter.getChallenge(token)
            .then((c) => {

                if (!c) {
                    res.writeHead(404);
                    res.end("Not Found");
                    return;
                }

                res.writeHead(200);
                res.end(c.keyauth);

            });
    }


    private createCertificate(domain: string): Promise<Certificate> {

        const client = this.acmeClient;

        // register the account, it might be already registred but we need to make sure
        return client.registerAccount().then(() => {

            // register the domain an get a challenge from LE
            return client.registerDomain(domain).then((result) => {

                let http_challenges = result.challenges.filter((x: any) => { return x.type === 'http-01'; });
                if (http_challenges.length === 0) {
                    throw new Error('no http challenges');
                }

                return http_challenges[0];
            });

        }).then((httpChallenge) => {

            // generate a challenge
            let challenge = client.prepareHttpChallenge(domain, httpChallenge);
            let challenge_uri = httpChallenge.uri;
            let challenge_token = httpChallenge.token;

            // save the generated challenge
            return this.storageAdapter.saveChallenge(challenge).then(() => {

                // notify LE that we have generated a challenge
                return client.notifyChallengeReady(challenge_uri, challenge);

            }).then(() => {

                // wait until LE has figured out the puzzle
                return client.waitForChallenge(challenge_uri);

            });


        }).then(() => {

            // generate a new certificate
            return this.generateCertificate(domain);

        }).then((cert) => {

            // let LE sign the certificate
            return client.signCertificate(cert).then((url) => {

                // download the certificate at the url provided
                return client.downloadCertificate(url);

            }).then((buffer) => {

                // assign the signed certificate
                cert.cert = buffer.toString('utf8');

                // and a renew by date
                cert.renewBy = new Date(Date.now() + DaysToMs(61));

                // save the certificate
                return this.storageAdapter.saveCertificate(cert)
            });



        });


    }

    private generateCertificate(domain: string): Certificate {

        let outdir = this.config.tempDir

        if (!fs.existsSync(outdir)) {

            fs.mkdirSync(outdir);
        }

        var csr_path = _path.join(outdir, domain + '.csr');
        var private_key_path = _path.join(outdir, domain + '.key');

        // generate a new key and save it to tmp
        let key = GenerateRSA(4096);
        fs.writeFileSync(private_key_path, key);

        // generate signing request
        let csr = GenerateCSR(private_key_path, domain);

        // we no longer need to keep the key on disk
        fs.unlinkSync(private_key_path);

        // return the new Certificate object
        return {
            domain: domain,
            key: key.toString('utf8'),
            csr: Base64Encode(csr),
            renewBy: null,
            cert: null
        };

    }


    private loadCertificates(domains: string[]) {

        let promises: Promise<Certificate>[] = [];

        domains.forEach((d) => {

            promises.push(this.storageAdapter.getCertificate(d));
        })

        return Promise.all(promises).then((values) => {

            return values.filter((v) => { return v != null });
        });
    }


}


function DaysToMs(d: number) {
    return d * 24 * 60 * 60 * 1000;
}