<style>#toc .h5 { color: #1184CE; font-weight: normal; text-transform: none; letter-spacing: 0; }</style>

[![Build Status](https://travis-ci.org/nxus/storage.svg?branch=master)](https://travis-ci.org/nxus/storage)

A storage framework for Nxus applications using [waterline](https://github.com/balderdashy/waterline).

### <a name="configuration"></a>Configuration

    "config": {
      "storage": {
        "adapters": {
          "default": "sails-mongo"
        },
        "connections": {
          "default": {
            "adapter": "default",
            "url": "mongodb://...."
          }
        },
      }
    }

### Defining models

You define models by extending a base model class: {@link BaseModel}
is a general-purpose base class; {@link GeoModel} is a base class for
models containing a GeoJSON attribute. You can also define your own
base class by extending {@link BaseModel} or {@link GeoModel}.

(The {@link PointModel} base class, for models containing a GeoJSON
coordinate point attribute, is deprecated; use {@link GeoModel}
instead.)

### Using models

{@link HasModels} is a base class for nxus modules that define or use
models. It automatically registers all model definitions contained in
the module `./models` subdirectory. It makes model definitions
available through its {@link HasModels#models} property, which you
can configure to load models defined by your module or other modules.

The {@link Storage} {@link #Storage#model|model()} and
{@link #Storage#modelDir|modelDir()} methods let you explicitly
register model definitions, and you can use
{@link #Storage#getModel|getModel()} to load definitions. However,
these methods are rarely used, since using the {@link HasModels} base
class is typically more concise and convenient.

### Model events

The storage model emits events for create, update, and destroy.
You can register a handler for all events:

      storage.on('model.create', (identity, record) => {})
      storage.on('model.update', (identity, record) => {})
      storage.on('model.destroy', (identity, record) => {})

Or just a specific model identity:

      storage.on('model.create.user', (identity, record) => {})
      storage.on('model.update.user', (identity, record) => {})
      storage.on('model.destroy.user', (identity, record) => {})

### Lifecycle notes

-   `load`
    -   Models should be registered during `load`, e.g.
            var User = BaseModel.extend({
              identity: 'user',
              ...
            });
            application.get('storage').model(User)
-   `startup`
    -   The configured database is connected during `load.after`
    -   You can query models from `startup` and beyond, retrieve the model by the 'identity':

            application.get('storage').getModel('user').then((User) => {
                User.create(...);
            });
