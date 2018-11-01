# UON SERVER

A web server written in Typescript with Let's Encrypt built-in. This package is based on the @uon/core application architecture.

Please note that there are many unfinished features, use at your own risk.


## Usage

```shell
    npm i @uon/server
```

## Introduction



## Http Module

The http module is responsible for handling http requests and spawning an HttpContext.


### App-wide Providers vs Request-Scoped Providers

Providers declared in @Module() decorator are availble through DI across the application instance. Request-scoped providers are declared with HttpModule.WithConfig() or with HTTP_CONFIG




### Routing
Http routing is done with @uon/router and the http sub-module provides 2 routers: HTTP_ROUTER and HTTP_REDIRECT_ROUTER.


To declare routes you can do the following:

First declare a controller with HttpRoute decorators on methods:

```typescript

import { Controller } from '@uon/router';

@Controller()
export class MyAppController {

    // ctor with dependency injection 
    constructor(private response: HttpResponse) {}

    @HttpRoute({
        method: 'GET',
        path: '/say-hello'
    })
    myStaticPathRoute() {
        this.response.send('Hello World!');
    }

}
```
 Second, declare a list of routes that will be used by the HttpServer:

```typescript
const routes: Routes = [
    {
        path:'/my-base-path',
        controller: MyAppController
    }
];
```
Finally, import RouterModule like so, to bind routes to the correct router: 
```typescript
@Module({
    imports: [
        RouterModule.For(HTTP_ROUTER, routes)
    ]
})
export class MyModule {}


```


### HttpTransform

HttpTransform is an interface that classes can implement to transform an HttpResponse. @uon/server provides a few transforms including:
- HttpCache
- HttpCookies
- HttpEncoding
- HttpRange
- HttpSecurity

All of these are in the default provider list and can be used by simply adding the instance (obtained by DI) to the response object.

```typescript
    constructor(
        private response: HttpResponse, 
        private cookies: HttpCookies
    ) {

        this.cookies.setCookie('mycookie', 'mycookievalue');

        // use cookies
        this.response.use(this.cookies);
    }
    
```

### HttpContext

An HttpContext is responsible for matching the request pathname to one or more controllers. Each request to the server spawns an isolated context where only what is needed is instanciated.

You will never have to use HttpContext directly, instead use HttpResponse and HttpRequest



## Let's Encrypt Module

The LetsEncryptModule is responsible for obtaining certificates from the authority. This module works along with the HttpModule in the following way:

- When the application starts, LetsEncryptModule registers itself as the HTTP_SSL_PROVIDER
- The HttpServer looks up the HTTP_SSL_PROVIDER.
- If it is found, HttpServer requests the certificates. A plain http server start listening for requests at this point.
- If no certificates can be found using the provided storage adapter, the service will request them from the authority.
- An http-01 challenge is prepared, sent to LE and waits for the authority to request the keyauth from this here server (in plain http)
- The certificates are signed and downloaded from LE
- Finally, an https server is created and configured with SNICallbacks.


### Usage
To get Let's Encrypt certificates for your server, you simply need to add the module with a config to your application's main module imports :

```typescript

import {
    LetsEncryptModule, 
    LetsEncryptLocalStorageAdapter
} from '@uon/server';

@Module({
    imports: [
        ...
        LetsEncryptModule.WithConfig({

            // A storage adapter is required to store accounts, 
            // certificates and challenges
            storageAdapter: new LetsEncryptLocalStorageAdapter({ 
                 baseDir: path.join(__dirname, '/certs') 
            }),

            // the account to use, must be an email address
            account: "webmaster@example.com",

            // a list of domains
            domains: ["example.com", "www.example.com"],

            // optional temporary folder, if not provided it 
            // defaults to os.tmpdir()
            tempDir: path.join(__dirname, '/temp'),

            // either "staging" or "production"
            // make sure everything works before switching to "production"
            // as rate-limiting will get you banned in no time
            environment: "staging"
         })
         ...
    ]
   
})
export class MyAppModule() {}
```

### Challenge types
Only the http-01 challenge has been implemented. There are no immediate plans to implement other challenge types.

### Storage adapters

 A generic storage adapter is provided (LetsEncryptFsStorageAdapter) using any FsAdapter as backend. Implementing a storage adapter for MongoDB or Redis can be done by implementing the interface LetsEncryptStorageAdapter.


## Websocket Module

An simple implementation of Websocket.


### Upgrading connections
Connection upgrades are done by using an HttpRoute with the method "UPGRADE". An HttpUpgradeContext is made available as a provider when an upgrade request comes in.

#### Example
```typescript
import { HttpController, HttpRoute, HttpUpgradeContext, WebSocket } from '@uon/server';

@Controller()
export class MyController {


    constructor(private upgradeContext: HttpUpgradeContext) {

    }

    @HttpRoute({
        method: 'UPGRADE', // special method for upgrade requests
        path: '/ws-upgrade-path'
    })
    doUpgrade() {

        // check auth or any other condition for upgrade
        return auth.getAuth(...)
            .then((res) => {

                if(!res) {
                    // reject the upgrade
                    return this.upgradeContext.abort(403, 'You shall not pass.')
                }

                // continue with the upgrade
                return this.upgradeContext.accept(WebSocket)
                    .then((ws) => {

                        ws.on('message', (data) => {
                            console.log('received message', data);
                        });

                        ws.on('close', (code) => {
                            console.log('connection closed', code);
                        });

                        ws.send('From server, with love.');

                    });
            });
    }
}

```

## File System Module

The FsModule takes a list of user-implementable file system adapters.

A local file system adapter is provided (LocalFsAdapter) for access to a folder.

We implemented a S3 adapter in @uon/server-aws.

## Cluster Module
The cluster module is responsible for the application's lifecycle. By default, clustering is not enabled and run's the app on a single thread.

To enable clustering, you must provide a config in your providers (or imports with ClusterModule.WithConfig(...))

```typescript
import {
    ClusterModule, 
    FileLockAdapter
} from '@uon/server';

@Module({
    imports: [
        ...

        ClusterModule.WithConfig({
            enabled: true,
            concurrency: 8,
            lockAdapter: new FileLockAdapter()
        })
        ...
    ]
})
export class MyMainModule {}
```

More info coming soon.


### Lifecycle hooks

You can hook into the app's lifecycle with these multi-providers :
 - CLUSTER_MASTER_INIT ; Execute task on launch on the master process only
 - CLUSTER_WORKER_INIT ; Execute task on launch on the worker processes (on master if clustering is disabled)
 - CLUSTER_MASTER_EXIT ; Execute task when the application exits on master process
 - CLUSTER_WORKER_EXIT ; Execute task when the application exits on worker process (on master if clustering is disabled)


## Logging
@uon/server provides utilities for logging. You can implement your own logger by implementing the interface LogAdapter.



## Contributions

You are welcome to contribute by filling issues or submitting pull requests. Much love.


## Future Development
 - Reverse-proxy module
