import type { Neuron } from '../neuron.types.js';

export const eloquentNeuron: Neuron = {
  id: 'neuron-eloquent',
  name: 'Eloquent',
  category: 'eloquent',
  triggers: ['app/Models/', 'extends Model', 'belongsTo', 'hasMany', 'factory'],
  knowledge: {
    entities: ['Model', 'Factory', 'Migration'],
    relations: ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'],
    description: 'Laravel 11 Eloquent: models, relationships, factories',
  },
  store: {
    paths: { models: 'app/Models/', factories: 'database/factories/' },
    conventions: ['$fillable', '$casts', 'relationships'],
  },
};
