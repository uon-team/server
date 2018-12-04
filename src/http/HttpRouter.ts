
import { InjectionToken } from '@uon/core';
import { Router, MakeRouteHandlerDecorator, RouteHandlerData } from '@uon/router';


/**
 * The main Http router
 */
export const HTTP_ROUTER = new InjectionToken<Router<HttpRoute>>("Default Http router");

/**
 * Redirect router
 */
export const HTTP_REDIRECT_ROUTER = new InjectionToken<Router<HttpRoute>>("Http router to bypass https redirects")



/**
 * The http route decorator parameters
 */
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



/**
 * the match function for http routes
 * @param rh 
 * @param d 
 */
export function MatchMethodFunc(rh: HttpRoute, d: any) {

    if (!rh.method)
        return true;

    return rh.method.indexOf(d.method) > -1;
}
