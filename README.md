# UON SERVER

A full-featured web server written in Typescript with Let's Encrypt support. This package is made for the @uon/core application architecture.


## Usage

```shell
    npm install @uon/server --save
```

## Http Module

The http module is responsible for handling http requests and spawning an HttpContext, which is a per-request application.


### HttpServer



### HttpContext

An HttpContext is responsible for matching the request pathname to one or more controllers. Each request to the server spawns an isolated context.

## Let's Encrypt Module

## Mailer Module

## File System Module

The FsModule takes a list of user-implementable file system adapters

## Log Module


## Limitations

## TODOS

 - Write documentation