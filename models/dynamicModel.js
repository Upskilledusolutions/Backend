/**
 * Function to dynamically get a model for a specific database.
 * @param {mongoose.Connection} connection - The database connection.
 * @param {string} modelName - The name of the model.
 * @param {mongoose.Schema} schema - The schema of the model.
 * @returns {mongoose.Model} - The mongoose model.
 */
const getDynamicModel = (connection, modelName, schema) => {
    if (connection.models[modelName]) {
      return connection.models[modelName];
    }
    return connection.model(modelName, schema);
  };
  
  module.exports = getDynamicModel;
  