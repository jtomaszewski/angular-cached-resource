// Generated by CoffeeScript 1.7.1
var CachedResourceManager, DEFAULT_ACTIONS, ResourceCacheArrayEntry, ResourceCacheEntry, app, resourceManagerListener;

DEFAULT_ACTIONS = {
  get: {
    method: 'GET'
  },
  query: {
    method: 'GET',
    isArray: true
  },
  save: {
    method: 'POST'
  },
  remove: {
    method: 'DELETE'
  },
  "delete": {
    method: 'DELETE'
  }
};

ResourceCacheEntry = require('./resource_cache_entry');

ResourceCacheArrayEntry = require('./resource_cache_array_entry');

CachedResourceManager = require('./cached_resource_manager');

resourceManagerListener = null;

app = angular.module('ngCachedResource', ['ngResource']);

app.factory('$cachedResource', [
  '$resource', '$timeout', '$q', '$log', function($resource, $timeout, $q, $log) {
    var readArrayCache, readCache, resourceManager, writeCache;
    resourceManager = new CachedResourceManager($timeout);
    if (resourceManagerListener) {
      document.removeEventListener('online', resourceManagerListener);
    }
    resourceManagerListener = function(event) {
      return resourceManager.flushQueues();
    };
    document.addEventListener('online', resourceManagerListener);
    readArrayCache = function(name, CachedResource, boundParams) {
      return function(parameters) {
        var cacheArrayEntry, cacheInstanceEntry, cacheInstanceParams, deferred, resource, _i, _len, _ref;
        resource = CachedResource.$resource[name].apply(CachedResource.$resource, arguments);
        resource.$httpPromise = resource.$promise;
        if (angular.isFunction(parameters)) {
          parameters = {};
        }
        if (parameters == null) {
          parameters = {};
        }
        cacheArrayEntry = new ResourceCacheArrayEntry(CachedResource.$key, parameters);
        resource.$httpPromise.then(function(response) {
          return cacheArrayEntry.set(response.map(function(instance) {
            var attribute, cacheInstanceEntry, cacheInstanceParams, param;
            cacheInstanceParams = {};
            for (attribute in boundParams) {
              param = boundParams[attribute];
              if (typeof instance[attribute] !== "object" && typeof instance[attribute] !== "function") {
                cacheInstanceParams[param] = instance[attribute];
              }
            }
            if (Object.keys(cacheInstanceParams).length === 0) {
              $log.error("instance " + instance + " doesn't have any boundParams. Please, make sure you specified them in your resource's initialization, f.e. `{id: \"@id\"}`, or it won't be cached.");
            } else {
              cacheInstanceEntry = new ResourceCacheEntry(CachedResource.$key, cacheInstanceParams);
              cacheInstanceEntry.set(instance, false);
            }
            return cacheInstanceParams;
          }));
        });
        if (cacheArrayEntry.value) {
          _ref = cacheArrayEntry.value;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cacheInstanceParams = _ref[_i];
            cacheInstanceEntry = new ResourceCacheEntry(CachedResource.$key, cacheInstanceParams);
            resource.push(new CachedResource(cacheInstanceEntry.value));
          }
          deferred = $q.defer();
          resource.$promise = deferred.promise;
          deferred.resolve(resource);
        }
        return resource;
      };
    };
    readCache = function(name, CachedResource) {
      return function() {
        var args, cacheDeferred, cacheEntry, error, httpDeferred, instance, params, readHttp, success;
        args = Array.prototype.slice.call(arguments);
        params = angular.isObject(args[0]) ? args.shift() : {};
        success = args[0], error = args[1];
        cacheDeferred = $q.defer();
        if (angular.isFunction(success)) {
          cacheDeferred.promise.then(success);
        }
        if (angular.isFunction(error)) {
          cacheDeferred.promise["catch"](error);
        }
        httpDeferred = $q.defer();
        instance = new CachedResource({
          $promise: cacheDeferred.promise,
          $httpPromise: httpDeferred.promise
        });
        cacheEntry = new ResourceCacheEntry(CachedResource.$key, params);
        readHttp = function() {
          var resource;
          resource = CachedResource.$resource[name].call(CachedResource.$resource, params);
          resource.$promise.then(function(response) {
            angular.extend(instance, response);
            if (!cacheEntry.value) {
              cacheDeferred.resolve(instance);
            }
            httpDeferred.resolve(instance);
            return cacheEntry.set(response, false);
          });
          return resource.$promise["catch"](function(error) {
            if (!cacheEntry.value) {
              cacheDeferred.reject(error);
            }
            return httpDeferred.reject(error);
          });
        };
        if (cacheEntry.dirty) {
          resourceManager.getQueue(CachedResource).processResource(params, readHttp);
        } else {
          readHttp();
        }
        if (cacheEntry.value) {
          angular.extend(instance, cacheEntry.value);
          cacheDeferred.resolve(instance);
        }
        return instance;
      };
    };
    writeCache = function(action, CachedResource) {
      return function() {
        var args, cacheEntry, deferred, error, instanceMethod, params, postData, queue, queueDeferred, resource, success;
        instanceMethod = this instanceof CachedResource;
        args = Array.prototype.slice.call(arguments);
        params = !instanceMethod && angular.isObject(args[1]) ? args.shift() : instanceMethod && angular.isObject(args[0]) ? args.shift() : {};
        postData = instanceMethod ? this : args.shift();
        success = args[0], error = args[1];
        resource = this || new CachedResource();
        resource.$resolved = false;
        deferred = $q.defer();
        resource.$promise = deferred.promise;
        if (angular.isFunction(success)) {
          deferred.promise.then(success);
        }
        if (angular.isFunction(error)) {
          deferred.promise["catch"](error);
        }
        cacheEntry = new ResourceCacheEntry(CachedResource.$key, params);
        if (!angular.equals(cacheEntry.data, postData)) {
          cacheEntry.set(postData, true);
        }
        queueDeferred = $q.defer();
        queueDeferred.promise.then(function(value) {
          angular.extend(resource, value);
          resource.$resolved = true;
          return deferred.resolve(resource);
        });
        queueDeferred.promise["catch"](deferred.reject);
        queue = resourceManager.getQueue(CachedResource);
        queue.enqueue(params, action, queueDeferred);
        queue.flush();
        return resource;
      };
    };
    return function() {
      var $key, CachedResource, Resource, actions, arg, args, boundParams, handler, name, param, paramDefault, paramDefaults, params, url, _ref;
      args = Array.prototype.slice.call(arguments);
      $key = args.shift();
      url = args.shift();
      while (args.length) {
        arg = args.pop();
        if (angular.isObject(arg[Object.keys(arg)[0]])) {
          actions = arg;
        } else {
          paramDefaults = arg;
        }
      }
      actions = angular.extend({}, DEFAULT_ACTIONS, actions);
      if (paramDefaults == null) {
        paramDefaults = {};
      }
      boundParams = {};
      for (param in paramDefaults) {
        paramDefault = paramDefaults[param];
        if (paramDefault[0] === '@') {
          boundParams[paramDefault.substr(1)] = param;
        }
      }
      Resource = $resource.call(null, url, paramDefaults, actions);
      CachedResource = (function() {
        function CachedResource(attrs) {
          angular.extend(this, attrs);
        }

        CachedResource.$resource = Resource;

        CachedResource.$key = $key;

        return CachedResource;

      })();
      for (name in actions) {
        params = actions[name];
        handler = params.method === 'GET' && params.isArray ? readArrayCache(name, CachedResource, boundParams) : params.method === 'GET' ? readCache(name, CachedResource) : (_ref = params.method) === 'POST' || _ref === 'PUT' || _ref === 'DELETE' ? writeCache(name, CachedResource) : void 0;
        CachedResource[name] = handler;
        if (params.method !== 'GET') {
          CachedResource.prototype["$" + name] = handler;
        }
      }
      resourceManager.add(CachedResource);
      resourceManager.flushQueues();
      return CachedResource;
    };
  }
]);

if (typeof module !== "undefined" && module !== null) {
  module.exports = app;
}
