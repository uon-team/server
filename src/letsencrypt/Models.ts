

export interface Account {
    pem: string;
    email: string;
}

export interface Certificate {
    domain: string;
    csr: string;
    key: string;
    cert: string;
    renewBy: Date;
}


export interface Challenge {
    domain: string;
    token: string;
    keyauth: string;
}