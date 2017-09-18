# nxus-storage

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## Storage Module

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

You define models by extending a base model class: [BaseModel](#basemodel)
is a general-purpose base class; [GeoModel](#geomodel) is a base class for
models containing a GeoJSON attribute. You can also define your own
base class by extending [BaseModel](#basemodel) or [GeoModel](#geomodel).

(The [PointModel](#pointmodel) base class, for models containing a GeoJSON
coordinate point attribute, is deprecated; use [GeoModel](#geomodel)
instead.)

### Using models

[HasModels](#hasmodels) is a base class for nxus modules that define or use
models. It automatically registers all model definitions contained in
the module `./models` subdirectory. It makes model definitions
available through its [HasModels#models](#hasmodelsmodels) property, which you
can configure to load models defined by your module or other modules.

The [Storage](#storage) [model()](#Storage#model) and
[modelDir()](#Storage#modelDir) methods let you explicitly
register model definitions, and you can use
[getModel()](#Storage#getModel) to load definitions. However,
these methods are rarely used, since using the [HasModels](#hasmodels) base
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


## API




## Storage

**Extends NxusModule**

Storage provides a common interface for defining models.  Uses the Waterline ORM.

### model

Register a model

**Parameters**

-   `model` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A Waterline-compatible model class

**Examples**

```javascript
storage.model(...)
```

### getModel

Request a model based on its identity (name)

**Parameters**

-   `id` **([string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) \| [array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array))** The identity of a registered model, or array of identities

**Examples**

```javascript
storage.getModel('user')
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** The model class(es)

### modelDir

Register all models in a directory

**Parameters**

-   `dir` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Directory containing model files

**Examples**

```javascript
application.get('storage').model(...)
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** Array of model identities

### getWaterlineConfig

After init, get the waterline config with populated adapter modules

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** Config object for waterline

## HasModels

**Extends NxusModule**

Base class for nxus modules that define or use models.
It automatically registers all model definitions contained in
the module `./models` subdirectory. It makes model definitions
available through its [#HasModels#models](#HasModels#models) property, which you
can configure to load models defined by your module or other modules.

**Parameters**

-   `options` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Configuration options. (optional, default `{}`)
    -   `options.modelNames` **([Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) \| [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array))** Model definitions to load.
              If specified as an object, each object property specifies a
              model – its key is a model identity (the model's
              `identity` property), and its value is used as the model's
              name in [HasModels#models](#hasmodelsmodels). If specified as an array,
              each array element specifies a model – the element
              string serves as both model identity and name. (optional, default `null`)

### models

Collection of model definitions.
You can use the constructor `modelNames` option to configure which
model definitions to load. By default, the model definitions
that were registered from the module `./models` subdirectory are
also loaded into the model definitions.

Type: [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

### modelNames

Override to define the model names to access.

**Examples**

```javascript
modelNames() { 
  return ['user']
}
```

Returns **([Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) \| [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object))** Model identities to add to `this.models`, or object of {identity: name}

**Meta**

-   **deprecated**: Use the constructor `modelNames` option to specify names of models to be made available in the `this.models` property.


## BaseModel

**Extends Waterline.Collection**

Base class for Waterline model definitions.

It extends the `Waterline.Collection` to make it less awkward to use
and better adapted to the nxus environment.

It provides an [extend()](#BaseModel.extend) method that is
better-behaved than the Waterline `extend()` method.

It emits create, update, and destroy events for model instances. The
model identity and record are passed as parameters to the handler.
You can register to be notified of all events of a specified type,
or restrict notifications to a specific model by specifying its
identity as a suffix to the event type:

-   `model.create`, `model.create.`_`identity`_ - emitted after create
-   `model.update`, `model.update.`_`identity`_ - emitted after update
-   `model.destroy`, `model.destroy.`_`identity`_ - emitted after destroy

Use the `extend()` method to create a Waterline model based on
`BaseModel`. For example:

      import {BaseModel} from 'nxus-storage'
      const MyModel = BaseModel.extend({
          identity: 'my-model',
          attributes: {
              name: 'string'
          }
      })

### displayName

Gets a display name for the record.
Provides a consistent way to obtain a display name. The default
definition examines the record's `id`, `createdAt`, and
`updatedAt` attributes, returning the first that has a string
value. Override the default definition to provide a more useful
display name.

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** display name

### connection

Name of the database connection for the model.
Connections are defined in the storage [configuration](#configuration) settings.
The default connection is `default`; override to select another
configuration.

### findOrCreate

Finds a record if it exists, creates it if not.

**Parameters**

-   `criteria` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** search criteria
-   `values` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** attributes of the new record, if created

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** existing or newly created record

### createOrUpdate

Creates a record if it doesn't exist, updates it if it does.

**Parameters**

-   `criteria` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** search criteria
-   `values` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** record attributes

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** newly created or updated record

### extend

Extends this model definition to create a new definition.

**Parameters**

-   `properties` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** prototype properties for the created
      model; the `attributes` property, if specified, augments (rather
      than replaces) the attributes of the model being extended

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** extended Waterline model definition

## GeoModel

**Extends BaseModel**

Base class for Waterline models containing a GeoJSON geographic attribute.

It provides methods for performing geo queries on the GeoJSON
attribute – `findWithin()` selects records that lie within
specified coordinates, and `findIntersects()` selects records that
intersect.

To implement the geo queries, the GeoJSON data must be indexed. And
because the MongoDB 2dsphere index can handle only GeoJSON geometry
features, the index is applied to a derived _features_ attribute that
contains just the geometry features from the primary GeoJSON
attribute.

The `GeoModel` provides the machinery for keeping the features
attribute synchronized with the primary GeoJSON attribute. It also
attempts to ensure the features attribute is well-formed and has a
consistent organization. For Polygon objects, it discards duplicate
points, closes open paths and ensures clockwise winding order. It
combines Geometry objects so there is at most one of each geometry
type: Polygon/MultiPolygon, Point/MultiPoint and
LineString/MultiLineString. 

The `createGeoIndex()` method should be invoked to ensure the index
is created. Typically, you do this after the startup lifecycle phase.

Configuration is through these model properties:

-   `geometryField` (string) - Name of the primary GeoJSON attribute (default is `geo`).
-   `geometryFeatureField` (string) - Name of the geometry features attribute (default is `geoFeatures`).
    Both of these attributes must also be defined as model attributes with
    type `json`.

Use the `extend()` method to create a Waterline model based on
`GeoModel`. For example:

      import {GeoModel} from 'nxus-storage'
      const MyGeo = GeoModel.extend({
          identity: 'my-geo',
          attributes: {
              ...
              location: 'json',
              locationFeatures: 'json'
          },
          geometryField: 'location',
          geometryFeaturesField: 'locationFeatures'
      })

### createGeoIndex

Ensures index is defined for geographic attribute.
(Actually, on the attribute specified by `geometryFeatureField`.)

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise that resolves or rejects when index
  creation completes. It's worthwhile attaching a `.catch()`
  clause to this promise to log errors; index creation can fail
  for a variety of reasons, including invalid data in the
  geometry feature attribute.

### findWithin

Finds records within specified geographic coordinates.

The method goes through some odd gyrations in order to mesh the
MongoDB geographic query with Waterline query handling.

First, it _indirectly_ returns a Waterline query, by returning a
promise that resolves to a function that evaluates to the query.
This due to the fact that the query has promise semantics.
Returning it indirectly defers evaluation, allowing you to refine
it (using the chainable methods such as .populate()`,`.where()`,
and`.sort()\`) before evaluating it.

Second, it actually evaluates the MongoDB geographic query to
produce a list of matching record ids, and the returned Waterline
query is a second query based on these ids. Again, this to allow
you to refine the query before evaluation. Be aware that this
won't scale well to huge record sets, but should work for any of
moderate size.

**Parameters**

-   `coordinates` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A GeoJSON geometry object
      specifying the geographic region to select; it must be of type
      `Polygon` or `MultiPolygon`.

**Examples**

````javascript
    ```
      model.findWithin({ 'type': 'Polygon', 'coordinates': ... }).then((query) => {
        return query().where(...).populate(...)
      }).then((records) => {
        ...
      })
      ```
````

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise that resolves to a function that
  returns a Waterline query for the specified coordinates.

### findIntersects

Finds records intersecting specified geographic coordinates.

**Parameters**

-   `coordinates` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A GeoJSON geometry object
      specifying the geographic region to select.

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise that resolves to a function that
  returns a Waterline query for the specified coordinates. See
  `findWithin()` for further explanation.

### getGeometry

Gets GeoJSON geometry object from the GeoJSON geographic attribute.
Typical use is to extract `Polygon` geometry objects for use as
coordinates for the `findWithin()` or `findIntersects()` methods.

**Parameters**

-   `record` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** `GeoModel` record containing geographic attribute
-   `types` **...[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** geometry types to include (default is
      all types: `Polygon`, `Point` and `LineString`)

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** GeoJSON geometry object; undefined if no
  matching geometry objects were present

### getCentroid

Gets the centroid of the GeoJSON geographic attribute.

**Parameters**

-   `record` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** `GeoModel` record containing geographic attribute

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** GeoJSON Point object; undefined if no
  geometry objects were present from which to derive a centroid

## PointModel

**Extends BaseModel**

Base collection for Waterline models containing a GeoJSON coordinate point attribute.

**Meta**

-   **deprecated**: Use [GeoModel](#geomodel).


# Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** extended Waterline model definition

### BaseModel

BaseModel extends Waterline.Collection to provide the following defaults and methods:

-   uses the 'default' connection
-   merges attributes provided by subsequent base classes to share attribute definitions
-   displayName() attribute property for consistent access to an object's "name"
-   emit the nxus-storage CRUD events
-   findOrCreate(criteria, values) - creates the object if it does not exist
-   createOrUpdate(criteria, values) - creates the object, or updates if it exists

You should almost always extend this or one of its subclasses when defining your models.

### GeoModel

> > > > > > > master

## GeoModel

**Extends BaseModel**

Base class for Waterline models containing a GeoJSON geographic attribute.

It provides methods for performing geo queries on the GeoJSON
attribute – `findWithin()` selects records that lie within
specified coordinates, and `findIntersects()` selects records that
intersect.

To implement the geo queries, the GeoJSON data must be indexed. And
because the MongoDB 2dsphere index can handle only GeoJSON geometry
features, the index is applied to a derived _features_ attribute that
contains just the geometry features from the primary GeoJSON
attribute.

The `GeoModel` provides the machinery for keeping the features
attribute synchronized with the primary GeoJSON attribute. It also
attempts to ensure the features attribute is well-formed and has a
consistent organization. For Polygon objects, it discards duplicate
points, closes open paths and ensures clockwise winding order. It
combines Geometry objects so there is at most one of each geometry
type: Polygon/MultiPolygon, Point/MultiPoint and
LineString/MultiLineString. 

The `createGeoIndex()` method should be invoked to ensure the index
is created. Typically, you do this after the startup lifecycle phase.

Configuration is through these model properties:

-   `geometryField` (string) - Name of the primary GeoJSON attribute (default is `geo`).
-   `geometryFeatureField` (string) - Name of the geometry features attribute (default is `geoFeatures`).
    Both of these attributes must also be defined as model attributes with
    type `json`.

Use the `extend()` method to create a Waterline model based on
`GeoModel`. For example:

      import {GeoModel} from 'nxus-storage'
      const MyGeo = GeoModel.extend({
          identity: 'my-geo',
          attributes: {
              ...
              location: 'json',
              locationFeatures: 'json'
          },
          geometryField: 'location',
          geometryFeaturesField: 'locationFeatures'
      })

### createGeoIndex

Ensures index is defined for geographic attribute.
(Actually, on the attribute specified by `geometryFeatureField`.)

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise that resolves or rejects when index
  creation completes. It's worthwhile attaching a `.catch()`
  clause to this promise to log errors; index creation can fail
  for a variety of reasons, including invalid data in the
  geometry feature attribute.

### findWithin

Finds records within specified geographic coordinates.

The method goes through some odd gyrations in order to mesh the
MongoDB geographic query with Waterline query handling.

First, it _indirectly_ returns a Waterline query, by returning a
promise that resolves to a function that evaluates to the query.
This due to the fact that the query has promise semantics.
Returning it indirectly defers evaluation, allowing you to refine
it (using the chainable methods such as .populate()`,`.where()`,
and`.sort()\`) before evaluating it.

Second, it actually evaluates the MongoDB geographic query to
produce a list of matching record ids, and the returned Waterline
query is a second query based on these ids. Again, this to allow
you to refine the query before evaluation. Be aware that this
won't scale well to huge record sets, but should work for any of
moderate size.

**Parameters**

-   `coordinates` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A GeoJSON geometry object
      specifying the geographic region to select; it must be of type
      `Polygon` or `MultiPolygon`.

**Examples**

````javascript
                            ```
                              model.findWithin({ 'type': 'Polygon', 'coordinates': ... }).then((query) => {
                                return query().where(...).populate(...)
                              }).then((records) => {
                                ...
                              })
                              ```
````

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise that resolves to a function that
  returns a Waterline query for the specified coordinates.

### findIntersects

Finds records intersecting specified geographic coordinates.

**Parameters**

-   `coordinates` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** A GeoJSON geometry object
      specifying the geographic region to select.

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise that resolves to a function that
  returns a Waterline query for the specified coordinates. See
  `findWithin()` for further explanation.

### getGeometry

Gets GeoJSON geometry object from the GeoJSON geographic attribute.
Typical use is to extract `Polygon` geometry objects for use as
coordinates for the `findWithin()` or `findIntersects()` methods.

**Parameters**

-   `record` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** `GeoModel` record containing geographic attribute
-   `types` **...[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** geometry types to include (default is
      all types: `Polygon`, `Point` and `LineString`)

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** GeoJSON geometry object; undefined if no
  matching geometry objects were present

### getCentroid

Gets the centroid of the GeoJSON geographic attribute.

**Parameters**

-   `record` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** `GeoModel` record containing geographic attribute

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** GeoJSON Point object; undefined if no
  geometry objects were present from which to derive a centroid

## PointModel

**Extends BaseModel**

Base collection for Waterline models containing a GeoJSON coordinate point attribute.

**Meta**

-   **deprecated**: Use [GeoModel](#geomodel).
