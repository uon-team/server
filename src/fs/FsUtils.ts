
import * as mime_types from 'mime-types';



/**
 * Look up a file extension a return its mime type or false if not found
 * @param filenameOrExt 
 */
export function GetMimeType(filenameOrExt: string) {
    return mime_types.lookup(filenameOrExt);
}



export function SanitizePath(path: string) {
    return path.replace(/[\x00-\x1f\x80-\x9f]/g, '').replace(/\.+\//g, '');
}