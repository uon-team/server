
import * as mime_types from 'mime-types';

export const FsUtils = {

    GetMimeType(filenameOrExt: string) {
        return mime_types.lookup(filenameOrExt);
    }
}