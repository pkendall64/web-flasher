declare module 'bluejay-rtttl-parse' {
    interface RtttlNote {
        frequency: number
        duration: number
    }
    interface RtttlResult {
        melody: RtttlNote[]
    }
    const Rtttl: {
        parse(rtttl: string): RtttlResult
    }
    export default Rtttl
}
