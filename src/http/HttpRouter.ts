
import { InjectionToken } from '@uon/core';
import { Router, MakeRouteHandlerDecorator, RouteHandlerDecorator, RouteHandler, RouteHandlerData } from '@uon/router';


/**
 * The main Http router
 */
export const HTTP_ROUTER = new InjectionToken<Router>("Default Http router");

/**
 * Redirect router
 */
export const HTTP_REDIRECT_ROUTER = new InjectionToken<Router>("Http router to bypass https redirects")


export interface HttpRoute extends RouteHandlerData {

    /**
     * an HTTP method, can be an array
     */
    method: string | string[];

    /**
     * The path regexp to test
     */
    path: string;


}

/**
 * HttpRoute decorator for router endpoints 
 * @param meta 
 */
export const HttpRoute = MakeRouteHandlerDecorator<HttpRoute>("HttpRoute")



export function MatchMethodFunc(rh: HttpRoute, d: any) {

    if (!rh.method)
        return true;

    return rh.method.indexOf(d.method) > -1;
}
