import { Injectable, ObjectUtils, StringUtils } from '@uon/core';
import { HttpRequest } from '../HttpRequest';


interface WWWAuthenticateResponse {
    scheme: string;
    realm: string;
    charset: string;
}

// maybe not enforce this?
const VALID_AUTH_TYPE = ["BASIC", "BEARER", "DIGEST"];

@Injectable()
export class HttpAuthorization {

    private _scheme: string;
    private _token: string;

    constructor(private request: HttpRequest) {

        let auth_header = request.headers['authorization'];
        if (typeof auth_header === 'string') {

            let str = auth_header as string;
            let start = str.indexOf(' ');
            let scheme = str.substr(0, start);

            if (VALID_AUTH_TYPE.indexOf(scheme.toUpperCase())) {

                // assign scheme
                this._scheme = scheme;

                // parse the token
                let token_str = StringUtils.unquote(str.substr(start).trim());

                // assign raw token
                this._token = token_str;

            }

        }

    }

    /**
     * The type of authorization defined in the header (ie. Basic, Bearer, Digest, etc)
     */
    get scheme(): string {
        return this._scheme;
    }

    get token(): string {
        return this._token;
    }

    get valid(): boolean {
        return this._scheme !== undefined;
    }


    /**
     * Responds to the request with a 401(Unauthorized) and a WWW-Authenticate header
     * @param scheme 
     * @param realm 
     * @param charset 
     */
    setAuth(scheme: string, realm: string, charset: string = "utf-8") {

        scheme = scheme.charAt(0).toUpperCase() + scheme.substr(1).toLowerCase();

        //this.context.responseStatusCode = 401;
        
      /*  return this.context.send(null, {
            "WWW-Authenticate": `${scheme} realm="${realm}", charset=${charset.toUpperCase()}`
        });*/
    }

}