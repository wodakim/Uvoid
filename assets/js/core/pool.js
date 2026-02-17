export default class ObjectPool {
    constructor(createFn, initialSize = 20) {
        this.createFn = createFn;
        this.pool = [];
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }

    release(obj) {
        if (obj.reset) obj.reset();
        this.pool.push(obj);
    }
}
