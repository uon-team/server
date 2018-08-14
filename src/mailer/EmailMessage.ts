
import { createHash } from 'crypto';



export interface EmailAttachment {
    name: string;
    description?: string;
    mime: string;
    data: Buffer;
}

export class EmailMessage {

    private _from: string;

    private _to: string[] = [];
    private _cc: string[] = [];
    private _bcc: string[] = [];

    private _subject: string;

    // plain text part
    private _text: string;

    // html part
    private _html: string;

    // list of attachments
    private _attachments: EmailAttachment[] = [];

    // the multipart boundary
    private _boundary: string;


    constructor() {
        this._boundary = createHash('sha256').update(`bounds ${Date.now()}`).digest().toString('hex');
    }

    get boundary() {
        return this._boundary;
    }

    get destinations() {
        return this._to.concat(this._cc).concat(this._bcc);
    }

    from(from: string) {
        this._from = from;
        return this
    }

    to(email: string) {
        this._to.push(email);
        return this;
    }

    cc(email: string) {
        this._cc.push(email);
        return this;
    }

    bcc(email: string) {
        this._bcc.push(email);
        return this;
    }

    subject(s: string) {
        this._subject = s;
        return this;
    }

    html(str: string) {

        this._html = str;
        return this;
    }

    text(str: string) {
        this._text = str;
        return this;
    }

    attachment(attachent: EmailAttachment) {
        this._attachments.push(attachent);
        return this;
    }


    /**
     * Renders the email into a buffer
     */
    render(): Buffer {

        let parts = this.renderHeader();

        // main boundary start
        parts.push('--' + this._boundary);

        // content type set to multipart/alternative for text and html
        let sub_boundary = `sub_${this._boundary}`;
        parts.push('Content-Type: multipart/alternative;');
        parts.push(` boundary="${sub_boundary}"`);
        parts.push('');

        // start with text content
        if (this._text) {

            //insert boundary
            parts.push('--' + sub_boundary);

            parts.push('Content-Type: text/plain; charset="UTF-8"');
            parts.push('Content-Transfer-Encoding: 8bit');
            parts.push('');

            parts.push(this._text);

            // new line
            parts.push('');

        }

        if (this._html) {
            //insert boundary
            parts.push('--' + sub_boundary);

            // content type
            parts.push('Content-Type: text/html; charset="UTF-8"');
            parts.push('Content-Transfer-Encoding: 8bit');
            parts.push('');

            // push the content
            parts.push(this._html);

            // new line
            parts.push('');
        }

        // close sub boundary
        parts.push('--' + sub_boundary + '--');
        parts.push('');

        if(this._attachments.length) {

            for (let i = 0; i < this._attachments.length; i++) {
                const element = this._attachments[i];

                parts.push('--' + this._boundary);
                parts.push(`Content-Type: ${element.mime}; name="${element.name}"`);
                parts.push(`Content-Description: ${element.description || element.name}`);
                parts.push(`Content-Disposition: attachment;filename="${element.name}";`);
                parts.push(`Content-Transfer-Encoding: base64`);

                parts.push('');
                parts.push(element.data.toString('base64'));
                parts.push('');
            }

        }


        // close main boundary
        parts.push('--' + this._boundary + '--');

        return Buffer.from(parts.join('\n'), 'utf8');

    }


    private renderHeader() {

        // compute header
        let header_parts = [];

        // we got a from field
        if (this._from) {
            header_parts.push(`From:  ${this._from}`);
        }

        // to
        header_parts.push(`To: ${this._to.join(', ')}`);

        // cc
        if (this._cc.length) {
            header_parts.push(`CC: ${this._cc.join(', ')}`);
        }

        // bcc
        if (this._bcc.length) {
            header_parts.push(`BCC: ${this._bcc.join(', ')}`);
        }

        // subject
        header_parts.push(`Subject: ${this._subject}`);

        // content type set to multipart/mixed
        header_parts.push('Content-Type: multipart/mixed;');

        // boundary
        header_parts.push(` boundary="${this._boundary}"`);

        // Mime version
        header_parts.push('MIME-Version: 1.0');

        // new line
        header_parts.push('');

        // all done with header
        return header_parts;
    }


}
