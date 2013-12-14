/**
 * Note that this is set to export as a module. By default, it's set to window._ (i.e., to expand lodash or underscore).
 * You can choose where you want this to sit by adding your module as a param to the function (end of the file).
 * If you want to create a new namespace for this, then when declaring the module, you should declare it with an empty object, as such:
 * var myMod = (function(module){....}({})
 */

(function (module, allowOverride) {

    module = module || window._;
    /**
     *
     * @param {object} obj - the object we want to watch a property change for
     * @param {string} prop - the property of the object we want to watch
     * @param {object|function} funcParam - either the callback function,
     *          or an object containing the callback function with an optional mutate param, which would look like this:
     *          {func: function(){..}, mutate: true}
     * @param {object} [thisArg] - the object to bind the 'this' of the callback function for
     * @returns {object|boolean} - If it was successful, it returns the thisArg of the function. If no thisArg was supplied, then it returns the watched object (which is then the thisArg).
     *                             If unsuccessful, it returns false.
     */
    var watch = function watch(obj, prop, funcParam, thisArg) {
        var desc = Object.getOwnPropertyDescriptor(obj, prop),
            getter = desc.get, setter = desc.set;

        if (!desc.configurable
            || (desc.value === undefined && !desc.set)
            || desc.writable === false) {
            return false;
        }

        var val = desc.value;

        if (desc.value) {
            getter = function () {
                return val;
            };
        } else {
            getter = desc.get;
        }

        var newSetter;

        if (!setter || setter && !setter._watchers) {
            var propertySetter = function (newVal) {
                var oldVal = val;
                for (var i = 0; i < propertySetter._watchers.length; i++) {
                    var watcher = propertySetter._watchers[i];
                    var tempVal = watcher.func.call(watcher.scope, prop, oldVal, newVal);
                    if (watcher.mutate) {
                        newVal = tempVal;
                    }
                }
                val = newVal;
                return val;
            };

            propertySetter._watchers = [];

            if (setter) {
                var oldSetterWatcher = {func: function (prop, oldVal, newVal) {
                    setter(newVal);
                }, scope: obj, mutate: true};
                propertySetter._watchers.push(oldSetterWatcher);
            }
            newSetter = propertySetter;
        }

        if (!newSetter) {
            newSetter = setter;
        }

        var newWatcher = typeof funcParam === 'function' ? {func: funcParam} : funcParam;
        newWatcher.scope = thisArg || obj;
        newSetter._watchers.push(newWatcher);

        Object.defineProperty(obj, prop, {
            get: getter,
            set: newSetter,
            configurable: true,
            enumerable: desc.enumerable
        });
        return newWatcher.scope;
    };


    /**
     *
     * @param {object} obj - the object we want to watch a property change for
     * @param {string} prop - the property of the object we want to watch
     * @param {function} func - the watcher we want to remove
     * @returns {boolean} - whether was successful or not in unwatching. Will return false if there are no watchers, or if such a function does not exist.
     *                      if this returns false, it probably means the callback function was declared inside of the watch, and not referenced
     */
    var unwatch = function unwatch(obj, prop, func) {
        var desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (!prop || !desc || !desc.set || !desc.set._watchers || desc.set._watchers.length === 0) {
            return false; //there's no setter or no watchers, so nothing to unwatch
        }

        /**
         *    No function specified = remove all watchers.
         *    Might make it necessary to add a specific param, as this could be dangerous in a big project
         */
        if (!func) {
            desc.set._watchers = [];
            return true;
        }

        /**
         *    Remove the watcher
         */
        var watchers = desc.set._watchers;
        var counter = 0;
        while (counter < watchers.length) {
            if (watchers[counter].func === func) {
                return watchers.splice(counter, 1).scope;

            }
            ++counter;
        }
        return false;
    };


    /**
     *
     * @param {object} obj - the object we're checking
     * @param {string} prop - the property of the object we want to get the watchers for
     * @returns {Array} array of watchers
     */
    var getWatchers = function getWatchers(obj, prop) {
        var desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (!prop || !desc || !desc.set || !desc.set._watchers || desc.set._watchers.length === 0) {
            return []; //there's no setter or no watchers, so nothing to unwatch
        } else {
            return desc.set._watchers;
        }
    }

    /**
     *
     * @param {object} obj - the object we're checking
     * @param {string} prop - the property of the object we want to get the 'mutating' watchers for
     * @returns {Array} array of watchers which mutate the result of the property when set
     */
    var getMutators = function getMutators(obj, prop) {
        var desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (!prop || !desc || !desc.set || !desc.set._watchers || desc.set._watchers.length === 0) {
            return [];
        } else {
            var watchers = desc.set._watchers,
                mutators = [];
            for (var i = 0; i < watchers.length; i++) {
                if (watchers[i].mutate) {
                    mutators.push(watchers[i].func);
                }
                ;
            }
            return mutators;
        }
    }


    var addFunctionsToNamespace = function(){

        if(!allowOverride
            &&     module.hasOwnProperty('watch')
                || module.hasOwnProperty('unwatch')
                || module.hasOwnProperty('getWatchers')
                || module.hasOwnProperty('getMutators')){
            throw new Error('DataWatch is overriding a previously declared method.')
        }


        var config = {writable: false, enumerable: false, configurable: true};

        config.value = watch;
        Object.defineProperty(module,'watch', config);
        config.value = unwatch;
        Object.defineProperty(module,'unwatch', config);
        config.value = getWatchers;
        Object.defineProperty(module,'getWatchers', config);
        config.value = getMutators;
        Object.defineProperty(module,'getMutators', config);
    }

    addFunctionsToNamespace();

    return module;
})();