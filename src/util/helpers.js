const hasOwnProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

module.exports = {
  hasOwnProperty,
};
