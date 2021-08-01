module.exports = (router) => ({
  import: require('./import')(router),
  export: require('./export')(router),
});
