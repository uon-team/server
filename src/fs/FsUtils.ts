
import * as mime_types from 'mime-types';



export function GetMimeType(filenameOrExt: string) {
    return mime_types.lookup(filenameOrExt);
}
