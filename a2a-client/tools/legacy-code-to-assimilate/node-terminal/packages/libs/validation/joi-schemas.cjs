const Joi = require('joi');

const getUnifiedDataSchema = Joi.object().unknown(true);

module.exports = {
  getUnifiedDataSchema,
};
