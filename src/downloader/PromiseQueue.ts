interface IPromiseQueueOpts {
  concurrency: number;
}

type PromiseThunk = () => Promise<any>;

class PromiseQueue {
  private queue: Array<() => any>;
  private pauseQueue: boolean;
  private ongoingCount: number;
  public readonly concurrency: number;
  private emptyPromiseResolve: ((value?: void) => void) | null;
  private anyPromiseResolve: ((value?: void) => void) | null;

  constructor(opts: IPromiseQueueOpts) {
    this.queue = [];
    this.pauseQueue = false;
    opts = Object.assign(
      {
        concurrency: 1,
      },
      opts
    );

    if (opts.concurrency < 1) {
      throw new TypeError(
        "Expected `concurrency` to be an integer which is bigger than 0"
      );
    }

    this.ongoingCount = 0;
    this.concurrency = opts.concurrency;
  }

  public pause() {
    this.pauseQueue = true;
  }

  public resume() {
    this.pauseQueue = false;
    this.next();
  }

  public add(fn: PromiseThunk | PromiseThunk[]): PromiseQueue | TypeError {
    if (Array.isArray(fn)) {
      if (fn.length > 1) {
        const res = this.add(fn.shift()!);
        if (!(res instanceof TypeError)) {
          return this.add(fn);
        }
      }
      return this.add(fn[0]);
    } else {
      new Promise((resolve, reject) => {
        const run = () => {
          this.ongoingCount++;
          (fn as () => Promise<any>)().then(
            (val: any) => {
              resolve(val);
              this.ongoingCount--;
              this.next();
            },
            (err: Error) => {
              reject(err);
              this.ongoingCount--;
              this.next();
            }
          );
        };

        if (this.ongoingCount < this.concurrency && !this.pauseQueue) {
          run();
        } else {
          this.queue.push(run);
        }
      });
      return this;
    }
  }

  // Promises which are not ready yet to run in the queue.
  get waitingCount() {
    return this.queue.length;
  }

  public awaitAll(): Promise<void> {
    return new Promise((resolve) => {
      this.emptyPromiseResolve = resolve;
    });
  }

  public awaitAny(): Promise<void> {
    return new Promise((resolve) => {
      this.anyPromiseResolve = resolve;
    });
  }

  private resolveEmpty: () => void = () => undefined;

  private next() {
    if (this.ongoingCount >= this.concurrency || this.pauseQueue) {
      return;
    }

    if (this.anyPromiseResolve) {
      this.anyPromiseResolve();
      this.anyPromiseResolve = null;
    }

    if (this.ongoingCount === 0 && this.emptyPromiseResolve) {
      this.emptyPromiseResolve();
      this.emptyPromiseResolve = null;
    }

    if (this.queue.length > 0) {
      const firstQueueTask = this.queue.shift();
      if (firstQueueTask) {
        firstQueueTask();
      }
    } else {
      this.resolveEmpty();
    }
  }
}

export default PromiseQueue;
