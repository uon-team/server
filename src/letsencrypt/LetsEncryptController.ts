import { HttpRoute } from '../http/HttpRouter';
import { HttpRequest } from '../http/HttpRequest';
import { HttpResponse } from '../http/HttpResponse';
import { LetsEncryptService } from './LetsEncryptService';
import { LE_CONFIG, LetsEncryptConfig } from './LetsEncryptConfig';
import { Inject } from '@uon/core';
import { RouteMatch, RouterOutlet, ActivatedRoute } from '@uon/router';
import { HttpError } from '../http/HttpError';


@RouterOutlet()
export class LetsEncryptController {

    constructor(private request: HttpRequest,
        private response: HttpResponse,
        private route: ActivatedRoute,
        @Inject(LE_CONFIG) private config: LetsEncryptConfig) {

    }

    @HttpRoute({
        method: 'GET',
        path: '/:token'
    })
    handleChallenge() {

        return this.config.storageAdapter.getChallenge(this.route.params.token)
            .then((c) => {

                if (!c) {
                    throw new HttpError(404);
                }

                this.response.send(c.keyauth);

            });

    }
}