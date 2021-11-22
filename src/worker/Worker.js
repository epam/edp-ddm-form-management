/*
 * Derivative Work based on <Form.IO> library and released under OSL-3.0 license.
 */

const Thread = require('formio-workers/Thread');

module.exports = (formio) => {
  const hook = require('../util/hook')(formio);

  class Worker {
    constructor(type) {
      this.worker = hook.alter('worker', type);
      if (!this.worker || (this.worker === type)) {
        this.worker = new Thread(Thread.Tasks[type]);
      }
    }

    start(data) {
      return this.worker.start(data);
    }
  }

  return Worker;
};
