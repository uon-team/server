

import { Account, Certificate, Challenge } from './Models';

export abstract class LetsEncryptStorageAdapter {

    abstract getAccount(email: string): Promise<Account>;

    abstract saveAccount(account: Account): Promise<Account>;
    
    abstract getCertificate(domain: string): Promise<Certificate>;

    abstract saveCertificate(cert: Certificate): Promise<Certificate>;

    abstract getChallenge(token: string): Promise<Challenge>;

    abstract saveChallenge(challenge: Challenge): Promise<Challenge>;

}