import type { Neuron } from '../neuron.types.js';

export const eloquentNeuron: Neuron = {
  id: 'neuron-eloquent',
  name: 'Eloquent',
  category: 'eloquent',
  triggers: ['extends Model', 'belongsTo', 'hasMany', 'factory', 'App\\Models', 'model', 'eloquent', 'migration'],
  knowledge: {
    entities: ['Model', 'Factory', 'Migration'],
    relations: ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'],
    description: 'Laravel 11 Eloquent: models, relationships, factories',
  },
  actions: [
    { type: 'inject', target: 'neuron-context-eloquent' },
    {
      type: 'request_files',
      items: ['database/migrations/*', 'app/Models/*.php'],
    },
  ],
  store: {
    paths: { models: 'app/Models/', factories: 'database/factories/' },
    conventions: ['$fillable', '$casts', 'relationships'],
  },
};
