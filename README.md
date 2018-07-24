# UON SERVER

A full-featured web server written in Typescript with Let's Encrypt support. This package is based on the @uon/core application architecture.


## Usage

```shell
    npm i @uon/server
```

## Introduction



## Http Module

The http module is responsible for handling http requests and spawning an HttpContext.

### Routing
Routing is done differently with @uon/server. The routes are defined as metadata on a class and it's methods using TypeScript decorators.

Here is an example of a simple router:

```typescript

@HttpRouter({
    path: '/myapp'
})
export class MyAppController {

    // ctor with dependency injection 
    constructor(private response: HttpResponse) {}


    // called when url path is /myapp/static
    @HttpRoute({
        method: 'GET',
        path: '/static'
    })
    myStaticPathRoute() {
        this.response.send('Hello World!');
    }

}

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

- When the application starts, the HttpServer looks up the LetsEncryptService.
- If it is found, HttpServer requests the certificates. A plain http server start listening for requests at this point.
- If no certificates can be found using the provided storage adapter, the service will request them from the authority.
- An http-01 challenge is prepared, sent to LE and waits for the authority to request the keyauth from this here server (in plain http)
- The certificates are signed and downloaded from LE
- Finally, an https server is created and configured with SNICallbacks.


### Usage
To get Let's Encrypt certificates for your server, you simply need to add the module to your application's main module imports :

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
            environment: "staging"
         })
         ...
    ]
   
})
export class MyAppModule() {}
```

### Challenge types
Only the http-01 challenge has been implemented. There are no plans to implement other challenge types.

### Storage adapters

 A local file system adapter is provided (LetsEncryptLocalStorageAdapter) for simple applications running on a single server. In other cases, implementing a storage adapter for MongoDB or Redis is recommended. This can be done by implementing the interface LetsEncryptStorageAdapter.



## File System Module

The FsModule takes a list of user-implementable file system adapters.

A local file system adapter is provided (LocalFsAdapter) for access to a folder.

We implemented a S3 adapter in @uon/server-aws.

## Logging
@uon/server provides utilities for logging. You can implement your own logger by implementing the interface LogAdapter.


## Limitations

### Clustering
Clustering is not yet supported. There are a few things to consider before implementing support for forking to multiple processes. The first thing that comes to mind is the Let's Encrypt implementation.

## Contributions

You are welcome to contribute by filling issues, submitting pull requests or just sending a suggestion. Much love.