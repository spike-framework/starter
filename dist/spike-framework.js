(function (history) {

    var pushState = history.pushState;

    history.pushState = function (state) {

        if (typeof history.onpushstate === "function") {
            history.onpushstate({state: state});
        }

        var result = pushState.apply(history, arguments);
        spike.core.Router.onHistoryChanges();

        return result;

    };

    window.addEventListener('popstate', function (e) {
        spike.core.Router.onHistoryChanges();
    });

})(window.history);var spike = {
    core: {}
};

spike.core.Assembler = {

    templatesLoaded: false,
    appLoaded: false,

    namespacesCount: 0,

    staticClasses: {},
    objectiveClasses: {},

    /**
     var newObjectShallow = extend(object1, object2, object3);
     var newObjectDeep = extend(true, object1, object2, object3);
     */
    extend: function () {
        var extended = {};
        var deep = false;
        var i = 0;
        var length = arguments.length;

        if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
            deep = arguments[0];
            i++;
        }

        var merge = function (obj) {
            for (var prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                        extended[prop] = extend(true, extended[prop], obj[prop]);
                    } else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        };

        for (; i < length; i++) {
            var obj = arguments[i];
            merge(obj);
        }

        return extended;
    },

    getDotPath: function (package) {

        var obj = window;

        package = package.split(".");
        for (var i = 0, l = package.length; i < l; i++) {

            if(obj[package[i]] === undefined){
                break;
            }

            obj = obj[package[i]];

        }

        return obj;

    },

    createDotPath: function (package, fillObject) {

        if (package.trim().length === 0) {
            throw new Error();
        }

      //  package = package.substring(4, package.length);


        var createNodesFnBody = '';
        var splitPackage = package.split('.');

        var packageCheck = 'window';
        for (var i = 0, l = splitPackage.length; i < l; i++) {

            packageCheck += '.' + splitPackage[i];

            createNodesFnBody += 'if(' + packageCheck + ' === undefined){';
            createNodesFnBody += '    ' + packageCheck + ' = {};';
            createNodesFnBody += '}';

        }

        createNodesFnBody += '    ' + packageCheck + ' = fillObject';

        Function('fillObject', createNodesFnBody)(fillObject);

    },

    defineNamespace: function (package, names, namespaceCreator) {

        this.namespacesCount++;
        for (var i = 0, l = names.length; i < l; i++) {
            this.createDotPath(package + '.' + names[i], null);
        }

        //     namespaceCreator();
        // }else{
            this.objectiveClasses[package + '.' + names[0]] = namespaceCreator;

        this.checkIfCanBootstrap();

    },

    createStaticClass: function (package, name, inherits, classBody) {

        if(name.indexOf(package) > -1){
            name = name.replace(package+'.', '');
        }

        this.namespacesCount++;
        this.createDotPath(package + '.' + name, null);

        if (inherits === null) {
            inherits = {};
        } else {
            inherits = this.getDotPath(inherits);
        }

        //if(package.indexOf('spike.core') > -1){
        //     this.createDotPath(package + '.' + name, this.extend({}, inherits, classBody));
        // }else{
            this.staticClasses[package + '.' + name] = { package: package + '.' + name, inherits: inherits, classBody: classBody };
      //  }

        this.checkIfCanBootstrap();

    },


    checkIfCanBootstrap: function(){

        if(this.namespacesCount === window.__spike_tn){
            this.bootstrap();

            if(this.appLoaded === true){
                spike.core.System.init();
            }

        }

    },

    bootstrap: function(){

        var arrayOrder = [];
        var mapOrdered = {};
        var orderPrefix = 0;

        for(var className in this.staticClasses){

            var classDefinition = this.staticClasses[className];
            mapOrdered[orderPrefix+'_'+Object.keys(classDefinition.inherits).length] = classDefinition;
            arrayOrder.push(orderPrefix+'_'+Object.keys(classDefinition.inherits).length);

            orderPrefix++;
        }

        arrayOrder.sort(function(a,b){
            return a.split('_')[1] > b.split('_')[1] ? 1 : -1;
        });

        for(var i = 0; i < arrayOrder.length; i++){
            this.createDotPath(mapOrdered[arrayOrder[i]].package, this.extend({}, mapOrdered[arrayOrder[i]].inherits, mapOrdered[arrayOrder[i]].classBody));
        }

        for(var className in this.objectiveClasses){
            this.objectiveClasses[className]();
        }

        this.loadTemplates();

    },

    loadTemplates: function(){

        var self = this;

        if(this.templatesLoaded === false){

            if(document.querySelector('[templates-src]') === null){
                throw new Error('Spike Framework: Cannot find script tag with templates-src definition')
            }

            if(document.querySelector('[app-src]') === null){
                throw new Error('Spike Framework: Cannot find script tag with app-src definition')
            }

            var script = document.createElement("script");
            script.type = "application/javascript";
            script.src = document.querySelector('[templates-src]').getAttribute('templates-src');
            script.onload = function(){
                self.templatesLoaded = true;

                self.namespacesCount = 0;
                self.appLoaded = true;
                var script2 = document.createElement("script");
                script2.type = "application/javascript";
                script2.src = document.querySelector('[app-src]').getAttribute('app-src');
                document.body.appendChild(script2);

            };

            document.body.appendChild(script);

        }

    },

    findLoaderClass: function(){

        for(var className in this.objectiveClasses){

            if(this.objectiveClasses[className].toString().indexOf('LoaderInterface.apply') > -1){

               var loader = window;

               var split = className.split('.');
               for(var i = 0; i < split.length; i++){

                   loader = loader[split[i]];

               }

               loader = new loader();

               return  loader;
            }

        }

        throw new Error('Spike Framework: No loader defined');

    },

    getClassObject: function(className, argsArray){

        function getObjectFromPath(path){
            var obj = window;

            var split = path.split('.');
            for(var i = 0; i < split.length; i++){
                obj = obj[split[i]];
            }

            return obj;
        }

        function countArgs(str){
            return str.split('_').length - 1;
        }

        var classObject = null;

        var classArgs = countArgs(className);

        if(classArgs !== argsArray.length){

            var classStrictName = className.split('.')[className.split('.').length -1];

            var classPackage = getObjectFromPath(className.replace('.'+classStrictName,''));


            for(var classNameInPackage in classPackage){

                if(countArgs(classNameInPackage) === argsArray.length){
                    classObject = classPackage[classNameInPackage];
                }

            }

        }

        console.log(classObject);
        console.log(className);

        if(classObject == null){
            classObject = getObjectFromPath(className);
        }

        console.log(classObject);

        if(classObject.length !== argsArray.length){
            spike.core.Log.warn('Spike Assembler: Skipping arguments for {0}', [className]);
        }

        classObject = classObject.apply(this, argsArray);

        console.log(classObject);

        return classObject;

    }

};

