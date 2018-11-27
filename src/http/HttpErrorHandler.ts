import { Injectable, InjectionToken, Type, Provider, Injector } from "@uon/core";

import { HttpRequest } from "./HttpRequest";
import { HttpResponse } from "./HttpResponse";
import { HttpError } from "./HttpError";
import { JsonTransform } from "./transforms/JsonTransform";


/**
 * Injection token for the http error handler
 */
export const HTTP_ERROR_HANDLER = new InjectionToken<HttpErrorHandler>("");


/**
 * Utility for providing error handler
 * @param type 
 */
export function ProvideHttpErrorHandler<T>(type: Type<T>): Provider {

    return {
        token: HTTP_ERROR_HANDLER,
        factory: (injector: Injector) => {
            return injector.instanciate(type);
        },
        deps: [Injector]
    }

}


/**
 * Interface for error handlers
 */
export interface HttpErrorHandler {

    send(error: HttpError): void;
}

/**
 * The default error handler controller
 */
@Injectable()
export class DefaultHttpErrorHandler implements HttpErrorHandler {

    constructor(private req: HttpRequest,
        private res: HttpResponse) {
    }


    send(err: HttpError) {

        this.res.setHeader('Content-Type', 'text/plain');
        this.res.statusCode = err.code;
        this.res.send(err.message);
    }


}