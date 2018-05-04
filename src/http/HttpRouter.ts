
import {
    Type,
    ModuleRef,
    CreateMetadataCtor,
    GetOrDefineMetadata,
    GetMetadata,
    Router,
    RouterInfo,
    RouteInfo,
    Injectable,
    InjectionToken,
    PathUtils,
    META_ANNOTATIONS,
    META_PROPERTIES
} from '@uon/core';


export const HTTP_ROUTER = new InjectionToken<Router<HttpRouter>>("Default Http router")


export interface HttpRouter {

    // optional router name
    name?: string;

    // the router's parent router
    parent?: Type<any>;

    // the base path for route handling
    path?: string;

    // the order in which the routers are executed
    // lower numbers have priority, defaults to 1000
    priority?: number;

}

/**
 * Defines an HttpRouter
 * @param options 
 */
export function HttpRouter<T extends HttpRouter>(options: T) {

    let meta_ctor = CreateMetadataCtor((ctrl: T) => ctrl);
    if (this instanceof HttpRouter) {
        meta_ctor.apply(this, arguments);
        return this;
    }

    return function HttpControllerDecorator(target: Type<any>) {

        if (options.parent) {

            let parent_ctrl: HttpRouter = GetHttpRouterMetadata(options.parent, HttpRouter);

            if (!parent_ctrl) {
                throw new Error(`HttpRouter: parent was defined 
                with ${options.parent.name} but doesn't have 
                HttpRouter decorator`);
            }

        }

        // get annotations array for this type
        let annotations = GetOrDefineMetadata(META_ANNOTATIONS, target, []);

        // set default priority
        if (options.priority === undefined) {
            options.priority = 1000;
        }

        // create the metadata with either a privided token or the class type
        let meta_instance = new (<any>HttpRouter)(options);


        // push the metadata
        annotations.push(meta_instance);




        return target;
    }
}



export interface HttpRoute {

    // an HTTP method, can be a comma separated list
    method?: string | string[];

    // The path to test with parameters (ie. /my/path/:withId/*)
    path: string;

    // the method name, do not set this as it with be overridden
    key?: string;


}

/**
 * RouteHandler decorator for router methods
 * @param meta 
 */
export function HttpRoute(meta: HttpRoute) {


    let meta_ctor = CreateMetadataCtor((meta: HttpRoute) => meta);
    if (this instanceof HttpRoute) {
        meta_ctor.apply(this, arguments);
        return this;
    }

    return function HttpRouteDecorator(target: Type<any>, key: string) {

        let annotations = GetOrDefineMetadata(META_PROPERTIES, target, {});

        // set the method key
        meta.key = key;

        // create the metadata with either a privided token or the class type
        let meta_instance = new (<any>HttpRoute)(meta);

        // push the metadata
        annotations[key] = annotations[key] || [];
        annotations[key].push(meta_instance);

        return target;
    }

}




/**
 * 
 * @private
 * @param type 
 * @param metaType 
 */
function GetHttpRouterMetadata<T>(type: Type<T>, metaType: Function): any {

    let annotations = GetMetadata(META_ANNOTATIONS, type);

    if (annotations && annotations.length) {
        for (let i = 0, l = annotations.length; i < l; ++i) {
            if (annotations[i] instanceof metaType) {
                return annotations[i];
            }
        }
    }

    return null;

}


/**
    * Create a Router hierachy from 
    * @param refs 
    */
export function RouterFromModuleRefs(moduleRefs: Map<Type<any>, ModuleRef<any>>): Router<HttpRouter> {

    const match_method = (ri: RouteInfo<HttpRoute>, d: any) => {

        if (!ri.metadata.method) return true;

        return ri.metadata.method.indexOf(d.method) > -1;
    };

    const match_funcs = [match_method];

    const root = new Router<HttpRouter>(match_funcs);
    const entries: RouterInfo<HttpRouter>[] = [];

    // go over all the loaded modules
    for (let [module_type, module_ref] of moduleRefs) {

        let declarations = module_ref.module.declarations;
        // go over all declaration
        if (declarations) {
            for (let i = 0; i < declarations.length; ++i) {

                let decl_type = declarations[i];

                let properties = Reflect.getMetadata(META_PROPERTIES, decl_type.prototype);
                let ctrl: HttpRouter = GetHttpRouterMetadata(decl_type, HttpRouter);

                if (ctrl) {

                    let handlers: RouteInfo<HttpRoute>[] = [];

                    // go ever all properties to find RouteHandlers
                    if (properties) {
                        for (let name in properties) {
                            if (Array.isArray(properties[name])) {
                                properties[name].forEach((p: any) => {
                                    if (p instanceof HttpRoute) {

                                        let h = p as HttpRoute;
                                        let param_keys: string[] = [];

                                        handlers.push({
                                            regex: PathUtils.pathToRegex(PathUtils.join(ctrl.path, h.path), param_keys),
                                            metadata: h,
                                            keys: param_keys
                                        });

                                    }
                                });
                            }
                        }
                    }

                    // we only create an entry if path is defined
                    if (ctrl.path) {
                        entries.push({
                            type: decl_type,
                            path: ctrl.path,
                            metadata: ctrl,
                            router: new Router(match_funcs),
                            routes: handlers,
                            module: module_ref
                        });
                    }
                }
            }
        }
    }


    // we have to make sense of all those entries, add the orphan ctrl to the root router
    // but first let's sort all the entries
    entries.sort((a, b) => {

        if (!a.metadata.parent) return -1;
        if (!b.metadata.parent) return 1;

        if (a.metadata.parent === b.type) return 1;
        if (b.metadata.parent === a.type) return -1;

        return 0;
    });

    // do the magic
    for (let i = 0; i < entries.length; ++i) {
        let e = entries[i];

        let keys: string[] = [];
        let regex = PathUtils.pathToRegex(e.path + '(.*)', keys);

        if (!e.metadata.parent) {
            root.records.push({
                route: e,
                regex: regex
            });
        }
        else {

            // find parent entry
            let parent_entry: RouterInfo<HttpRouter> = null;
            for (let j = 0; j < entries.length; ++j) {

                if (entries[j].type === e.metadata.parent) {
                    parent_entry = entries[j];
                    break;
                }
            }

            if (!parent_entry) {
                throw new Error(`Couldnt find entry with type ${e.metadata.parent.name}. Check that it is in a module declarations.`);
            }

            parent_entry.router.records.push({
                route: e,
                regex: regex
            });
        }

    }

    // sort entries recursively
    root.sort((a, b) => {
        return a.route.metadata.priority - b.route.metadata.priority;
    });

    // all done here
    return root;
}