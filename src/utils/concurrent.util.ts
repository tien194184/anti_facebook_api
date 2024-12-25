type Concurrent = <T>(cbs: Array<() => Promise<T>>) => Promise<Array<T>>;

export const concurrent: Concurrent = async (callbacks) => {
    return Promise.all(callbacks.map((each) => each()));
};

declare global {
    interface Array<T> {
        forEachAsync(callback: (value: T, index: number, array: T[]) => Promise<void>): Promise<void>;
        mapAsync<U>(callback: (value: T, index: number, array: T[]) => Promise<U>): Promise<U[]>;
    }
}

Array.prototype.forEachAsync = async function <T>(
    this: Array<T>,
    callback: (value: T, index: number, array: T[]) => Promise<void>,
) {
    await Promise.all(this.map((value, index, array) => callback(value, index, array)));
};

Array.prototype.mapAsync = async function mapAsync<T, U>(
    this: Array<T>,
    callback: (value: T, index: number, array: T[]) => Promise<U>,
): Promise<U[]> {
    return Promise.all(this.map((value, index, array) => callback(value, index, array)));
};
