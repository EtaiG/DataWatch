var  __ = Object.create(null);


/**
 *
 * @param {object} obj - the object we want to watch a property change for
 * @param {string} prop - the property of the object we want to watch
 * @param {object|function} funcParam - either the callback function,
 *          or an object containing the callback function with an optional mutate param, which would look like this:
 *          {func: function(){..}, mutate: true}
 * @param {object} [thisArg] - the object to bind the 'this' of the callback function for
 * @returns {boolean} - whether was successful or not
 */
__.watch = function(obj, prop, funcParam, thisArg){
	var desc = Object.getOwnPropertyDescriptor(obj, prop),
		getter, setter;

		if 	(!desc.configurable 
			|| (desc.value === undefined && !desc.set)
			|| desc.writable === false){
			return false;
		}

		var val = desc.value,
			thisArg = thisArg || obj;

		if (desc.value){
			getter = function(){
				return val;
			};
		} else{
			getter = desc.get;
		}

		setter = desc.set;
		if(!setter || !setter._watchers){

			setter = function(newVal){
				var oldVal = val;
                for(var i=0; i<setter._watchers.length; i++){
					var watcher = setter._watchers[i];
					//currently sending all params as one event object. Maybe should send as several params ? 
					var tempVal = watcher.func.call(thisArg, {property: prop, oldVal: oldVal, newVal: newVal});
					if(watcher.mutate){
						newVal = tempVal;
					}
				}

				val = newVal;

				return val;
			};
            setter._watchers = [];
        } else{
			setter = desc.set;
		}

        var newWatcher = typeof funcParam === 'function' ? {func: funcParam} : funcParam;

        setter._watchers.push(newWatcher);
		
		Object.defineProperty(obj, prop, {
			get: getter,
			set: setter,
			configurable: true,
			enumerable: desc.enumerable
		});
    return true;
};


/**
 *
 * @param {object} obj - the object we want to watch a property change for
 * @param {string} prop - the property of the object we want to watch
 * @param {function} func - the watcher we want to remove
 * @returns {boolean} - whether was successful or not in unwatching. Will return false if there are no watchers, or if such a function does not exist.
 *                      if this returns false, it probably means the callback function was declared inside of the watch, and not referenced
 */
__.unwatch = function(obj, prop, func){
	var desc = Object.getOwnPropertyDescriptor(obj, prop);
	if(!prop || !desc || !desc.set || !desc.set._watchers || desc.set._watchers.length === 0){
		return false; //there's no setter or no watchers, so nothing to unwatch
	}		

	/**
	*	No function specified = remove all watchers. 
	*	Might make it necessary to add a specific param, as this could be dangerous in a big project
	*/
	if(!func){
		desc.set._watchers = [];
		return false;
	}

	/**
	* 	Remove the watcher
	*/
	var watchers = desc.set._watchers;
	var counter = 0;
	while(counter<watchers.length){
		if(watchers[counter].func === func){
			watchers.splice(counter,1);
			return true;
		}
		++counter;
	}
    return false;
};


/***** debug *****/
/**
 *
 * @param {object} obj - the object we're checking
 * @param {string} prop - the property of the object we want to get the watchers for
 * @returns {Array} array of watchers
 */
__.watch.getWatchers = function(obj, prop){
	var desc = Object.getOwnPropertyDescriptor(obj, prop);
    if(!prop || !desc || !desc.set || !desc.set._watchers || desc.set._watchers.length === 0){
        return false; //there's no setter or no watchers, so nothing to unwatch
    } else{
			return desc.set._watchers;
	}
}

/**
 *
 * @param {object} obj - the object we're checking
 * @param {string} prop - the property of the object we want to get the 'mutating' watchers for
 * @returns {Array} array of watchers which mutate the result of the property when set
 */
__.watch.getMutators = function(obj, prop){
		var desc = Object.getOwnPropertyDescriptor(obj, prop);
    if(!prop || !desc || !desc.set || !desc.set._watchers || desc.set._watchers.length === 0){
        return false; //there's no setter or no watchers, so nothing to unwatch
    } else{
        var watchers = desc.set._watchers,
            mutators = [];
        for(var i=0; i<watchers.length; i++){
            if(watchers[i].mutate){
                mutators.push(watchers[i].func);
            };
        }
        return mutators;
    }
}