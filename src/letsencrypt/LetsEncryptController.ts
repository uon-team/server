import { HttpController, HttpRoute } from '../http/HttpRouter';
import { HttpRequest } from '../http/HttpRequest';
import { HttpResponse } from '../http/HttpResponse';
import { LetsEncryptService } from './LetsEncryptService';
import { LE_CONFIG, LetsEncryptConfig } from './LetsEncryptConfig';
import { Inject } from '@uon/core';
import { HttpError } from '../http/HttpError';


@HttpController({
    path: '/.well-known/acme-challenge'
})
export class LetsEncryptController {

    constructor(private request: HttpRequest,
        private response: HttpResponse,
        @Inject(LE_CONFIG) private config: LetsEncryptConfig) {

    }

    @HttpRoute({
        method: 'GET',
        path: '/:token'
    })
    handleChallenge(params: { token: string }) {

        return this.config.storageAdapter.getChallenge(params.token)
            .then((c) => {

                if (!c) {
                    throw new HttpError(404);
                }

                this.response.send(c.keyauth);

            });

    }
}