var __spike_tn = 21;spike.core.Assembler.defineNamespace('spike.core',['Config'], function(){spike.core.Config = function(){    };spike.core.Config.prototype.html5Mode= false;spike.core.Config.prototype.mobileRun= false;spike.core.Config.prototype.showLog= true;spike.core.Config.prototype.showObj= true;spike.core.Config.prototype.showDebug= true;spike.core.Config.prototype.showWarn= true;spike.core.Config.prototype.showOk= true;spike.core.Config.prototype.mainController= null;spike.core.Config.prototype.initialView= null;spike.core.Config.prototype.rootPath= 'app';spike.core.Config.prototype.getSuper = function(){ return 'spike.core.Config'; };spike.core.Config.prototype.getClass = function(){ return 'spike.core.Config'; }; });spike.core.Assembler.createStaticClass('spike.core','Errors', null,{

   messages: {

      CACHED_PROMISE_DEPRECADES: '@createCachedPromise has been deprecated. Use @cache param instead',
      REST_API_NULL_PATHPARAM: 'REST endpoint has undefined or null path params: {0}',
      APPLICATION_EVENT_CALLBACK_NULL: 'Applicaton event listener {0} is null',
      APPLICATION_EVENT_NOT_EXIST: 'Application event {0} not exists',
      APPLICATION_EVENT_ALREADY_EXIST: 'Application event {0} already exists',
      ROUTING_ENABLED_NOT_DEFINED: 'Routing is enabled but not defined in Config',
      ROUTE_NAME_NOT_EXIST: 'Route name {0} not exists',
      ROUTE_NAME_EXIST: 'Route name {0} already exists, must be unique',
      INTERCEPTOR_ALREADY_REGISTRED: 'Interceptor {0} is already registred',
      REDIRECT_NO_PATH: 'Try redirect to path but path argument is not defined',
      TRANSLATION_PARSING: 'Translation parsing error for language {0}',
      TEMPLATE_NOT_FOUND_ERROR: 'Template named {0} not found',
      INITIAL_VIEW_ERROR: 'No initial view with name: {0}',
      WEBSQL_SUPPORT: 'No WebSQL support in this browser',
      PATH_DEFINITION: 'Path URI and Path object cannot be empty',
      PATH_ALREADY_EXIST: 'Path {0} is already defined',
      PATH_PATTERN_ALREADY_EXIST: 'Path {0} is already defined. Pattern {1} is duplicated',
      MODULE_NOT_EXIST: 'Try rendering not existing module',
      RESTRICTED_NAME: 'Name {0} is restricted in usage in application',
      TRANSLATION_MESSAGE_NOT_FOUND: 'Translation for message {0} not found',
      TRANSLATION_NOT_EXIST: 'No defined language: {0}',
      TRANSLATION_LOAD_WARN: 'Translation file for language: {0} cannot be downloaded, status: {1}',
      OUTSIDE_CONTEXT_COMPONENT_NOT_FOUND: 'Component {0} outside "spike-view" is not defined and cannot be rendered',
      OUTSIDE_CONTEXT_COMPONENT_NOT_GLOBAL: 'Component {0} outside "spike-view" cannot be rendered because is not GLOBAL',
      OUTSIDE_CONTEXT_COMPONENT_NO_NAME: 'One of global component has not defined name',

      SPIKE_APP_NOT_DEFINED: 'No DOM element with {0} or {1} attribute specified',
      REQUEST_WRONG_PARAMS: 'Request url and type not defined',
      JSON_PARSE_ERROR: 'JSON parse error during execution {0}'

    },

  throwError: function (errorMessage, errorMessageBinding) {

    var error = 'Spike Framework: ' + spike.core.Util.bindStringParams(errorMessage, errorMessageBinding);
    this.errors.push(error);
    this.printExceptions();
    throw new Error(error);

  },

  errors: [],

  printExceptions: function () {

    for (var i = 0; i < this.errors.length; i++) {
      console.error('Error ' + i + ': ' + this.errors[i]);
    }

  },

  throwWarn: function (warnMessage, warnMessageBinding) {
    spike.core.Log.warn('Spike Framework: ' + spike.core.Util.bindStringParams(warnMessage, warnMessageBinding));
  }

});spike.core.Assembler.createStaticClass('spike.core','Events', null,{

  allowedEvents: [
    'click',
    'change',
    'keyup',
    'keydown',
    'keypress',
    'blur',
    'focus',
    'dblclick',
    'die',
    'hover',
    'keydown',
    'mousemove',
    'mouseover',
    'mouseenter',
    'mousedown',
    'mouseleave',
    'mouseout',
    'submit',
    'trigger',
    'toggle',
    'load',
    'unload'
  ],

  bindEvents: function(element){

    for(var i = 0; i < element.childElements.length; i++){

        this.bindEventsForElement(element.childElements[i]);

        if(element.childElements[i].length > 0){
            this.bindEvents(element.childElements[i]);
        }

    }

  },

  bindEventsForElement: function (element) {

    for(var i = 0; i < element.eventsSelectors.length; i++){

        var selector = document.getElementById(element.eventsSelectors[i]);

        for (var k = 0; k < this.allowedEvents.length; k++) {

            var eventFunctionBody = selector.getAttribute('spike-event-' + this.allowedEvents[k]);

            if (eventFunctionBody) {
                selector.addEventListener(this.allowedEvents[i], Function('event', eventFunctionBody));
            }

        }

        element.removeAttribute('spike-unbinded');

    }

  },

});spike.core.Assembler.defineNamespace('spike.core',['EventsInterface'], function(){spike.core.EventsInterface = function(){    };spike.core.EventsInterface.prototype.onRender= function () {

         };spike.core.EventsInterface.prototype.domEvents= function () {

         };spike.core.EventsInterface.prototype.onOnline= function () {
         };spike.core.EventsInterface.prototype.onOffline= function () {
         };spike.core.EventsInterface.prototype.onBack= function () {
         };spike.core.EventsInterface.prototype.onDeviceReady= function () {
         };spike.core.EventsInterface.prototype.onReady= function () {
         };spike.core.EventsInterface.prototype.getSuper = function(){ return 'spike.core.EventsInterface'; };spike.core.EventsInterface.prototype.getClass = function(){ return 'spike.core.EventsInterface'; }; });spike.core.Assembler.defineNamespace('spike.core',['RoutingInterface'], function(){spike.core.RoutingInterface = function(){    };spike.core.RoutingInterface.prototype.create= function(router){

  };spike.core.RoutingInterface.prototype.getSuper = function(){ return 'spike.core.RoutingInterface'; };spike.core.RoutingInterface.prototype.getClass = function(){ return 'spike.core.RoutingInterface'; }; });spike.core.Assembler.defineNamespace('spike.core',['LoaderInterface'], function(){spike.core.LoaderInterface = function(){    };spike.core.LoaderInterface.prototype.loadApplication= function(){

  };spike.core.LoaderInterface.prototype.onLoadApplication= function(){
  };spike.core.LoaderInterface.prototype.getSuper = function(){ return 'spike.core.LoaderInterface'; };spike.core.LoaderInterface.prototype.getClass = function(){ return 'spike.core.LoaderInterface'; }; });spike.core.Assembler.defineNamespace('spike.core',['ModalInterface'], function(){spike.core.ModalInterface = function(){    };spike.core.ModalInterface.prototype.modals= [];spike.core.ModalInterface.prototype.onRender= function (modal) {
        this.clearDestroyedModals();
        this.modals.push(modal);
    };spike.core.ModalInterface.prototype.onShow= function (modal) {
         modal.rootSelector().style = 'display: block;';
    };spike.core.ModalInterface.prototype.onHide= function (modal) {
         modal.rootSelector().style = 'display: hide;';
    };spike.core.ModalInterface.prototype.onDestroy= function (modal) {
        modal.rootSelector().style = 'display: none;';
        modal.destroy();
    };spike.core.ModalInterface.prototype.invalidateAll= function () {

       for(var i = 0; i < this.modals.length; i++){
           this.onDestroy(this.modals[i]);
       }

    };spike.core.ModalInterface.prototype.clearDestroyedModals= function(){

       var modals = [];
       for(var i = 0; i < this.modals.length; i++){
          if(this.modals[i].destroyed === false){
            modals.push(this.modals[i]);
          }
       }

       this.modals = modals;

    };spike.core.ModalInterface.prototype.getSuper = function(){ return 'spike.core.ModalInterface'; };spike.core.ModalInterface.prototype.getClass = function(){ return 'spike.core.ModalInterface'; }; });spike.core.Assembler.createStaticClass('spike.core','spike.core.System', null,{

   config: null,
   eventsInterface: null,
   modalInterface: null,
   routing: null,

   setConfig: function(configObject){
    this.config = configObject;
   },

   setRouting: function(routing){
    this.routing = routing;
   },

   setEventsInterface: function(eventsInterface){
    this.eventsInterface = eventsInterface;
   },

   setModalInterface: function(modalInterface){
    this.modalInterface = modalInterface;
   },

   idCounter: 1,
   assignId: function(){
    idCounter++;
    return 'element-'+idCounter;
   },

  attributes: {
    VIEW: 'spike-view',
    MODALS: 'spike-modals',
  },

  version: '3.0.0',

  currentController: null,

  previousController: null,

  getCurrentController: function () {

    var endpoint = spike.core.Router.getCurrentViewData().endpoint;

    if (endpoint) {
      return endpoint.controller;
    }

    return this.currentController || spike.core.System.config.mainController;
  },


  execOnRenderEvent: function () {

    if (Events.onRender) {
      Events.onRender();
    }

  },


  renderModal: function (modalObject, modalInitialData, afterRenderCallback) {
  
    spike.core.Log.debug('Invoke system.renderModal', []);
    spike.core.Log.log('Rendering modal {0}', [modalObject.name]);

    if (modalObject.checkNetwork === true) {
      app.cordova.checkNetwork();
    }

    if (modalInitialData === undefined) {
      modalInitialData = null;
    }

    modalObject.render(modalInitialData);

    spike.core.System.execOnRenderEvent();

    if (afterRenderCallback) {
      afterRenderCallback();
    }

  },

  renderController: function (controller, afterRenderCallback) {
    spike.core.Log.debug('Invoke system.renderController with params', []);
    spike.core.Log.log('Rendering controller {0}', [controller.getClass()]);

    if (controller.scrollTop === true) {
      window.scrollTo(0,0);
    }

    this.modalInterface.invalidateAll();


    spike.core.Selectors.clearSelectorsCache();

    controller.render();

    spike.core.System.execOnRenderEvent();

    if (afterRenderCallback) {
      afterRenderCallback();
    }

    spike.core.Log.ok('spike.core.Selectors cache usage during app lifecycle: ' + spike.core.System.cacheUsageCounter);

  },

  render: function (moduleClass, moduleInitialModel, afterRenderCallback) {

    if (!moduleClass) {
      spike.core.Errors.throwError(spike.core.Errors.messages.MODULE_NOT_EXIST);
    }

    spike.core.Router.clearCacheViewData();

    var module = spike.core.Assembler.getClassObject(moduleClass, [moduleInitialModel]);

    if (module.getSuper() === 'spike.core.Controller') {
      spike.core.System.renderController(module, afterRenderCallback);
    } else if (module.getSuper() === 'spike.core.Modal') {
      spike.core.System.renderModal(module, afterRenderCallback);
    }

  },

  viewSelector: null,

  getView: function () {

    if(this.viewSelector === null){
        this.viewSelector = document.querySelector('['+this.attributes.VIEW+']');
    }

    return this.viewSelector;

  },

  modalsSelector: null,

  getModalsView: function(){

   if(this.modalsSelector === null){
    this.modalsSelector = document.querySelector('['+this.attributes.MODALS+']');
   }

   return this.modalsSelector;

  },

  verifyViews: function(){

    if(this.getView() === null || this.getModalsView() === null){
        spike.core.Errors.throwError(spike.core.Errors.messages.SPIKE_APP_NOT_DEFINED, [this.attributes.VIEW, this.attributes.MODALS]);
    }

  },

  renderInitialView: function () {
    spike.core.Log.debug('Running system.initialView');

    if (spike.core.System.config.initialView !== undefined) {

      try {

        var templateHtml = Templates.templates[spike.core.System.config.initialView];

        if(templateHtml){
            spike.core.System.getView().html(templateHTML);
        }

      } catch (err) {
        spike.core.Errors.throwError(spike.core.Errors.messages.INITIAL_VIEW_ERROR, [spike.core.System.config.initialView])
      }

    }


  },

  loader: null,

  init: function () {

    this.loader = spike.core.Assembler.findLoaderClass();
    this.loader.loadApplication();

    spike.core.Log.debug('Invoke spike.core.System.init with params', []);

    if(spike.core.System.config === null){
        this.setConfig(new spike.core.spike.core.System.config());
    }

    if(this.modalInterface === null){
        this.setModalInterface(new spike.core.ModalInterface());
    }

    if(this.eventsInterface === null){
        this.setEventsInterface(new spike.core.EventsInterface());
    }

    spike.core.Router.detectHTML5Mode();

    spike.core.Log.warn('Spike version: {0}', [spike.core.System.version]);
    spike.core.Log.ok('Spike application initializing...');


    this.verifyViews();
    spike.core.System.renderInitialView();
    this.routing.create(spike.core.Router.create());
    this.initGlobalElements();

    spike.core.Router.registerRouter();


    if (this.getEvents().onReady !== undefined) {
        this.getEvents().onReady();
    }

    this.loader.onLoadApplication();

    spike.core.Log.ok('Spike application ready to work...');

  },

  initGlobalElements: function(){

    var globalElements = this.getView().getElementsByTagName('element');

    for(var i = 0; i < globalElements.length; i++){

        var className = globalElements[i].getAttribute('name');

        var globalElement = spike.core.Assembler.getDotPath(className)();

        globalElement.render();

    }

  }

});spike.core.Assembler.createStaticClass('spike.core','Log', null,{

  obj: function (jsObject) {

    if (spike.core.System.config.showObj) {
      console.log(jsObject);
    }

  },

  log: function (logMessage, logData) {

    if (spike.core.System.config.showLog) {
      app.print(logMessage, logData, 'LOG');
    }

  },

  error: function (errorMessage, errorData) {

    if (spike.core.System.config.showError) {
      app.print(errorMessage, errorData, 'ERROR');
    }
  },

  debug: function (debugMessage, debugData) {

    if (spike.core.System.config.showDebug) {
      app.print(debugMessage, debugData, 'DEBUG');
    }

  },

  warn: function (warnMessage, warnData) {

    if (spike.core.System.config.showWarn) {
      app.print(warnMessage, warnData, 'WARN');
    }

  },

  ok: function (okMessage, okData) {

    if (spike.core.System.config.showOk) {
      app.print(okMessage, okData, 'OK');
    }

  },

  print: function (message, data, type) {

    if (typeof message !== 'string') {
      message = JSON.stringify(message);
    }

    if (data) {
      message = spike.core.Util.bindStringParams(message, data);
    }

    var color = '';
    switch (type) {
      case 'LOG' :
        color = 'blue';
        break;
      case 'ERROR' :
        color = 'red';
        break;
      case 'DEBUG' :
        color = 'gray';
        break;
      case 'WARN' :
        color = 'orange';
        break;
      case 'OK' :
        color = 'green';
        break;
      default:
        color = 'black';
    }

    console.log('%c' + spike.core.Util.currentDateLog() + ' Spike Framework: ' + message, 'color: ' + color);

  }

});spike.core.Assembler.createStaticClass('spike.core','spike.core.Selectors', null,{

  cacheUsageCounter: 0,

  selectorsCache: {},

  clearSelectorsCache: function () {
    this.selectorsCache = {};
  },

  clearSelectorInCache: function (selectorId) {

    if (this.selectorsCache[selectorId]) {
      this.selectorsCache[selectorId] = null;
    }

  },

  createNamesSelectors: function(templateHtml, selectors){

    var nameList = Util.findStringBetween(templateHtml, 'name="', '"');

    for(var i = 0; i < nameList.length; i++){

        var newName = name + '-' + Util.hash();

        selectors.names[name] = function () {

            var selector = spike.core.Selectors.selectorsCache[newName];

            if (selector === undefined) {
                selector = document.querySelector('['+newId+']');
                selector.plainId = newId;
                spike.core.Selectors.selectorsCache[newId] = selector;
            } else {
                spike.core.Selectors.cacheUsageCounter++;
            }

            return selector;


        }

        templateHtml = templateHtml.replace('name="' + name + '"', 'spike-name="' + newName + '" name="' + name + '"');

    }

    return templateHtml;

  },

  createIdSelectors: function(templateHtml, selectors, eventsSelectors, linksSelectors){

   var idList = Util.findStringBetween(templateHtml, 'id="', '"');

   for(var i = 0; i < idList.length; i++){

    var newId = idList[i] + '-' + Util.hash();

    selectors[idList[i]] = function () {

        var selector = spike.core.Selectors.selectorsCache[newId];

        if (selector === undefined) {
          selector = document.getElementById(newId);
          selector.plainId = newId;
          spike.core.Selectors.selectorsCache[newId] = selector;
        } else {
          spike.core.Selectors.cacheUsageCounter++;
        }

        return selector;

    };

    if(idList[i].indexOf('spike-event-') > -1){
        eventsSelectors.push(newId);
    }

    if(idList[i].indexOf('spike-href-') > -1){
        linksSelectors.push(newId);
    }

    templateHtml = templateHtml.replace('id="' + id + '"', 'id="' + newId + '"');

   }

   return templateHtml;

  },

   createUniqueSelectors: function (templateHtml) {

    var selectors = {
        names: {},
        forms: {}
    };

    var eventsSelectors = [];
    var linksSelectors = [];

    templateHtml = this.createNamesSelectors(templateHtml, selectors);
    templateHtml = this.createIdSelectors(templateHtml, selectors, eventsSelectors, linksSelectors);

    return {
      html: templateHtml,
      selectors: selectors,
      eventsSelectors: eventsSelectors,
      linksSelectors: linksSelectors
    };

  },


});spike.core.Assembler.createStaticClass('spike.core','Util', null,{

        toCamelCase: function (str) {

            if (Util.isEmpty(str)) {
                return str;
            }

            str = str.split('-').join(' ');

            return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
                if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
                return index === 0 ? match.toLowerCase() : match.toUpperCase();
            });

        },

        copyArray: function (oldArray) {
            return JSON.parse(JSON.stringify(oldArray));
        },

        currentDateLog: function () {
            return new Date().toLocaleTimeString();
        },

        bindStringParams: function (string, objectOrArrayParams, noStringify) {

            if (!string) {
                return '';
            }

            if (string.indexOf('{') === -1 || !objectOrArrayParams) {
                return string;
            }

            try {

                if (objectOrArrayParams instanceof Array) {

                    for (var i = 0; i < objectOrArrayParams.length; i++) {
                        string = string.replace('{' + i + '}', noStringify ? objectOrArrayParams[i] : JSON.stringify(objectOrArrayParams[i]))
                    }

                } else {

                    for (var paramName in objectOrArrayParams) {
                        string = string.replace('{' + paramName + '}', noStringify ? objectOrArrayParams[paramName] : JSON.stringify(objectOrArrayParams[paramName]));
                    }

                }

            } catch (err) {
            }

            return string;

        },

        isFunction: function (functionToCheck) {
            var getType = {};
            return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
        },

        isObject: function (object) {

            if (Util.isNull(object)) {
                return false;
            }

            if (object.toString() === '[object Object]') {
                return true;
            }

            return false;

        },

        parseJSON: function (s) {

            s = s.replace(/\\n/g, "\\n")
                .replace(/\\'/g, "\\'")
                .replace(/\\"/g, '\\"')
                .replace(/\\&/g, "\\&")
                .replace(/\\r/g, "\\r")
                .replace(/\\t/g, "\\t")
                .replace(/\\b/g, "\\b")
                .replace(/\\f/g, "\\f");
            s = s.replace(/[\u0000-\u0019]+/g, "");
            var o = JSON.parse(s);

            return o;
        },

        isEmpty: function (obj) {

            if (obj === undefined || obj === null) {
                return true;
            }

            if (typeof obj === 'string') {
                if (obj.trim().length === 0) {
                    return true;
                }
            }

            return false;

        },

        tryParseNumber: function (obj) {

            if (!Util.isEmpty(obj) && $.isNumeric(obj)) {

                if(obj.indexOf('e') > -1 || obj.indexOf('E') > -1){
                    return obj;
                }

                if (Util.isInt(parseFloat(obj))) {
                    return parseInt(obj, 10);
                } else {
                    return parseFloat(obj);
                }

            }

            return obj;


        },

        isInt: function (n) {
            return Number(n) === n && n % 1 === 0;
        },

        isFloat: function (n) {
            return Number(n) === n && n % 1 !== 0;
        },

        isNull: function (obj) {

            if (obj === undefined || obj === null) {
                return true;
            }

            return false;

        },

        preparePathDottedParams: function (url, params) {

            for (var prop in params) {
                url = url.replace(':' + prop, params[prop]);
            }

            return url;

        },

        removeUndefinedPathParams: function (url) {
            return url.split('/undefined').join('').split('/null').join('');
        },

        prepareUrlParams: function (url, params) {

            var i = 0;
            for (var prop in params) {

                if (i === 0) {
                    url = url + '?' + prop + '=' + params[prop];
                } else {
                    url = url + '&' + prop + '=' + params[prop];
                }

                i++;

            }

            return url;

        },

        findStringBetween: function (str, first, last) {

            var r = new RegExp(first + '(.*?)' + last, 'gm');
            var arr = str.match(r);

            if (arr === null || arr.length === 0) {
                return [];
            }

            var arr2 = [];

            for (var i = 0; i < arr.length; i++) {
                arr2.push(arr[i].replace(first, '').replace(last, ''));
            }

            return arr2;

        },

        hash: function () {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for (var i = 0; i < 10; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        },

        escapeQuotes: function (text) {

            try {
              text = text.replace(/"/g, "&quot;").replace(/'/g, "&quot;");
            } catch (err) {
                Log.warn('Could not escape single quotes in string: ' + text);
            }

            return text;

        },

        bindTranslationParams: function (string, objectOrArrayParams) {

                if(!string){
                    return '';
                }

                if(string.indexOf('{') === -1 || !objectOrArrayParams){
                    return string;
                }

                if (objectOrArrayParams instanceof Array) {

                    for (var i = 0; i < objectOrArrayParams.length; i++) {
                        string = string.replace('{' + i + '}', objectOrArrayParams[i])
                    }

                } else {

                    for (var paramName in objectOrArrayParams) {
                        string = string.replace('{' + paramName + '}', objectOrArrayParams[paramName]);
                    }

                }

                return string;

            },

});spike.core.Assembler.defineNamespace('spike.core',['Request_config','Request'], function(){spike.core.Request_config = function(config){spike.core.Request.prototype = new spike.core.Request();

        this.config = this.setConfig(config);
        this.xhr = this.createXHR();

        this.setEvents();
        this.setHeaders();

        this.config.beforeSend();
        this.xhr.send(this.config.data);

    };spike.core.Request_config.prototype.config= null;spike.core.Request_config.prototype.xhr= null;spike.core.Request_config.prototype.catchCallbacks= [];spike.core.Request_config.prototype.thenCallbacks= [];spike.core.Request_config.prototype.response= null;spike.core.Request_config.prototype.responseType= 'json';spike.core.Request_config.prototype.STATUS= {
        DONE: 4,
        LOADING: 3,
        HEADERS_RECEIVED: 2,
        OPENED: 1,
        UNSENT: 0
    };spike.core.Request_config.prototype.setConfig= function(config){

        if(config === undefined || config === null){
            spike.core.Errors.throwError(spike.core.Errors.messages.REQUEST_WRONG_PARAMS, []);
        }

        if(config.url === undefined || config.type === undefined){
            spike.core.Errors.throwError(spike.core.Errors.messages.REQUEST_WRONG_PARAMS, []);
        }

        if(config.headers === undefined){
            config.headers = {};
        }

        if(config.contentType === undefined){
            config.headers['Content-Type'] = 'application/json';
        }

        if(config.data === undefined){
            config.data = {};
        }

        if(typeof config.data === 'string'){

            try {
                config.data = JSON.parse(config.data);
            }catch(e){
                spike.core.Errors.thrownError(spike.core.Errors.JSON_PARSE_ERROR, [config.url]);
            }

        }

        if(config.beforeSend === undefined){
            config.beforeSend = function() { };
        }

        if(config.complete === undefined){
            config.complete = function() { };
        }

        return config;

    };spike.core.Request_config.prototype.setEvents= function(){

        this.xhr.open(this.config.type, this.config.url, true);

        var self = this;
        this.xhr.onreadystatechange = function() {

             if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status === 200) {

                if(self.responseType === 'json'){

                    try {
                        self.response = JSON.parse(self.xhr.responseText);
                        self.resolveThen(self.response, self.xhr, self.xhr.status);
                    }catch(e){
                        self.resolveCatch(self.xhr, 0, e);
                    }


                }else if(self.responseType === 'xml'){
                    self.resolveThen(self.xhr.responseXML, self.xhr, self.xhr.status);
                }

              }else if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status === 204){
                self.resolveThen(null, self.xhr, self.xhr.status);
              }else if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status !== 200){
                self.resolveCatch(self.xhr, self.xhr.status, new Error('Response error: '+self.xhr.status));
              }

        };


    };spike.core.Request_config.prototype.setHeaders= function(){

        this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        for(var headerName in this.config.headers){
            this.xhr.setRequestHeader(headerName, this.config.headers[headerName]);
        }

        if(this.config.headers['Content-Type'].indexOf('xml') > -1){
            this.responseType = 'xml';
        }

    };spike.core.Request_config.prototype.then= function (callback) {
        this.thenCallbacks.push(callback);
        return this;
    };spike.core.Request_config.prototype.resolveThen= function(response, xhr, status){

        for(var i = 0; i < this.thenCallbacks.length; i++){
            this.thenCallbacks[i](response, xhr, status);
        }

    };spike.core.Request_config.prototype.catch= function (callback) {
        this.catchCallbacks.push(callback);
        return this;
    };spike.core.Request_config.prototype.resolveCatch= function(xhr, status, thrownError){

        for(var i = 0; i < this.catchCallbacks.length; i++){
            this.catchCallbacks[i](xhr, status, thrownError);
        }

    };spike.core.Request_config.prototype.createXHR= function() {

        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }

        return xhr;

    };spike.core.Request_config.prototype.getSuper = function(){ return 'spike.core.Request'; };spike.core.Request_config.prototype.getClass = function(){ return 'spike.core.Request'; };spike.core.Request = function(){    };spike.core.Request_config.prototype.config= null;spike.core.Request.prototype.config= null;spike.core.Request_config.prototype.xhr= null;spike.core.Request.prototype.xhr= null;spike.core.Request_config.prototype.catchCallbacks= [];spike.core.Request.prototype.catchCallbacks= [];spike.core.Request_config.prototype.thenCallbacks= [];spike.core.Request.prototype.thenCallbacks= [];spike.core.Request_config.prototype.response= null;spike.core.Request.prototype.response= null;spike.core.Request_config.prototype.responseType= 'json';spike.core.Request.prototype.responseType= 'json';spike.core.Request_config.prototype.STATUS= {
        DONE: 4,
        LOADING: 3,
        HEADERS_RECEIVED: 2,
        OPENED: 1,
        UNSENT: 0
    };spike.core.Request.prototype.STATUS= {
        DONE: 4,
        LOADING: 3,
        HEADERS_RECEIVED: 2,
        OPENED: 1,
        UNSENT: 0
    };spike.core.Request_config.prototype.setConfig= function(config){

        if(config === undefined || config === null){
            spike.core.Errors.throwError(spike.core.Errors.messages.REQUEST_WRONG_PARAMS, []);
        }

        if(config.url === undefined || config.type === undefined){
            spike.core.Errors.throwError(spike.core.Errors.messages.REQUEST_WRONG_PARAMS, []);
        }

        if(config.headers === undefined){
            config.headers = {};
        }

        if(config.contentType === undefined){
            config.headers['Content-Type'] = 'application/json';
        }

        if(config.data === undefined){
            config.data = {};
        }

        if(typeof config.data === 'string'){

            try {
                config.data = JSON.parse(config.data);
            }catch(e){
                spike.core.Errors.thrownError(spike.core.Errors.JSON_PARSE_ERROR, [config.url]);
            }

        }

        if(config.beforeSend === undefined){
            config.beforeSend = function() { };
        }

        if(config.complete === undefined){
            config.complete = function() { };
        }

        return config;

    };spike.core.Request.prototype.setConfig= function(config){

        if(config === undefined || config === null){
            spike.core.Errors.throwError(spike.core.Errors.messages.REQUEST_WRONG_PARAMS, []);
        }

        if(config.url === undefined || config.type === undefined){
            spike.core.Errors.throwError(spike.core.Errors.messages.REQUEST_WRONG_PARAMS, []);
        }

        if(config.headers === undefined){
            config.headers = {};
        }

        if(config.contentType === undefined){
            config.headers['Content-Type'] = 'application/json';
        }

        if(config.data === undefined){
            config.data = {};
        }

        if(typeof config.data === 'string'){

            try {
                config.data = JSON.parse(config.data);
            }catch(e){
                spike.core.Errors.thrownError(spike.core.Errors.JSON_PARSE_ERROR, [config.url]);
            }

        }

        if(config.beforeSend === undefined){
            config.beforeSend = function() { };
        }

        if(config.complete === undefined){
            config.complete = function() { };
        }

        return config;

    };spike.core.Request_config.prototype.setEvents= function(){

        this.xhr.open(this.config.type, this.config.url, true);

        var self = this;
        this.xhr.onreadystatechange = function() {

             if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status === 200) {

                if(self.responseType === 'json'){

                    try {
                        self.response = JSON.parse(self.xhr.responseText);
                        self.resolveThen(self.response, self.xhr, self.xhr.status);
                    }catch(e){
                        self.resolveCatch(self.xhr, 0, e);
                    }


                }else if(self.responseType === 'xml'){
                    self.resolveThen(self.xhr.responseXML, self.xhr, self.xhr.status);
                }

              }else if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status === 204){
                self.resolveThen(null, self.xhr, self.xhr.status);
              }else if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status !== 200){
                self.resolveCatch(self.xhr, self.xhr.status, new Error('Response error: '+self.xhr.status));
              }

        };


    };spike.core.Request.prototype.setEvents= function(){

        this.xhr.open(this.config.type, this.config.url, true);

        var self = this;
        this.xhr.onreadystatechange = function() {

             if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status === 200) {

                if(self.responseType === 'json'){

                    try {
                        self.response = JSON.parse(self.xhr.responseText);
                        self.resolveThen(self.response, self.xhr, self.xhr.status);
                    }catch(e){
                        self.resolveCatch(self.xhr, 0, e);
                    }


                }else if(self.responseType === 'xml'){
                    self.resolveThen(self.xhr.responseXML, self.xhr, self.xhr.status);
                }

              }else if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status === 204){
                self.resolveThen(null, self.xhr, self.xhr.status);
              }else if(self.xhr.readyState === self.STATUS.DONE && self.xhr.status !== 200){
                self.resolveCatch(self.xhr, self.xhr.status, new Error('Response error: '+self.xhr.status));
              }

        };


    };spike.core.Request_config.prototype.setHeaders= function(){

        this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        for(var headerName in this.config.headers){
            this.xhr.setRequestHeader(headerName, this.config.headers[headerName]);
        }

        if(this.config.headers['Content-Type'].indexOf('xml') > -1){
            this.responseType = 'xml';
        }

    };spike.core.Request.prototype.setHeaders= function(){

        this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        for(var headerName in this.config.headers){
            this.xhr.setRequestHeader(headerName, this.config.headers[headerName]);
        }

        if(this.config.headers['Content-Type'].indexOf('xml') > -1){
            this.responseType = 'xml';
        }

    };spike.core.Request_config.prototype.then= function (callback) {
        this.thenCallbacks.push(callback);
        return this;
    };spike.core.Request.prototype.then= function (callback) {
        this.thenCallbacks.push(callback);
        return this;
    };spike.core.Request_config.prototype.resolveThen= function(response, xhr, status){

        for(var i = 0; i < this.thenCallbacks.length; i++){
            this.thenCallbacks[i](response, xhr, status);
        }

    };spike.core.Request.prototype.resolveThen= function(response, xhr, status){

        for(var i = 0; i < this.thenCallbacks.length; i++){
            this.thenCallbacks[i](response, xhr, status);
        }

    };spike.core.Request_config.prototype.catch= function (callback) {
        this.catchCallbacks.push(callback);
        return this;
    };spike.core.Request.prototype.catch= function (callback) {
        this.catchCallbacks.push(callback);
        return this;
    };spike.core.Request_config.prototype.resolveCatch= function(xhr, status, thrownError){

        for(var i = 0; i < this.catchCallbacks.length; i++){
            this.catchCallbacks[i](xhr, status, thrownError);
        }

    };spike.core.Request.prototype.resolveCatch= function(xhr, status, thrownError){

        for(var i = 0; i < this.catchCallbacks.length; i++){
            this.catchCallbacks[i](xhr, status, thrownError);
        }

    };spike.core.Request_config.prototype.createXHR= function() {

        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }

        return xhr;

    };spike.core.Request.prototype.createXHR= function() {

        var xhr;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }

        return xhr;

    };spike.core.Request.prototype.getSuper = function(){ return 'spike.core.Request'; };spike.core.Request.prototype.getClass = function(){ return 'spike.core.Request'; }; });spike.core.Assembler.createStaticClass('spike.core','spike.core.Rest', null,{

  cacheData: {},

  interceptors: {},

  globalInterceptors: {},

  interceptor: function (interceptorName, interceptorFunction, isGlobal) {

    if (isGlobal) {

      if (spike.core.Rest.globalInterceptors[interceptorName]) {
        spike.core.Errors.throwError(spike.core.Errors.messages.INTERCEPTOR_ALREADY_REGISTRED, [interceptorName]);
      }

      spike.core.Rest.globalInterceptors[interceptorName] = interceptorFunction;

    } else {

      if (spike.core.Rest.interceptors[interceptorName]) {
        spike.core.Errors.throwError(spike.core.Errors.messages.INTERCEPTOR_ALREADY_REGISTRED, [interceptorName]);
      }

      spike.core.Rest.interceptors[interceptorName] = interceptorFunction;

    }

  },

  invokeInterceptors: function (requestData, response, promise, interceptors) {

    if (interceptors) {

      for (var i = 0; i < interceptors.length; i++) {

        if (!spike.core.Rest.interceptors[interceptors[i]]) {
          spike.core.Errors.throwWarn(spike.core.Errors.messages.INTERCEPTOR_NOT_EXISTS, [interceptors[i]]);
        } else {
          spike.core.Rest.interceptors[interceptors[i]](response, promise, requestData);
        }

      }

    }

    for (var interceptorName in spike.core.Rest.globalInterceptors) {
      spike.core.Rest.globalInterceptors[interceptorName](response, promise, requestData);
    }

  },

  createCachedPromise: function (url, method, interceptors) {

    var data = spike.core.Rest.cacheData[url + '_' + method].data;

    var promise = {
      result: data,
      then: function (callback) {

        if (promise.result) {
          data = promise.result;
        }

        var _result = callback(data);

        if (_result) {
          promise.result = _result;
        }

        return promise;

      },
      catch: function () {
        return promise;
      }
    };

    spike.core.Rest.invokeInterceptors({}, data, promise, interceptors);

    return promise;


  },

  isCached: function (url, method) {

    var data = spike.core.Rest.cacheData[url + '_' + method];

    if (Util.isNull(data)) {
      return false;
    }

    if (data.filled === false) {
      return false;
    }

    if (data.cacheType === 'TIME') {

      if (data.cacheTime + data.cachePeriod < new Date().getTime()) {
        return false;
      }

      return true;

    } else if (data.cacheType === 'PERSIST') {
      return true;
    }

    return false;

  },

  get: function (url, propertiesObject) {

    propertiesObject = propertiesObject || {};

    if (typeof url === 'string') {

      if (spike.core.Rest.isCached(url, 'GET', propertiesObject)) {
        return spike.core.Rest.createCachedPromise(url, 'GET', propertiesObject.interceptors || []);
      } else {
        return spike.core.Rest.getDelete(url, 'GET', propertiesObject);
      }

    } else {
      spike.core.Errors.throwWarn(spike.core.Errors.messages.CACHED_PROMISE_DEPRECADES);
    }

  },

  delete: function (url, propertiesObject) {

    propertiesObject = propertiesObject || {};

    if (typeof url === 'string') {

      if (spike.core.Rest.isCached(url, 'DELETE', propertiesObject)) {
        return spike.core.Rest.createCachedPromise(url, 'DELETE', propertiesObject.interceptors || []);
      } else {
        return spike.core.Rest.getDelete(url, 'DELETE', propertiesObject);
      }

    } else {
      spike.core.Errors.throwWarn(spike.core.Errors.messages.CACHED_PROMISE_DEPRECADES);
    }


  },

  update: function (url, request, propertiesObject) {

    propertiesObject = propertiesObject || {};

    if (typeof url === 'string') {

      if (spike.core.Rest.isCached(url, 'PUT', propertiesObject)) {
        return spike.core.Rest.createCachedPromise(url, 'PUT', propertiesObject.interceptors || []);
      } else {
        return spike.core.Rest.postPut(url, 'PUT', request, propertiesObject);
      }

    } else {
      spike.core.Errors.throwWarn(spike.core.Errors.messages.CACHED_PROMISE_DEPRECADES);
    }

  },

  put: function (url, request, propertiesObject) {
    return spike.core.Rest.update(url, request, propertiesObject);
  },


  post: function (url, request, propertiesObject) {

    propertiesObject = propertiesObject || {};

    if (typeof url === 'string') {

      if (spike.core.Rest.isCached(url, 'POST', propertiesObject)) {
        return spike.core.Rest.createCachedPromise(url, 'POST', propertiesObject.interceptors || []);
      } else {
        return spike.core.Rest.postPut(url, 'POST', request, propertiesObject);
      }

    } else {
      spike.core.Errors.throwWarn(spike.core.Errors.messages.CACHED_PROMISE_DEPRECADES);
    }

  },

  getDelete: function (url, method, propertiesObject) {

    var pathParams = propertiesObject.pathParams;
    var headers = propertiesObject.headers;
    var urlParams = propertiesObject.urlParams;
    var interceptors = propertiesObject.interceptors || [];

    var preparedUrl = url;

    if (pathParams !== undefined && pathParams !== null) {
      preparedUrl = Util.preparePathDottedParams(url, pathParams);

      if (preparedUrl.indexOf('/undefined') > -1 || preparedUrl.indexOf('/null') > -1) {
        spike.core.Errors.throwWarn(spike.core.Errors.messages.REST_API_NULL_PATHPARAM, [preparedUrl]);
        preparedUrl = Util.removeUndefinedPathParams(preparedUrl);
      }

    }

    if (urlParams !== undefined && urlParams !== null) {
      preparedUrl = Util.prepareUrlParams(preparedUrl, urlParams);
    }

    var dataType = "json";
    var contentType = "application/json; charset=utf-8";

    if (!Util.isNull(propertiesObject.cache) && Util.isNull(spike.core.Rest.cacheData[url + '_' + method])) {
      spike.core.Rest.createCacheObject(url, method, propertiesObject.cache);
    }

    var promiseObj = {
      url: preparedUrl,
      type: method,
      beforeSend: function () {

      },
      complete: function (xhr) {

        if (!Util.isNull(propertiesObject.cache)) {
          spike.core.Rest.fillCache(url, method, xhr.responseJSON);
        }

      }

    };

    if(propertiesObject.async !== undefined){
      promiseObj.async = propertiesObject.async;
    }

    if (!headers) {
      headers = {}
    }

    if (headers['Content-Type'] !== null && headers['Content-Type'] !== undefined) {
      contentType = headers['Content-Type'];
    }

    if (headers['Data-Type'] !== null && headers['Data-Type'] !== undefined) {
      dataType = headers['Data-Type'];
      headers['Data-Type'] = undefined;
    }


    if (headers['Content-Type'] !== null) {
      promiseObj.contentType = headers['Content-Type'] || contentType;
    }

    if (headers['Data-Type'] !== null) {
      promiseObj.dataType = headers['Data-Type'] || dataType;
      headers['Data-Type'] = undefined;
    }

    var newHeaders = {};
    for (var prop in headers) {
      if (headers[prop] !== undefined && headers[prop] !== null) {
        newHeaders[prop] = headers[prop];
      }
    }

    headers = newHeaders;


    promiseObj.headers = headers;


    var promise = new spike.core.Request_config(promiseObj);

    var requestData = {url: url, method: method, pathParams: pathParams, urlParams: urlParams, headers: headers};

    promise.then(function (result) {
      spike.core.Rest.invokeInterceptors(requestData, result, promise, interceptors);
    });

    promise.catch(function (error) {
      spike.core.Rest.invokeInterceptors(requestData, error, promise, interceptors);
    });

    return promise;


  },

  postPut: function (url, method, request, propertiesObject) {

    var pathParams = propertiesObject.pathParams;
    var headers = propertiesObject.headers;
    var urlParams = propertiesObject.urlParams;
    var interceptors = propertiesObject.interceptors || [];


    var jsonData = JSON.stringify(request);

    var preparedUrl = url;

    if (pathParams !== undefined && pathParams !== null) {
      preparedUrl = Util.preparePathDottedParams(url, pathParams);

      if (preparedUrl.indexOf('/undefined') > -1 || preparedUrl.indexOf('/null') > -1) {
        spike.core.Errors.throwWarn(spike.core.Errors.messages.REST_API_NULL_PATHPARAM, [preparedUrl]);
        preparedUrl = Util.removeUndefinedPathParams(preparedUrl);
      }

    }

    if (urlParams !== undefined && urlParams !== null) {
      preparedUrl = Util.prepareUrlParams(preparedUrl, urlParams);
    }

    var dataType = "json";
    var contentType = "application/json; charset=utf-8";

    if (!Util.isNull(propertiesObject.cache) && Util.isNull(spike.core.Rest.cacheData[url + '_' + method])) {
      spike.core.Rest.createCacheObject(url, method, propertiesObject.cache);
    }

    var promiseObj = {
      url: preparedUrl,
      data: jsonData,
      type: method,
      beforeSend: function () {

      },
      complete: function (xhr) {

        if (!Util.isNull(propertiesObject.cache)) {
          spike.core.Rest.fillCache(url, method, xhr.responseJSON);
        }

      }

    };

    if(propertiesObject.async !== undefined){
      promiseObj.async = propertiesObject.async;
    }

    if (!headers) {
      headers = {}
    }

    if (headers['Content-Type'] !== null && headers['Content-Type'] !== undefined) {
      contentType = headers['Content-Type'];
    }

    if (headers['Data-Type'] !== null && headers['Data-Type'] !== undefined) {
      dataType = headers['Data-Type'];
      headers['Data-Type'] = undefined;
    }


    if (headers['Content-Type'] !== null) {
      promiseObj.contentType = headers['Content-Type'] || contentType;
    }

    if (headers['Data-Type'] !== null) {
      promiseObj.dataType = headers['Data-Type'] || dataType;
      headers['Data-Type'] = undefined;
    }

    var newHeaders = {};
    for (var prop in headers) {
      if (headers[prop] !== undefined && headers[prop] !== null) {
        newHeaders[prop] = headers[prop];
      }
    }

    headers = newHeaders;
    promiseObj.headers = headers;

    var promise = new spike.core.Request_config(promiseObj);

    var requestData = {
      url: url,
      method: method,
      request: request,
      pathParams: pathParams,
      urlParams: urlParams,
      headers: headers
    };

    promise.then(function (result) {
      spike.core.Rest.invokeInterceptors(requestData, result, promise, interceptors);
    });

    promise.catch(function (error) {
      spike.core.Rest.invokeInterceptors(requestData, error, promise, interceptors);
    });

    return promise;

  },

  fillCache: function (url, method, data) {

    spike.core.Rest.cacheData[url + '_' + method].filled = true;
    spike.core.Rest.cacheData[url + '_' + method].data = data;
    spike.core.Rest.cacheData[url + '_' + method].cacheTime = new Date().getTime();

  },

  createCacheObject: function (url, method, cache) {

    spike.core.Rest.cacheData[url + '_' + method] = {
      filled: false,
      cacheTime: new Date().getTime(),
      cacheType: cache === true ? 'PERSIST' : 'TIME',
      cachePeriod: cache === true ? null : cache,
      data: null
    };

  },


});spike.core.Assembler.createStaticClass('spike.core','spike.core.Message', null,{

    waitingForTranslations: {},

    messages: {},

    add: function (languageName, languageFilePath) {

        spike.core.Log.log('register translation {0}', [languageName]);

        this.waitingForTranslations[languageName] = false;

        var promise = new spike.core.Request_config({
            url: languageFilePath,
            type: 'GET'
        });

        promise.then(function (data) {

            spike.core.Message.setTranslation(languageName, data);
            return data;

        });

        promise.catch(function (error) {

            if (error.status === 200) {
                spike.core.Message.setTranslation(languageName, error.responseText);
            } else {
                spike.core.Message.messages[languageName] = {};
                Errors.throwWarn(Errors.messages.TRANSLATION_LOAD_WARN, [languageName, error.status]);
            }

            return error;

        });

        return promise;

    },

    setTranslation: function (languageName, translationData) {

        if (typeof translationData === 'string') {

            try {
                translationData = JSON.parse(translationData);
            } catch (err) {
                Errors.throwError(Errors.messages.TRANSLATION_PARSING, [languageName]);
            }

        }

        spike.core.Message.messages[languageName] = translationData;
        spike.core.Message.waitingForTranslations[languageName] = true;
    },


    get: function (messageName, arrayOrMapParams) {

        var message = this.messages[Config.lang][messageName];
        if(!message){
            Errors.throwWarn(Errors.messages.TRANSLATION_MESSAGE_NOT_FOUND, [messageName])
        }

        if(arrayOrMapParams && message){
            message = spike.core.Util.bindTranslationParams(message, arrayOrMapParams);
        }

        return message || messageName;
    }

});spike.core.Assembler.createStaticClass('spike.core','Templates', null,{

    templates: {},

    compileTemplate: function(element, name, model){
        return this.templates[name](element, model);
    },

});spike.core.Assembler.createStaticClass('spike.core','spike.core.Router', null,{

  preventReloadPage: null,

  events: {},

  otherwiseReplacement: '!',

  pathParamReplacement: 'var',

  endpoints: {},

  routerHTML5Mode: false,

  getRouterFactory: function () {
    return {
      path: spike.core.Router.pathFunction,
      other: spike.core.Router.otherFunction
    }
  },

  create: function () {
    return spike.core.Router.getRouterFactory();
  },

  otherFunction: function (pathObject) {
    return spike.core.Router.pathFunction(spike.core.Router.otherwiseReplacement, pathObject);
  },

  pathFunctionHandler: null,

  pathFunction: function (pathValue, pathObject) {

    if (spike.core.Util.isEmpty(pathValue) || spike.core.Util.isNull(pathObject)) {
      spike.core.Errors.throwError(spike.core.Errors.messages.PATH_DEFINITION);
    }

    if(spike.core.Router.pathFunctionHandler){
      pathValue = spike.core.Router.pathFunctionHandler(pathValue, pathObject);
    }

    spike.core.Router.registerPath(pathValue, pathObject.controller, pathObject.routingParams, pathObject.onRoute, pathObject.name, pathObject.modal, pathObject.defaultController);

    return spike.core.Router.getRouterFactory();

  },

  registerPath: function (pathValue, pathController, routingParams, onRouteEvent, routeName, pathModal, pathModalDefaultController) {

    if (spike.core.Router.endpoints[pathValue]) {
      spike.core.Errors.throwError(spike.core.Errors.messages.PATH_ALREADY_EXIST, [pathValue]);
    }

    if (routeName && spike.core.Router.routeNameExist(routeName)) {
      spike.core.Errors.throwError(spike.core.Errors.messages.ROUTE_NAME_EXIST, [routeName]);
    }

    var pathPattern = spike.core.Router.createPathPattern(pathValue);

    if (spike.core.Router.pathPatternExist(pathPattern)) {
      spike.core.Errors.throwError(spike.core.Errors.messages.PATH_PATTERN_ALREADY_EXIST, [pathValue, pathPattern.join("").split(spike.core.Router.pathParamReplacement).join("/PATH_PARAM")]);
    }

    spike.core.Router.endpoints[pathValue] = {
      pathValue: pathValue,
      controller: pathController,
      defaultController: pathModalDefaultController,
      modal: pathModal,
      routingParams: routingParams,
      onRouteEvent: onRouteEvent,
      pathPattern: pathPattern,
      routeName: routeName,
      isModal: !spike.core.Util.isEmpty(pathModal)
    };

  },

  byName: function (routeName) {

    for (var pathValue in spike.core.Router.endpoints) {

      if (spike.core.Router.endpoints[pathValue].routeName === routeName) {
        return pathValue;
      }

    }

    spike.core.Errors.throwError(spike.core.Errors.messages.ROUTE_NAME_NOT_EXIST, [routeName]);

  },

  routeNameExist: function (routeName) {

    for (var pathValue in spike.core.Router.endpoints) {

      if (spike.core.Router.endpoints[pathValue].routeName === routeName) {
        return true;
      }

    }

    return false;

  },

  pathPatternExist: function (pathPattern) {

    for (var pathValue in spike.core.Router.endpoints) {

      if (spike.core.Router.endpoints[pathValue].pathPattern.pattern.join("") === pathPattern.pattern.join("")) {
        return true;
      }

    }

    return false;

  },

  createPathPattern: function (pathValue) {

    var pathPattern = {
      pattern: [],
      pathParams: []
    };

    var split = pathValue.substring(0, pathValue.indexOf('?') > -1 ? pathValue.indexOf('?') : pathValue.length).split('/');

    for (var i = 0; i < split.length; i++) {

      if (split[i].indexOf(':') > -1) {
        pathPattern.pathParams.push(split[i].replace(':', ''));
        pathPattern.pattern.push(spike.core.Router.pathParamReplacement)
      } else if (split[i].trim().length > 0) {
        pathPattern.pattern.push(split[i])
      }

    }

    return pathPattern;

  },

  detectHTML5Mode: function () {

    if (window.history && window.history.pushState && spike.core.System.config.html5Mode === true) {
      spike.core.Router.routerHTML5Mode = true;
    }

  },

  registerRouter: function () {

     spike.core.Log.ok('HTML5 router mode status: {0}', [spike.core.Router.routerHTML5Mode]);

     if (spike.core.Util.isEmpty(spike.core.System.routing)) {
       spike.core.Errors.throwError(spike.core.Errors.messages.ROUTING_ENABLED_NOT_DEFINED, []);
     }

     if (spike.core.Router.routerHTML5Mode === false && window.location.hash.substring(0, 2) !== '#/') {
       window.location.hash = '#/';
     }

     spike.core.Router.renderCurrentView();

     if (spike.core.Router.routerHTML5Mode === false) {
       $(window).bind('hashchange', spike.core.Router.onHashChanges);
     }

  },

  onHashChanges: function (e) {

    spike.core.Log.debug('Executes spike.core.Router.onHashChanges');

    if (window.location.hash.replace('#', '') === spike.core.Router.preventReloadPage) {
      spike.core.Router.preventReloadPage = null;
      spike.core.Router.fireRouteEvents(e);
      return false;
    }

    spike.core.Router.clearCacheViewData();

    spike.core.Router.fireRouteEvents(e);
    spike.core.Router.renderCurrentView();

  },

  onHistoryChanges: function () {

    if (spike.core.Router.routerHTML5Mode === true) {

      spike.core.Log.debug('Executes spike.core.Router.onHistoryChanges');

      if (spike.core.Router.getPathName() === spike.core.Router.preventReloadPage) {
        spike.core.Router.preventReloadPage = null;
        spike.core.Router.fireRouteEvents({});
        return false;
      }

      spike.core.Router.clearCacheViewData();

      spike.core.Router.fireRouteEvents({});
      spike.core.Router.renderCurrentView();

    }

  },

  fireRouteEvents: function (e) {

    var currentRoute = spike.core.Router.getCurrentRoute();

    $.each(spike.core.Router.events, function (eventName, eventFunction) {

      if (eventFunction) {
        eventFunction(e, currentRoute, app.currentController);
      }

    });

  },


  onRouteChange: function (eventName, eventFunction) {

    if (spike.core.Router.events[eventName]) {
      spike.core.Errors.throwWarn(spike.core.Errors.messages.ROUTE_EVENT_ALREADY_REGISTRED, [eventName]);
    }

    spike.core.Router.events[eventName] = eventFunction;

  },

  offRouteChange: function (eventName) {

    if (spike.core.Router.events[eventName]) {
      spike.core.Router.events[eventName] = null;
    }

  },

  checkPathIntegrity: function (hashPattern, endpointPattern) {

    for (var i = 0; i < endpointPattern.pattern.length; i++) {

      if (endpointPattern.pattern[i] !== spike.core.Router.pathParamReplacement
        && endpointPattern.pattern[i] !== hashPattern.pattern[i]) {
        return false;
      }

    }

    return true;

  },

  getURLParams: function () {
    return spike.core.Router.getURLParams();
  },

  getURLParams: function () {

    var params = {};

    if (window.location.href.indexOf('?') > -1) {
      window.location.href.substring(window.location.href.indexOf('?'), window.location.href.length).replace(/[?&]+([^=&]+)=([^&]*)/gi, function (str, key, value) {
        params[key] = spike.core.Util.tryParseNumber(value);

        if (!spike.core.Util.isNull(params[key]) && typeof params[key] === 'string') {
          if (params[key].indexOf('#/') > -1) {
            params[key] = params[key].replace('#/', '');
          }
        }

      });
    }

    return params;

  },

  getPathParams: function () {
    return spike.core.Router.getCurrentViewData().data.pathParams;
  },

  getPathData: function (hashPattern, endpointPattern) {

    var urlParams = spike.core.Router.getURLParams();
    var pathParams = {};
    var pathParamsIndex = 0;
    for (var i = 0; i < endpointPattern.pattern.length; i++) {

      if (endpointPattern.pattern[i] === spike.core.Router.pathParamReplacement) {
        pathParams[endpointPattern.pathParams[pathParamsIndex]] = spike.core.Util.tryParseNumber(hashPattern.pattern[i]);
        pathParamsIndex++;
      }

    }

    return {
      urlParams: urlParams,
      pathParams: pathParams,
    };

  },

  clearCacheViewData: function () {

    spike.core.Router.getCurrentViewCache = null;
    spike.core.Router.getCurrentViewDataCache = null;

  },

  setCacheViewData: function(type, data) {

    if(type === 'DATA'){
      spike.core.Router.getCurrentViewDataCache = data;
      spike.core.Router.getCurrentViewDataRouteCache = spike.core.Router.getCurrentRoute();
    }else {
      spike.core.Router.getCurrentViewCache = data;
      spike.core.Router.getCurrentViewRouteCache = spike.core.Router.getCurrentRoute();
    }

  },

  getCurrentViewCache: null,

  getCurrentViewRouteCache: null,

  getCurrentView: function () {

    if (spike.core.Router.getCurrentViewCache !== null && spike.core.Router.getCurrentRoute() != spike.core.Router.getCurrentViewRouteCache) {
      spike.core.Log.debug('Using @getCurrentViewCache cache');
      return spike.core.Router.getCurrentViewCache;
    }

    var currentEndpointObject = spike.core.Router.getCurrentViewData();

    var currentEndpointData = currentEndpointObject.data;
    var currentEndpoint = currentEndpointObject.endpoint;

    if (currentEndpointData === null && spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement]) {

      currentEndpointData = {
        controller: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].controller,
        modal: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].modal,
        defaultController: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].defaultController,
        isModal: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].isModal,
        routingParams: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].routingParams,
        onRouteEvent: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].onRouteEvent,
        onRouteEventWithModal: spike.core.Router.endpoints[spike.core.Router.otherwiseReplacement].onRouteEvent,
      };

    } else {

      if (currentEndpointData.isModal === true && !spike.core.Util.isEmpty(app.previousController)) {
        currentEndpointData.controller = app.previousController;
      } else {
        currentEndpointData.controller = currentEndpoint.controller;
      }

      currentEndpointData.defaultController = currentEndpoint.defaultController;
      currentEndpointData.modal = currentEndpoint.modal;
      currentEndpointData.isModal = currentEndpoint.isModal;
      currentEndpointData.routingParams = currentEndpoint.routingParams;
      currentEndpointData.onRouteEvent = currentEndpoint.onRouteEvent;
      currentEndpointData.onRouteEventWithModal = function () {
        spike.core.System.render(currentEndpointData.modal, currentEndpointData, currentEndpointData.onRouteEvent);
      }

    }

    spike.core.Router.setCacheViewData('VIEW', currentEndpointData);

    return currentEndpointData;

  },

  getCurrentViewDataCache: null,

  getCurrentViewDataRouteCache: null,

  getCurrentViewData: function () {

    if (spike.core.Router.getCurrentViewDataCache !== null && spike.core.Router.getCurrentRoute() != spike.core.Router.getCurrentViewDataRouteCache) {
      spike.core.Log.debug('Using @getCurrentViewDataCache cache');
      return spike.core.Router.getCurrentViewDataCache;
    }

    var hash = null;

    if (spike.core.Router.routerHTML5Mode === false) {
      hash = window.location.hash.replace(/^#\//, '');
    } else if (spike.core.Router.getPathName().indexOf('/') > 0) {
      hash = '/' + spike.core.Router.getPathName();
    } else {
      hash = spike.core.Router.getPathName();
    }

    var hashPattern = spike.core.Router.createPathPattern(hash);

    var viewData = {
      endpoint: null,
      data: null
    };

    for (var pathValue in spike.core.Router.endpoints) {

      if (spike.core.Router.endpoints[pathValue].pathPattern.pattern.length === hashPattern.pattern.length
        && spike.core.Router.checkPathIntegrity(hashPattern, spike.core.Router.endpoints[pathValue].pathPattern)) {
        var currentEndpoint = spike.core.Router.endpoints[pathValue];
        var currentEndpointData = spike.core.Router.getPathData(hashPattern, spike.core.Router.endpoints[pathValue].pathPattern);

        if (currentEndpoint.isModal === true) {

          if (spike.core.Util.isEmpty(app.previousController)) {
            currentEndpoint.controller = currentEndpoint.defaultController;
          } else {
            currentEndpoint.controller = app.previousController;
          }

        }

        viewData = {
          endpoint: currentEndpoint,
          data: currentEndpointData
        };

        break;

      }

    }

    spike.core.Router.setCacheViewData('DATA', viewData);

    return viewData;

  },

  setPathParams: function (pathParams) {

    var currentViewData = spike.core.Router.getCurrentViewData();

    for (var pathParam in pathParams) {

      if (currentViewData.data.pathParams[pathParam]
        && !spike.core.Util.isNull(pathParams[pathParam])) {
        currentViewData.data.pathParams[pathParam] = pathParams[pathParam];
      }

    }

    spike.core.Router.redirectToView(currentViewData.endpoint.pathValue, currentViewData.data.pathParams, currentViewData.data.urlParams, true);


  },

  setURLParams: function (urlParams) {

    var currentViewData = spike.core.Router.getCurrentViewData();

    var newURLParams = {};

    for (var urlParam in urlParams) {

      if (urlParams[urlParam] !== null) {
        newURLParams[urlParam] = urlParams[urlParam];
      }

    }

    currentViewData.data.urlParams = newURLParams;

    spike.core.Router.redirectToView(currentViewData.endpoint.pathValue, currentViewData.data.pathParams, currentViewData.data.urlParams, true);

  },

  getCurrentRoute: function () {

    if (spike.core.Router.routerHTML5Mode === true) {
      return spike.core.Router.getPathName().substring(1, spike.core.Router.getPathName().length);
    }

    return window.location.hash.replace('#/', '');

  },

  redirectToViewHandler: null,

  redirectToView: function (path, pathParams, urlParams, preventReloadPage) {

    spike.core.Router.clearCacheViewData();

    if (!path) {
      spike.core.Errors.throwError(spike.core.Errors.messages.REDIRECT_NO_PATH);
    }

    path = path.replace('#/', '/');

    if (path[0] !== '/') {
      path = '/' + path;
    }

    path = spike.core.Util.preparePathDottedParams(path, pathParams);
    path = spike.core.Util.prepareUrlParams(path, urlParams);

    if(spike.core.Router.redirectToViewHandler){
     path = spike.core.Router.redirectToViewHandler(path, pathParams, urlParams, preventReloadPage);
    }
    if (preventReloadPage === true) {
      spike.core.Router.preventReloadPage = path;
    }

    if (spike.core.Router.routerHTML5Mode === true) {
      spike.core.Router.pushState(path);
    } else {
      window.location.hash = path;
    }

  },

  pushState: function (path) {
    history.pushState({state: path}, null, path);
  },

  getViewData: function () {
    var currentViewData = spike.core.Router.getCurrentViewData();
    return $.extend({}, currentViewData.endpoint, currentViewData.data);
  },

  reloadView: function () {
    spike.core.Router.renderCurrentView();
  },

  renderCurrentView: function () {

    var currentEndpointData = spike.core.Router.getCurrentView();
    spike.core.Log.debug('current view to render {0}', [currentEndpointData]);

    if (currentEndpointData.isModal === true) {

      spike.core.Log.debug('rendering controller & modal, previous controller: ' + app.previousController);

      if (app.previousController === null) {

        spike.core.Log.debug('rendering controller & modal, default controller: ' + currentEndpointData.defaultController);

        spike.core.System.render(currentEndpointData.defaultController, currentEndpointData, currentEndpointData.onRouteEventWithModal);
      } else {
        spike.core.System.render(currentEndpointData.modal, currentEndpointData, currentEndpointData.onRouteEvent);
        spike.core.Router.refreshCurrentHyperlinkCache();
      }

    } else {
      spike.core.System.render(currentEndpointData.controller, currentEndpointData, currentEndpointData.onRouteEvent);
    }

    app.previousController = currentEndpointData.controller;

  },

  refreshCurrentHyperlinkCache: function () {

    var currentEndpoint = spike.core.Router.getCurrentViewData();

    var timestamp = new Date().getTime();

    $('a[href*="' + spike.core.Router.getPathValueWithoutParams(currentEndpoint.endpoint.pathValue) + '"]').each(function () {

      var hyperLinkUrl = $(this).attr('href');

      if (hyperLinkUrl.indexOf('?') > -1) {
        hyperLinkUrl += '&t=' + timestamp;
      } else {
        hyperLinkUrl += '?t=' + timestamp;
      }

      $(this).attr('href', hyperLinkUrl);

    });

  },

  getPathValueWithoutParams: function (pathValue) {

    if (pathValue.indexOf(':') > -1) {
      return pathValue.substring(0, pathValue.indexOf(':'));
    }

    return pathValue;

  },

  redirect: function (path, pathParams, urlParams, preventReloadPage) {
    spike.core.Router.redirectToView(path, pathParams, urlParams, preventReloadPage);
  },

  redirectByName: function (routeName, pathParams, urlParams, preventReloadPage) {
    spike.core.Router.redirectToView(spike.core.Router.byName(routeName), pathParams, urlParams, preventReloadPage);
  },

  location: function (url, redirectType) {

    spike.core.Router.clearCacheViewData();

    if (redirectType) {

      redirectType = redirectType.toLowerCase();

      if (redirectType.indexOf('blank') > -1) {
        redirectType = '_blank';
      } else if (redirectType.indexOf('self') > -1) {
        redirectType = '_self';
      } else if (redirectType.indexOf('parent') > -1) {
        redirectType = '_parent';
      } else if (redirectType.indexOf('top') > -1) {
        redirectType = '_top';
      }

      window.open(url, redirectType);

    } else {
      window.location = url;
    }

  },

  createLinkHandler: null,

  createLink: function (path, pathParams, urlParams) {

    if (spike.core.Router.routerHTML5Mode === false) {

      if (path.substring(0, 1) === '/') {
        path = '#' + path;
      } else if (path.substring(0, 1) !== '#') {
        path = '#/' + path;
      }

    }

    path = spike.core.Util.preparePathDottedParams(path, pathParams);
    path = spike.core.Util.prepareUrlParams(path, urlParams);

    if(spike.core.Router.createLinkHandler){
      path = spike.core.Router.createLinkHandler(path, pathParams, urlParams);
    }

    return path;

  },

  back: function () {
    window.history.go(-1);
  },

  getPathName: function(){
    return window.location.pathname;
  },

  bindLinks: function(element){

    for(var i = 0; i < element.childElements.length; i++){

        this.bindLinksForElement(element.childElements[i]);

        if(element.childElements[i].length > 0){
            this.bindEvents(element.childElements[i]);
        }

    }

  },

  bindLinksForElement: function (element) {

    for(var i = 0; i < element.linksSelectors.length; i++){

        var selector = document.getElementById(element.linksSelectors[i]);

        element.addEventListener('click', function (e) {
            e.preventDefault();

            var link = this.getAttribute('href');

            if (spike.core.Router.routerHTML5Mode === true) {
              link = link.replace('#', '');

              if (link.trim() === '') {
                link = '/';
              }

            } else {

              if (link.trim() === '') {
                link = '/#/';
              }

            }

            if (link.indexOf('www') > -1 || link.indexOf('http') > -1) {
              spike.core.Router.location(link,this.getAttribute('target') || '_blank');
            } else {
              spike.core.Router.redirect(link);
            }

        });

    }

  }

});spike.core.Assembler.defineNamespace('spike.core',['Element_parentElement_model','Element'], function(){spike.core.Element_parentElement_model = function(parentElement, model){spike.core.Element.prototype = new spike.core.Element();

        this.parentElement = parentElement;
        this.model = model;

        this.createTemplatePath();
        this.createTemplate();



    };spike.core.Element_parentElement_model.prototype.rendered= false;spike.core.Element_parentElement_model.prototype.model= null;spike.core.Element_parentElement_model.prototype.elementId= null;spike.core.Element_parentElement_model.prototype.elementSelector= null;spike.core.Element_parentElement_model.prototype.compiledHtml= null;spike.core.Element_parentElement_model.prototype.parentElement= null;spike.core.Element_parentElement_model.prototype.childElements= [];spike.core.Element_parentElement_model.prototype.selector= {};spike.core.Element_parentElement_model.prototype.eventsSelectors= [];spike.core.Element_parentElement_model.prototype.linksSelectors= [];spike.core.Element_parentElement_model.prototype.rootSelector= function(){

        if(this.elementSelector === null){
            this.elementSelector = document.getElementById(this.elementId);
        }

        return document.getElementById(elementId);
    };spike.core.Element_parentElement_model.prototype.include= function(childElement){

        this.childElements.push(childElement);
        this.createTemplatePath();
        this.createTemplate();

        return this.compiledHtml;

    };spike.core.Element_parentElement_model.prototype.createTemplatePath= function(){

        this.templatePath = '';

        var elementPath = this.getClass().split('.');

        for(var i = 0; i < elementPath.length; i++){
            this.templatePath += elementPath[i].toLowerCase()+'/';
        }

        this.templatePath = this.templatePath.substring(0, this.templatePath.lastIndexOf('/')-1)+'.html';

        return this.templatePath;

    };spike.core.Element_parentElement_model.prototype.createTemplate= function () {

     try {
        this.compiledHtml = spike.core.Templates.compileTemplate(this, this.templatePath);
     }catch (err){
        Errors.throwError('Error occur when executing component {0} template {1}', [this.getClass(), this.templatePath]);
     }

     var selectorsObj = spike.core.System.createUniqueSelectors(this.compiledHtml);

     this.compiledHtml = selectorsObj.html;
     this.selector = selectorsObj.selectors;
     this.eventsSelectors = selectorsObj.eventsSelectors;
     this.linksSelectors = selectorsObj.linksSelectors;


    };spike.core.Element_parentElement_model.prototype.render= function () {
    };spike.core.Element_parentElement_model.prototype.reloadComponent= function(component, componentData){
    };spike.core.Element_parentElement_model.prototype.replaceWith= function () {

        var elementDiv = document.createElement("div");
        elementDiv.innerHTML = this.compiledHtml;
        elementDiv.setAttribute('element-name', this.getClass());
        elementDiv.setAttribute('id', this.elementId);
        this.rootSelector().parentNode.replaceChild(elementDiv, this.rootSelector());

        this.elementSelector = null;

    };spike.core.Element_parentElement_model.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.Element_parentElement_model.prototype.getClass = function(){ return 'spike.core.Element'; };spike.core.Element = function(){    };spike.core.Element_parentElement_model.prototype.rendered= false;spike.core.Element.prototype.rendered= false;spike.core.Element_parentElement_model.prototype.model= null;spike.core.Element.prototype.model= null;spike.core.Element_parentElement_model.prototype.elementId= null;spike.core.Element.prototype.elementId= null;spike.core.Element_parentElement_model.prototype.elementSelector= null;spike.core.Element.prototype.elementSelector= null;spike.core.Element_parentElement_model.prototype.compiledHtml= null;spike.core.Element.prototype.compiledHtml= null;spike.core.Element_parentElement_model.prototype.parentElement= null;spike.core.Element.prototype.parentElement= null;spike.core.Element_parentElement_model.prototype.childElements= [];spike.core.Element.prototype.childElements= [];spike.core.Element_parentElement_model.prototype.selector= {};spike.core.Element.prototype.selector= {};spike.core.Element_parentElement_model.prototype.eventsSelectors= [];spike.core.Element.prototype.eventsSelectors= [];spike.core.Element_parentElement_model.prototype.linksSelectors= [];spike.core.Element.prototype.linksSelectors= [];spike.core.Element_parentElement_model.prototype.rootSelector= function(){

        if(this.elementSelector === null){
            this.elementSelector = document.getElementById(this.elementId);
        }

        return document.getElementById(elementId);
    };spike.core.Element.prototype.rootSelector= function(){

        if(this.elementSelector === null){
            this.elementSelector = document.getElementById(this.elementId);
        }

        return document.getElementById(elementId);
    };spike.core.Element_parentElement_model.prototype.include= function(childElement){

        this.childElements.push(childElement);
        this.createTemplatePath();
        this.createTemplate();

        return this.compiledHtml;

    };spike.core.Element.prototype.include= function(childElement){

        this.childElements.push(childElement);
        this.createTemplatePath();
        this.createTemplate();

        return this.compiledHtml;

    };spike.core.Element_parentElement_model.prototype.createTemplatePath= function(){

        this.templatePath = '';

        var elementPath = this.getClass().split('.');

        for(var i = 0; i < elementPath.length; i++){
            this.templatePath += elementPath[i].toLowerCase()+'/';
        }

        this.templatePath = this.templatePath.substring(0, this.templatePath.lastIndexOf('/')-1)+'.html';

        return this.templatePath;

    };spike.core.Element.prototype.createTemplatePath= function(){

        this.templatePath = '';

        var elementPath = this.getClass().split('.');

        for(var i = 0; i < elementPath.length; i++){
            this.templatePath += elementPath[i].toLowerCase()+'/';
        }

        this.templatePath = this.templatePath.substring(0, this.templatePath.lastIndexOf('/')-1)+'.html';

        return this.templatePath;

    };spike.core.Element_parentElement_model.prototype.createTemplate= function () {

     try {
        this.compiledHtml = spike.core.Templates.compileTemplate(this, this.templatePath);
     }catch (err){
        Errors.throwError('Error occur when executing component {0} template {1}', [this.getClass(), this.templatePath]);
     }

     var selectorsObj = spike.core.System.createUniqueSelectors(this.compiledHtml);

     this.compiledHtml = selectorsObj.html;
     this.selector = selectorsObj.selectors;
     this.eventsSelectors = selectorsObj.eventsSelectors;
     this.linksSelectors = selectorsObj.linksSelectors;


    };spike.core.Element.prototype.createTemplate= function () {

     try {
        this.compiledHtml = spike.core.Templates.compileTemplate(this, this.templatePath);
     }catch (err){
        Errors.throwError('Error occur when executing component {0} template {1}', [this.getClass(), this.templatePath]);
     }

     var selectorsObj = spike.core.System.createUniqueSelectors(this.compiledHtml);

     this.compiledHtml = selectorsObj.html;
     this.selector = selectorsObj.selectors;
     this.eventsSelectors = selectorsObj.eventsSelectors;
     this.linksSelectors = selectorsObj.linksSelectors;


    };spike.core.Element_parentElement_model.prototype.render= function () {
    };spike.core.Element.prototype.render= function () {
    };spike.core.Element_parentElement_model.prototype.reloadComponent= function(component, componentData){
    };spike.core.Element.prototype.reloadComponent= function(component, componentData){
    };spike.core.Element_parentElement_model.prototype.replaceWith= function () {

        var elementDiv = document.createElement("div");
        elementDiv.innerHTML = this.compiledHtml;
        elementDiv.setAttribute('element-name', this.getClass());
        elementDiv.setAttribute('id', this.elementId);
        this.rootSelector().parentNode.replaceChild(elementDiv, this.rootSelector());

        this.elementSelector = null;

    };spike.core.Element.prototype.replaceWith= function () {

        var elementDiv = document.createElement("div");
        elementDiv.innerHTML = this.compiledHtml;
        elementDiv.setAttribute('element-name', this.getClass());
        elementDiv.setAttribute('id', this.elementId);
        this.rootSelector().parentNode.replaceChild(elementDiv, this.rootSelector());

        this.elementSelector = null;

    };spike.core.Element.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.Element.prototype.getClass = function(){ return 'spike.core.Element'; }; });spike.core.Assembler.defineNamespace('spike.core',['GlobalElement'], function(){spike.core.GlobalElement = function(){spike.core.GlobalElement.prototype = new spike.core.Element();

        this.elementSelector = document.body;
        this.createTemplatePath();
        this.createTemplate();

    };spike.core.GlobalElement.prototype.render= function(){

        this.replaceWith();

        spike.core.Events.bindEvents(this);
        spike.core.Router.bindLinks(this);

        this.rendered = true;

        if(this.init !== undefined){
            this.init();
        }

    };spike.core.GlobalElement.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.GlobalElement.prototype.getClass = function(){ return 'spike.core.GlobalElement'; }; });spike.core.Assembler.defineNamespace('spike.core',['Controller_model','Controller'], function(){spike.core.Controller_model = function(model){spike.core.Controller.prototype = new spike.core.Controller();

        this.model = model;
        this.elementSelector = spike.core.System.getView();
        this.createTemplatePath();
        this.createTemplate();

    };spike.core.Controller_model.prototype.scrollTop= true;spike.core.Controller_model.prototype.checkNetwork= true;spike.core.Controller_model.prototype.render= function(){

        this.replaceWith();

        spike.core.Events.bindEvents(this);
        spike.core.Router.bindLinks(this);

        this.rendered = true;

        if(this.init !== undefined){
            this.init();
        }

    };spike.core.Controller_model.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.Controller_model.prototype.getClass = function(){ return 'spike.core.Controller'; };spike.core.Controller = function(){spike.core.Controller.prototype = new spike.core.Element();    };spike.core.Controller_model.prototype.scrollTop= true;spike.core.Controller.prototype.scrollTop= true;spike.core.Controller_model.prototype.checkNetwork= true;spike.core.Controller.prototype.checkNetwork= true;spike.core.Controller_model.prototype.render= function(){

        this.replaceWith();

        spike.core.Events.bindEvents(this);
        spike.core.Router.bindLinks(this);

        this.rendered = true;

        if(this.init !== undefined){
            this.init();
        }

    };spike.core.Controller.prototype.render= function(){

        this.replaceWith();

        spike.core.Events.bindEvents(this);
        spike.core.Router.bindLinks(this);

        this.rendered = true;

        if(this.init !== undefined){
            this.init();
        }

    };spike.core.Controller.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.Controller.prototype.getClass = function(){ return 'spike.core.Controller'; }; });spike.core.Assembler.defineNamespace('spike.core',['Modal_model','Modal'], function(){spike.core.Modal_model = function(model){spike.core.Modal.prototype = new spike.core.Modal();

        this.parentElement = spike.core.System.getModalsView();
        this.model = model;

        this.createTemplatePath();
        this.createTemplate();



    };spike.core.Modal_model.prototype.destroyed= false;spike.core.Modal_model.prototype.show= function(){
        spike.core.System.modalInterface.onShow();
    };spike.core.Modal_model.prototype.hide= function(){
        spike.core.System.modalInterface.onHide();
    };spike.core.Modal_model.prototype.destroy= function () {
        this.destroyed = true;
    };spike.core.Modal_model.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.Modal_model.prototype.getClass = function(){ return 'spike.core.Modal'; };spike.core.Modal = function(){spike.core.Modal.prototype = new spike.core.Element();    };spike.core.Modal_model.prototype.destroyed= false;spike.core.Modal.prototype.destroyed= false;spike.core.Modal_model.prototype.show= function(){
        spike.core.System.modalInterface.onShow();
    };spike.core.Modal.prototype.show= function(){
        spike.core.System.modalInterface.onShow();
    };spike.core.Modal_model.prototype.hide= function(){
        spike.core.System.modalInterface.onHide();
    };spike.core.Modal.prototype.hide= function(){
        spike.core.System.modalInterface.onHide();
    };spike.core.Modal_model.prototype.destroy= function () {
        this.destroyed = true;
    };spike.core.Modal.prototype.destroy= function () {
        this.destroyed = true;
    };spike.core.Modal.prototype.getSuper = function(){ return 'spike.core.Element'; };spike.core.Modal.prototype.getClass = function(){ return 'spike.core.Modal'; }; });spike.core.Assembler.createStaticClass('spike.core','Broadcaster', null,{

    applicationEvents: {},

    register: function (eventName) {

        if (!spike.core.Util.isNull(this.applicationEvents[eventName])) {
            spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_ALREADY_EXIST, [eventName]);
        }

        this.applicationEvents[eventName] = [];

    },

    broadcast: function (eventName, eventData) {

        if (spike.core.Util.isNull(this.applicationEvents[eventName])) {
            spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_NOT_EXIST, [eventName]);
        }

        for(var i = 0; i < this.applicationEvents[eventName].length; i++){
            this.applicationEvents[eventName][i](eventData);
        }

    },

    listen: function (eventName, eventCallback) {

        if (spike.core.Util.isNull(this.applicationEvents[eventName])) {
            spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_NOT_EXIST, [eventName]);
        }

        if (spike.core.Util.isNull(eventCallback)) {
            spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_CALLBACK_NULL, [eventName]);
        }

        var isAlreadyRegisteredListener = false;

        for(var i = 0; i < this.applicationEvents[eventName].length; i++){

            if(this.applicationEvents[eventName][i].toString() === eventCallback.toString()){
                isAlreadyRegisteredListener = true;
            }

        }

        if(isAlreadyRegisteredListener === false){
            this.applicationEvents[eventName].push(eventCallback);
        }

    },

    destroy: function (eventName) {

        if (spike.core.Util.isNull(this.applicationEvents[eventName])) {
            spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_NOT_EXIST, [eventName]);
        }

        this.applicationEvents[eventName] = [];

    }

});