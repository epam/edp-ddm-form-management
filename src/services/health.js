class HealthService {
  constructor() {
    this.readiness = false;
  }

  setReadiness(value) {
    this.readiness = value;
  }

  getLivenessState() {
    return {
      status: 'UP',
    };
  }

  getReadinessState() {
    return this.readiness ? { status: 'UP' } : { status: 'DOWN' };
  }
}

const healthService = new HealthService();

module.exports = healthService;
