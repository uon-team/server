

import * as child_process from 'child_process';


/**
 * Fetches the computed modulus from a pem
 */
export function GetModulus(pem: string | Buffer): Buffer | null {

    // ask openssl for the modulus
    let stdout = child_process.execSync('openssl rsa -modulus -noout', { input: pem, encoding: 'utf8' });

    // no output...
    if (!stdout)
        return null;

    // extract the modules value from the result
    let match = stdout.match(/Modulus=([0-9a-fA-F]+)$/m);

    // no match....
    if (!match)
        return null;

    // return a buffer with the modulus value
    return Buffer.from(match[1], 'hex');

}


/**
 * Generates a private key
 * @param bitcount 
 */
export function GenerateRSA(bitcount: number = 4096) {
    return child_process.execSync(`openssl genrsa ${bitcount}`);
}


/**
 * Generates a Certificate Signing Request from a private key and domain
 * TODO add more parameters like location and company name
 */
export function GenerateCSR(privateKeyFilePath: string, domain: string) {

    let csr = child_process.execSync(`openssl req -new -key ${privateKeyFilePath} -outform DER -subj /CN=${domain}`);

    return csr;
}

/**
 * 
 * @param der 
 */
export function DER2PEM(der: Buffer): Buffer {

    let certificate_pem = child_process.execSync('openssl x509 -inform DER -outform PEM', { input: der });

    if (!certificate_pem) {
        throw new Error(`couldn't get pem`);
    }

    return certificate_pem;
}


export function UrlBase64Encode(str: string) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function Base64Encode(str: string | Buffer) {
    var buf = str instanceof Buffer ? str : new Buffer(str);
    return UrlBase64Encode(buf.toString('base64'));
}


export function ParseHeaderLinks(links: string) {

    let result: any = {};
    let entries = links.split(',');

    // compile regular expressions ahead of time for efficiency
    var relsRegExp = /\brel="?([^"]+)"?\s*;?/;
    var keysRegExp = /(\b[0-9a-z\.-]+\b)/g;
    var sourceRegExp = /^<(.*)>/;

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i].trim();
        var rels = relsRegExp.exec(entry);
        if (rels) {
            var keys = rels[1].match(keysRegExp);
            var source = sourceRegExp.exec(entry)[1];
            var k, kLength = keys.length;
            for (k = 0; k < kLength; k += 1) {
                result[keys[k]] = source
            }
        }
    }

    return result;

}