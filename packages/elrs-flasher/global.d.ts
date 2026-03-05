/**
 * Global declarations for crypto-js in this package.
 * Web USB types come from @types/w3c-web-usb.
 */
declare module 'crypto-js' {
    const CryptoJS: {
        MD5(message: unknown): unknown
        enc: { Latin1: { parse(s: string): unknown } }
    }
    export default CryptoJS
}
