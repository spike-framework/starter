var spike = {
  core: {}
};

spike.core.Assembler = {

  sourcePath: '',

  constructorsMap: {},
  constructorsFunctions: {},

  templatesLoaded: false,
  appLoaded: false,

  totalNamespaces: 0,
  namespacesCount: 0,

  staticClasses: {},
  objectiveClasses: {},

  dependenciesFn: null,
  spikeLoading: false,

  throwError: function(message){
    throw new Error('Spike Framework: '+message);
  },

  resetNamespaces: function (namespacesCount, package) {
    this.totalNamespaces = namespacesCount;
    this.namespacesCount = 0;
    this.dependenciesFn = null;
    this.spikeLoading = false;

    if (package === 'spike.core') {
      this.spikeLoading = true;
    } else {
      this.staticClasses = {};
      this.objectiveClasses = {};
    }

  },

  extend: function (from, to) {

    if (to !== null && to !== undefined) {

      var overrides = {};
      var supers = {};

      for (var prop in from) {

        if (from.hasOwnProperty(prop)) {

            if (to[prop] !== undefined) {
              supers[prop] = from[prop];
              overrides[prop] = to[prop];
            } else {
              to[prop] = from[prop];
            }

        }

      }

      for (var prop in overrides) {
        to[prop] = overrides[prop];
      }

      to.super = function(){
        return spike.core.Assembler.getClassByName(this.getSuper()).prototype;
      };

    }

    return to;

  },

  dependencies: function (dependenciesFn) {
    this.dependenciesFn = dependenciesFn;
    this.checkIfCanBootstrap();
  },

  getDotPath: function (package) {

    var obj = window;

    package = package.split(".");
    for (var i = 0, l = package.length; i < l; i++) {

      if (obj[package[i]] === undefined) {
        break;
      }

      obj = obj[package[i]];

    }

    return obj;

  },

  createDotPath: function (package, fillObject) {

    if (package.trim().length === 0) {
      this.throwError('FATAL No package declaration');
    }

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

  defineNamespace: function (classFullName, namespaceCreator) {

    this.namespacesCount++;
    this.createDotPath(classFullName, null);

    this.objectiveClasses[classFullName] = namespaceCreator;

  },

  createStaticClass: function (package, name, inheritsPackage, classBody) {

    if (name.indexOf(package) > -1) {
      name = name.replace(package + '.', '');
    }

    this.namespacesCount++;
    var classBody = classBody();
    if (inheritsPackage && inheritsPackage !== 'null') {
      var inheritsClass = this.getClassByName(inheritsPackage);
      if(inheritsClass === undefined){
        this.throwError('Superclass '+inheritsPackage+'not found');
      }

      this.extend(inheritsClass, classBody);
    }

    this.staticClasses[package + '.' + name] = classBody;
    this.createDotPath(package + '.' + name, classBody);

  },


  checkIfCanBootstrap: function () {

    if(this.namespacesCount !== this.totalNamespaces){
      this.throwError("FATAL Some namespaces damaged");
    }

    if (this.namespacesCount === this.totalNamespaces && this.dependenciesFn) {
      this.bootstrap();

      if (this.appLoaded === true && this.spikeLoading === false) {
        spike.core.System.init();
      }

    }

  },

  bootstrap: function () {

    for (var className in this.objectiveClasses) {
      this.objectiveClasses[className]();
    }

    this.dependenciesFn();
    this.loadTemplates();

  },

  loadTemplates: function () {

    var self = this;

    if (this.templatesLoaded === false) {

      if (document.querySelector('[templates-src]') === null) {
        this.throwError('Cannot find script tag with templates-src definition');
      }

      if (document.querySelector('[app-src]') === null) {
        this.throwError('Cannot find script tag with app-src definition')
      }

      var script = document.createElement("script");
      script.type = "application/javascript";
      script.src = document.querySelector('[templates-src]').getAttribute('templates-src');
      script.onload = function () {

        var watchers = document.createElement("script");
        watchers.type = "application/javascript";
        watchers.src = document.querySelector('[watchers-src]').getAttribute('watchers-src');
        watchers.onload = function () {

          self.templatesLoaded = true;

          self.namespacesCount = 0;
          self.appLoaded = true;
          var app = document.createElement("script");
          app.type = "application/javascript";
          app.src = document.querySelector('[app-src]').getAttribute('app-src');
          document.body.appendChild(app);

        };

        document.body.appendChild(watchers);

      };

      document.body.appendChild(script);

    }

  },

  findLoaderClass: function () {

    for (var className in this.objectiveClasses) {

      if (this.objectiveClasses.hasOwnProperty(className)) {

        if (this.objectiveClasses[className].toString().indexOf('return \'spike.core.LoaderInterface\'') > -1) {

          var loader = window;

          var split = className.split('.');
          for (var i = 0; i < split.length; i++) {

            loader = loader[split[i]];

          }

          loader = new loader();
          return loader;

        }

      }

    }

    this.throwError('No loader defined');

  },

  findConfigClass: function () {

    for (var className in this.staticClasses) {

      if (this.staticClasses.hasOwnProperty(className)) {

        if (this.staticClasses[className].getSuper() === 'spike.core.Config') {
          return this.staticClasses[className];
        }

      }

    }

    this.throwError('No config defined');

  },

  getClassByName: function (classFullName) {

    function getObjectFromPath(path) {
      var obj = window;

      var split = path.split('.');
      for (var i = 0; i < split.length; i++) {
        obj = obj[split[i]];
      }

      return obj;
    }

    var packageName = classFullName.substring(0, classFullName.lastIndexOf('.'));
    var className = classFullName.substring(classFullName.lastIndexOf('.') + 1, classFullName.length);

    return getObjectFromPath(packageName)[className];

  },

  getClassInstance: function (classFullName, argsArray) {
    var clazz = this.getClassByName(classFullName);

    if(clazz === undefined){
      this.throwError('Class '+classFullName+' not found');
    }

    return new clazz(argsArray);
  },

  destroy: function(){
    this.objectiveClasses = null;
    this.staticClasses = null;
  }

};

spike.core.Assembler.resetNamespaces(24, 'spike.core');spike.core.Assembler.createStaticClass('spike.core','Config', 'null',function(){ return {languageFilePath: "/{lang}.json",html5Mode: false,mobileRun: false,showLog: true,showObj: true,showDebug: true,showWarn: true,showOk: true,mainController: null,initialView: null,rootPath: 'app',lang: "en",isClass: true,getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Config'; },}});spike.core.Assembler.createStaticClass('spike.core','Errors', 'null',function(){ return {messages: {

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
JSON_PARSE_ERROR: 'JSON parse error during execution {0}',

TRIGGER_NOT_DEFINED: 'Trigger {0} is not defined for scope {1}'

},errors: [],isClass: true,throwError: function (errorMessage, errorMessageBinding) {var $this=this;

var error = 'Spike Framework: ' + spike.core.Util.bindStringParams(errorMessage, errorMessageBinding);
this.errors.push(error);
this.printExceptions();
throw new Error(error);

},printExceptions: function () {var $this=this;

for (var i = 0; i < this.errors.length; i++) {
console.error('Error ' + i + ': ' + this.errors[i]);
}

},throwWarn: function (warnMessage, warnMessageBinding) {var $this=this;
spike.core.Log.warn('Spike Framework: ' + spike.core.Util.bindStringParams(warnMessage, warnMessageBinding));
},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Errors'; },}});spike.core.Assembler.createStaticClass('spike.core','Events', 'null',function(){ return {allowedEvents: [
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
'toggle',
'load',
'unload'
],__eventsReferences: {},__linkReferences: {},isClass: true,bindEvents: function(element){var $this=this;

this.bindEventsForElement(element);
for(var i = 0; i < element.childElements.length; i++){

if(element.childElements[i].length > 0){
this.bindEvents(element.childElements[i]);
}

}

},bindEventsForElement: function (element) {var $this=this;

for(var i = 0; i < element.eventsSelectors.length; i++){

if(typeof element.eventsSelectors[i] === 'string'){
element.eventsSelectors[i] = document.getElementById(element.eventsSelectors[i]);
}

if(element.eventsSelectors[i].getAttribute('spike-unbinded') != null){

for (var k = 0; k < this.allowedEvents.length; k++) {

var eventFunctionBody = element.eventsSelectors[i].getAttribute('spike-event-' + this.allowedEvents[k]);

if (eventFunctionBody) {

var eventRef = element.eventsSelectors[i].id+'_'+this.allowedEvents[k];

if(!this.__eventsReferences[eventRef]){

var eventFnLinkHash = element.eventsSelectors[i].getAttribute('spike-event-' + this.allowedEvents[k]+'-link');
eventFnLink = $this.__linkReferences[eventFnLinkHash].fn;
eventFnLink = eventFnLink.apply.bind(eventFnLink, element.eventsSelectors[i], $this.__linkReferences[eventFnLinkHash].args);

this.__eventsReferences[eventRef] = eventFnLink;
element.eventsSelectors[i].addEventListener(this.allowedEvents[k], this.__eventsReferences[eventRef]);
}

}

}

}

element.eventsSelectors[i].removeAttribute('spike-unbinded');

}

},removeEventListeners: function(element){var $this=this;

for(var i = 0; i < element.eventsSelectors.length; i++){

if(typeof element.eventsSelectors[i] === 'string'){
element.eventsSelectors[i] = document.getElementById(element.eventsSelectors[i]);
}

for (var k = 0; k < this.allowedEvents.length; k++) {

var eventRef = element.eventsSelectors[i].id+'_'+this.allowedEvents[k];

if(this.__eventsReferences[eventRef]){
element.eventsSelectors[i].removeEventListener(this.allowedEvents[k], this.__eventsReferences[eventRef]);
}

}

}

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Events'; },}});spike.core.Assembler.defineNamespace('spike.core.EventsInterface',function(){spike.core.EventsInterface=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.EventsInterface with arguments count: '+__args.length);}};spike.core.EventsInterface.prototype.EventsInterface=function(){this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.EventsInterface with arguments count: '+arguments.length);}};spike.core.EventsInterface.prototype.constructor_0=function(){var $this=this;};spike.core.EventsInterface.prototype.isClass= true;spike.core.EventsInterface.prototype.onIncompatible=function(){var $this=this;

};spike.core.EventsInterface.prototype.onRender=function(){var $this=this;

};spike.core.EventsInterface.prototype.domEvents=function(){var $this=this;

};spike.core.EventsInterface.prototype.onOnline=function(){var $this=this;
};spike.core.EventsInterface.prototype.onOffline=function(){var $this=this;
};spike.core.EventsInterface.prototype.onBack=function(){var $this=this;
};spike.core.EventsInterface.prototype.onDeviceReady=function(){var $this=this;
};spike.core.EventsInterface.prototype.onReady=function(){var $this=this;
};spike.core.EventsInterface.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.EventsInterface.prototype.getClass=function(){var $this=this; return 'spike.core.EventsInterface'; };});spike.core.Assembler.defineNamespace('spike.core.RoutingInterface',function(){spike.core.RoutingInterface=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.RoutingInterface with arguments count: '+__args.length);}};spike.core.RoutingInterface.prototype.RoutingInterface=function(){this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.RoutingInterface with arguments count: '+arguments.length);}};spike.core.RoutingInterface.prototype.constructor_0=function(){var $this=this;};spike.core.RoutingInterface.prototype.isClass= true;spike.core.RoutingInterface.prototype.create=function(router){var $this=this;

};spike.core.RoutingInterface.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.RoutingInterface.prototype.getClass=function(){var $this=this; return 'spike.core.RoutingInterface'; };});spike.core.Assembler.defineNamespace('spike.core.LoaderInterface',function(){spike.core.LoaderInterface=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.LoaderInterface with arguments count: '+__args.length);}};spike.core.LoaderInterface.prototype.LoaderInterface=function(){this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.LoaderInterface with arguments count: '+arguments.length);}};spike.core.LoaderInterface.prototype.constructor_0=function(){var $this=this;};spike.core.LoaderInterface.prototype.isClass= true;spike.core.LoaderInterface.prototype.loadApplication=function(){var $this=this;

};spike.core.LoaderInterface.prototype.onLoadApplication=function(){var $this=this;
};spike.core.LoaderInterface.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.LoaderInterface.prototype.getClass=function(){var $this=this; return 'spike.core.LoaderInterface'; };});spike.core.Assembler.defineNamespace('spike.core.ModalInterface',function(){spike.core.ModalInterface=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.modals= [];this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.ModalInterface with arguments count: '+__args.length);}};spike.core.ModalInterface.prototype.ModalInterface=function(){this.modals= [];this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.ModalInterface with arguments count: '+arguments.length);}};spike.core.ModalInterface.prototype.constructor_0=function(){var $this=this;};spike.core.ModalInterface.prototype.modals= [];spike.core.ModalInterface.prototype.isClass= true;spike.core.ModalInterface.prototype.onRender=function(modal){var $this=this;
this.modals.push(modal);
};spike.core.ModalInterface.prototype.onShow=function(modal){var $this=this;
console.log(modal.elementId);
modal.rootSelector().style = 'display: block;';
};spike.core.ModalInterface.prototype.onHide=function(modal){var $this=this;
modal.rootSelector().style = 'display: hide;';
};spike.core.ModalInterface.prototype.onConstruct=function(modalElement){var $this=this;
return modalElement;
};spike.core.ModalInterface.prototype.onDestroy=function(modal){var $this=this;

for(var i = 0; i < this.modals.length; i++){

if(this.modals[i].elementId === modal.elementId){
this.modals.splice(i, 1);
}

}

};spike.core.ModalInterface.prototype.removeAll=function(){var $this=this;

for(var i = 0; i < this.modals.length; i++){
this.modals[i].destroy();
}

this.modals = [];

};spike.core.ModalInterface.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.ModalInterface.prototype.getClass=function(){var $this=this; return 'spike.core.ModalInterface'; };});spike.core.Assembler.createStaticClass('spike.core','spike.core.System', 'null',function(){ return {config: null,eventsInterface: null,modalInterface: null,routing: null,idCounter: 1,attributes: {
APP: 'spike-app',
VIEW: 'spike-view',
MODALS: 'spike-modals',
},version: '3.0.0',currentController: null,previousController: null,currentRenderedController: null,viewSelector: null,appViewSelector: null,modalsSelector: null,loader: null,globalElements: [],isClass: true,setConfig: function(configObject){var $this=this;
this.config = configObject;
},setRouting: function(routing){var $this=this;
this.routing = routing;
},setEventsInterface: function(eventsInterface){var $this=this;
this.eventsInterface = eventsInterface;
},setModalInterface: function(modalInterface){var $this=this;
this.modalInterface = modalInterface;
},assignId: function(){var $this=this;
idCounter++;
return 'element-'+idCounter;
},getCurrentController: function () {var $this=this;

var endpoint = spike.core.Router.getCurrentViewData().endpoint;

if (endpoint) {
return endpoint.controller;
}

return this.currentController || this.config.mainController;
},execOnRenderEvent: function () {var $this=this;

if (this.eventsInterface.onRender) {
this.eventsInterface.onRender();
}

},renderModal: function (modalObject, modalInitialData, afterRenderCallback) {var $this=this;

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

},renderController: function (controller, afterRenderCallback) {var $this=this;
spike.core.Log.debug('Invoke system.renderController with params', []);
spike.core.Log.log('Rendering controller {0}', [controller.getClass()]);

if (controller.scrollTop === true) {
window.scrollTo(0,0);
}

this.modalInterface.removeAll();


spike.core.Selectors.clearSelectorsCache();

if(this.currentRenderedController){
this.currentRenderedController.destroy();
}

controller.render();

this.currentRenderedController = controller;

spike.core.System.execOnRenderEvent();

if (afterRenderCallback) {
afterRenderCallback();
}

spike.core.Log.ok('spike.core.Selectors cache usage during app lifecycle: ' + spike.core.Selectors.cacheUsageCounter);

},render: function (moduleClass, moduleInitialModel, afterRenderCallback) {var $this=this;

if (!moduleClass) {
spike.core.Errors.throwError(spike.core.Errors.messages.MODULE_NOT_EXIST);
}


spike.core.Router.clearCacheViewData();

var module = spike.core.Assembler.getClassInstance(moduleClass, [moduleInitialModel]);

if (module.getSuper() === 'spike.core.Controller') {
spike.core.System.renderController(module, afterRenderCallback);
} else if (module.getSuper() === 'spike.core.Modal') {
spike.core.System.renderModal(module, afterRenderCallback);
}

},getView: function () {var $this=this;

if(this.viewSelector === null){
this.viewSelector = document.querySelector('['+this.attributes.VIEW+']');
}

return this.viewSelector;

},getAppView: function(){var $this=this;

if(this.appViewSelector === null){
this.appViewSelector = document.querySelector('['+this.attributes.APP+']');
}

return this.appViewSelector;

},getModalsView: function(){var $this=this;

if(this.modalsSelector === null){
this.modalsSelector = document.querySelector('['+this.attributes.MODALS+']');
}

return this.modalsSelector;

},verifyViews: function(){var $this=this;

if(this.getView() === null || this.getModalsView() === null){
spike.core.Errors.throwError(spike.core.Errors.messages.SPIKE_APP_NOT_DEFINED, [this.attributes.VIEW, this.attributes.MODALS]);
}

},init: function () {var $this=this;

spike.core.Log.init();

this.loader = spike.core.Assembler.findLoaderClass();
this.config = spike.core.Assembler.findConfigClass();
this.loader.loadApplication();

spike.core.Log.debug('Invoke spike.core.System.init with params', []);

if(this.config === null){
this.setConfig(new spike.core.Config());
}

if(this.modalInterface === null){
this.setModalInterface(new spike.core.ModalInterface());
}

if(this.eventsInterface === null){
this.setEventsInterface(new spike.core.EventsInterface());
}

spike.core.Log.log('Destroy assembler');
spike.core.Assembler.destroy();

spike.core.Log.warn('Spike version: {0}', [spike.core.System.version]);
spike.core.Log.ok('Spike application initializing.');

this.verifyViews();
spike.core.Router.detectHTML5Mode();

spike.core.Message.loadLanguage().then(function(){

spike.core.Log.log('Translations loaded');

if ($this.eventsInterface.onReady !== undefined) {
$this.eventsInterface.onReady();
}

spike.core.Router.registerRouter();
spike.core.Watchers.createWatchLoop();
$this.initGlobalElements();

$this.loader.onLoadApplication();

spike.core.Log.ok('Spike application ready to work.');

});

},initGlobalElements: function(){var $this=this;

var globalElements = document.getElementsByTagName('spike');

for(var i = 0; i < globalElements.length; i++){

if(globalElements[i].getAttribute('sp-element')){

globalElements[i].id = 'global-'+spike.core.Util.hash();
var className = globalElements[i].getAttribute('sp-element');

var globalElement = spike.core.Assembler.getClassInstance(className, [globalElements[i].id]);
this.globalElements.push(globalElement);

}

}

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.System'; },}});spike.core.Assembler.createStaticClass('spike.core','Log', 'null',function(){ return {isClass: true,init: function(){var $this=this;
if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function () { };
},obj: function (jsObject) {var $this=this;

if (spike.core.System.config.showObj) {
console.log(jsObject);
}

},log: function (logMessage, logData) {var $this=this;

if (spike.core.System.config.showLog) {
this.print(logMessage, logData, 'LOG');
}

},templateLog: function (logMessage, logData) {var $this=this;

if (spike.core.System.config.showLog) {
this.print(logMessage, logData, 'TEMPLATE_LOG');
}

},error: function (errorMessage, errorData) {var $this=this;

if (spike.core.System.config.showError) {
this.print(errorMessage, errorData, 'ERROR');
}

},debug: function (debugMessage, debugData) {var $this=this;

if (spike.core.System.config.showDebug) {
this.print(debugMessage, debugData, 'DEBUG');
}

},warn: function (warnMessage, warnData) {var $this=this;

if (spike.core.System.config.showWarn) {
this.print(warnMessage, warnData, 'WARN');
}

},ok: function (okMessage, okData) {var $this=this;

if (spike.core.System.config.showOk) {
this.print(okMessage, okData, 'OK');
}

},print: function (message, data, type) {var $this=this;

if (typeof message !== 'string') {
message = JSON.stringify(message);
}

if (data) {
message = spike.core.Util.bindStringParams(message, data);
}

var color = '';
switch (type) {
case 'TEMPLATE_LOG' :
color = 'chocolate ';
break;
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

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Log'; },}});spike.core.Assembler.createStaticClass('spike.core','spike.core.Selectors', 'null',function(){ return {cacheUsageCounter: 0,selectorsCache: {},isClass: true,clearSelectorsCache: function () {var $this=this;
this.selectorsCache = {};
},clearSelectorInCache: function (selectorId) {var $this=this;

if (this.selectorsCache[selectorId]) {
this.selectorsCache[selectorId] = null;
}

},createFormsSelectors: function(element, selectors){var $this=this;

var formsWithNames = element.querySelectorAll('form[name]');

function getSelectorFn(name, newName) {
return function() {

var selector = spike.core.Selectors.selectorsCache[newName];

if (selector === undefined) {
selector = document.querySelector('form[name="'+newName+'"]');
selector.plainName = name;
selector.serialize = spike.core.Util.serializeForm.bind(selector);

spike.core.Selectors.selectorsCache[newName] = selector;
} else {
spike.core.Selectors.cacheUsageCounter++;
}

return selector;

};
};

for(var i = 0; i < formsWithNames.length; i++){

if(formsWithNames[i].getAttribute('sp-keep-name') != null){
continue;
}

var name = formsWithNames[i].getAttribute('name');

var newName = name + '-' + spike.core.Util.hash();
selectors.forms[name] = getSelectorFn(name, newName);
formsWithNames[i].setAttribute('name', newName);

}

return element.innerHTML;

},createNamesSelectors: function(element, selectors){var $this=this;

var elementsWithNames = element.querySelectorAll('[name]');

function getSelectorFn(name, newName) {
return function() {

var selector = spike.core.Selectors.selectorsCache[newName];

if (selector === undefined) {
selector = document.querySelector('[name="'+newName+'"]');
selector.plainName = name;
spike.core.Selectors.selectorsCache[newName] = selector;
} else {
spike.core.Selectors.cacheUsageCounter++;
}

return selector;

};
};

for(var i = 0; i < elementsWithNames.length; i++){

if(elementsWithNames[i].getAttribute('sp-keep-name') != null || elementsWithNames[i].tagName.toLowerCase() === 'form' || elementsWithNames[i].type === 'radio'){
continue;
}

var name = elementsWithNames[i].getAttribute('name');

var newName = name + '-' + spike.core.Util.hash();
selectors.names[name] = getSelectorFn(name, newName);
elementsWithNames[i].setAttribute('name', newName);

}

return element.innerHTML;

},createIdSelectors: function(element, selectors, eventsSelectors, linksSelectors){var $this=this;

var elementsWithId = element.querySelectorAll('[id]');

function getSelectorFn(newId) {
return function() {

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
};

for(var i = 0; i < elementsWithId.length; i++){

if(elementsWithId[i].getAttribute('sp-keep-id') != null || elementsWithId[i].id.indexOf('-sp-') > -1){
continue;
}

var newId = elementsWithId[i].id + '-sp-' + spike.core.Util.hash();

selectors[elementsWithId[i].id] = getSelectorFn(newId);

if(elementsWithId[i].getAttribute('spike-unbinded') != null){
eventsSelectors.push(newId);
}

if(elementsWithId[i].getAttribute('spike-href') != null){
linksSelectors.push(newId);
}

elementsWithId[i].id = newId;

}

return element.innerHTML;

},createUniqueSelectors: function (scope) {var $this=this;

var element = document.createElement('div');
element.innerHTML = scope.compiledHtml;

scope.selector = {
names: {},
forms: {}
};

scope.eventsSelectors = [];
scope.linksSelectors = [];

var newCompiledHtml =  this.createFormsSelectors(element, scope.selector, scope.selector);
newCompiledHtml = this.createNamesSelectors(element, scope.selector);
newCompiledHtml = this.createIdSelectors(element, scope.selector, scope.eventsSelectors, scope.linksSelectors);

scope.compiledHtml = newCompiledHtml;

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Selectors'; },}});spike.core.Assembler.createStaticClass('spike.core','Util', 'null',function(){ return {isClass: true,currentDateLog: function () {var $this=this;
return new Date().toLocaleTimeString();
},isFunction: function (functionToCheck) {var $this=this;
var getType = {};
return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
},bindStringParams: function (string, objectOrArrayParams) {var $this=this;

if (!string) {
return '';
}

if (string.indexOf('{') === -1 || !objectOrArrayParams) {
return string;
}

try {

if (objectOrArrayParams instanceof Array) {


for (var i = 0; i < objectOrArrayParams.length; i++) {
string = string.replace('{' + i + '}', objectOrArrayParams[i])
}

} else {

for (var paramName in objectOrArrayParams) {
string = string.replace('{' + paramName + '}', objectOrArrayParams[paramName]);
}

}

} catch (err) {
console.log(err);
}

return string;

},serializeForm: function(){var $this=this;

var serializedObject = {};

var serializeField = function(field){

var value = field.value;
var name = field.getAttribute('sp-name');

if(field.type === 'radio'){

if(field.checked === true){
value = field.value;
serializedObject[name] = value;
}

} else if (field.type == 'checkbox') {
value = field.checked;
serializedObject[name] = value;
}else{
serializedObject[name] = value;
}

};

var fields = this.querySelectorAll('input[name], select[name], textarea[name]');

for(var i = 0; i < fields.length; i++){
serializeField(fields[i]);
}

return serializedObject;

},isEmpty: function (obj) {var $this=this;

if (obj === undefined || obj === null) {
return true;
}

if (typeof obj === 'string') {
if (obj.trim().length === 0) {
return true;
}
}

return false;

},tryParseNumber: function (obj) {var $this=this;

if (!this.isEmpty(obj) && this.isNumeric(obj)) {

if(obj.indexOf('e') > -1 || obj.indexOf('E') > -1 || obj.charAt(0) === '0'){
return obj;
}

if (this.isInt(parseFloat(obj))) {
return parseInt(obj, 10);
} else {
return parseFloat(obj);
}

}

return obj;


},isNumeric: function( obj ) {var $this=this;
return ( typeof obj === "number" || typeof obj === "string" ) && !isNaN( obj - parseFloat( obj ) );
},isInt: function (n) {var $this=this;
return Number(n) === n && n % 1 === 0;
},isFloat: function (n) {var $this=this;
return Number(n) === n && n % 1 !== 0;
},isNull: function (obj) {var $this=this;

if (obj === undefined || obj === null) {
return true;
}

return false;

},preparePathDottedParams: function (url, params) {var $this=this;

for (var prop in params) {
url = url.replace(':' + prop, params[prop]);
}

return url;

},removeUndefinedPathParams: function (url) {var $this=this;
return url.split('/undefined').join('').split('/null').join('');
},prepareUrlParams: function (url, params) {var $this=this;

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

},findStringBetween: function (str, first, last) {var $this=this;

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

},hash: function () {var $this=this;
var text = "";
var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

for (var i = 0; i < 10; i++)
text += possible.charAt(Math.floor(Math.random() * possible.length));

return text;
},hashString: function(str) {var $this=this;

var hash = 5381, i    = str.length;

while(i) {
hash = (hash * 33) ^ str.charCodeAt(--i);
}

return hash >>> 0;
},escapeQuotes: function (text) {var $this=this;

try {
text = text.replace(/"/g, "&quot;").replace(/'/g, "&quot;");
} catch (err) {
console.log(err);
Log.warn('Could not escape single quotes in string: ' + text);
}

return text;

},bindTranslationParams: function (string, objectOrArrayParams) {var $this=this;

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

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Util'; },}});spike.core.Assembler.defineNamespace('spike.core.Request',function(){spike.core.Request=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.config= null;this.xhr= null;this.catchCallbacks= [];this.thenCallbacks= [];this.alwaysCallbacks= [];this.response= null;this.responseType= 'json';this.STATUS= {
DONE: 4,
LOADING: 3,
HEADERS_RECEIVED: 2,
OPENED: 1,
UNSENT: 0
};this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.Request with arguments count: '+__args.length);}};spike.core.Request.prototype.Request=function(){this.config= null;this.xhr= null;this.catchCallbacks= [];this.thenCallbacks= [];this.alwaysCallbacks= [];this.response= null;this.responseType= 'json';this.STATUS= {
DONE: 4,
LOADING: 3,
HEADERS_RECEIVED: 2,
OPENED: 1,
UNSENT: 0
};this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.Request with arguments count: '+arguments.length);}};spike.core.Request.prototype.constructor_1=function(config){var $this=this;

this.config = this.setConfig(config);
this.xhr = this.createXHR();

this.xhr.alias = this.config.alias;
this.setEvents();
this.setHeaders();

this.config.beforeSend();
this.xhr.send(this.config.data);


};spike.core.Request.prototype.constructor_0=function(){var $this=this;};spike.core.Request.prototype.config= null;spike.core.Request.prototype.xhr= null;spike.core.Request.prototype.catchCallbacks= [];spike.core.Request.prototype.thenCallbacks= [];spike.core.Request.prototype.alwaysCallbacks= [];spike.core.Request.prototype.response= null;spike.core.Request.prototype.responseType= 'json';spike.core.Request.prototype.STATUS= {
DONE: 4,
LOADING: 3,
HEADERS_RECEIVED: 2,
OPENED: 1,
UNSENT: 0
};spike.core.Request.prototype.isClass= true;spike.core.Request.prototype.setConfig=function(config){var $this=this;

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
config.contentType = 'application/json';
}

config.headers['Content-Type'] = config.contentType;

if(config.request === undefined){
config.request = {};
}

if(typeof config.request !== 'string'){

try {
config.data = JSON.stringify(config.data);
}catch(e){
console.error(e);
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

};spike.core.Request.prototype.setEvents=function(){var $this=this;

this.xhr.open(this.config.type, this.config.url, true);

this.xhr.onreadystatechange = function() {

if($this.xhr.readyState === $this.STATUS.DONE && $this.xhr.status === 200) {

if($this.responseType === 'json'){

try {
$this.xhr.responseJSON = JSON.parse($this.xhr.responseText);
$this.response = JSON.parse($this.xhr.responseText);
$this.resolveThen($this.response, $this.xhr, $this.xhr.status);
$this.resolveAlways($this.xhr, $this.response, $this.xhr.status);
}catch(e){
console.error(e);
$this.resolveCatch($this.xhr, 0, e);
$this.resolveAlways($this.xhr, $this.response, $this.xhr.status);
}


}else if($this.responseType === 'xml'){
$this.resolveThen($this.xhr.responseXML, $this.xhr, $this.xhr.status);
$this.resolveAlways($this.xhr, $this.response, $this.xhr.status);
}

}else if($this.xhr.readyState === $this.STATUS.DONE && $this.xhr.status === 204){
$this.resolveThen(null, $this.xhr, $this.xhr.status);
$this.resolveAlways($this.xhr, $this.response, $this.xhr.status);
}else if($this.xhr.readyState === $this.STATUS.DONE && $this.xhr.status !== 200){
$this.resolveCatch($this.xhr, $this.xhr.status, new Error('Response error: '+$this.xhr.status));
$this.resolveAlways($this.xhr, $this.response, $this.xhr.status);
}


};


};spike.core.Request.prototype.setHeaders=function(){var $this=this;

this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

for(var headerName in this.config.headers){
this.xhr.setRequestHeader(headerName, this.config.headers[headerName]);
}

if(this.config.headers['Content-Type'].indexOf('xml') > -1){
this.responseType = 'xml';
}

};spike.core.Request.prototype.always=function(callback){var $this=this;
this.alwaysCallbacks.push(callback);
return this;
};spike.core.Request.prototype.resolveAlways=function(response, xhr, status){var $this=this;

for(var i = 0; i < this.alwaysCallbacks.length; i++){
this.alwaysCallbacks[i](response, xhr, status);
}

};spike.core.Request.prototype.then=function(callback){var $this=this;
this.thenCallbacks.push(callback);
return this;
};spike.core.Request.prototype.resolveThen=function(response, xhr, status){var $this=this;

for(var i = 0; i < this.thenCallbacks.length; i++){
this.thenCallbacks[i](response, xhr, status);
}

};spike.core.Request.prototype.catch=function(callback){var $this=this;
this.catchCallbacks.push(callback);
return this;
};spike.core.Request.prototype.resolveCatch=function(xhr, status, thrownError){var $this=this;

for(var i = 0; i < this.catchCallbacks.length; i++){
this.catchCallbacks[i](xhr, status, thrownError);
}

};spike.core.Request.prototype.createXHR=function(){var $this=this;

var xhr;
if (window.XMLHttpRequest) {
xhr = new XMLHttpRequest();
} else if (window.ActiveXObject) {
try {
xhr = new ActiveXObject("Msxml2.XMLHTTP");
} catch (e) {
console.warn(e);
xhr = new ActiveXObject("Microsoft.XMLHTTP");
}
}

return xhr;

};spike.core.Request.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.Request.prototype.getClass=function(){var $this=this; return 'spike.core.Request'; };});spike.core.Assembler.defineNamespace('spike.core.MultiRequest',function(){spike.core.MultiRequest=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.responseData= [];this.alwaysCallbacks= [];this.countResponses= 0;this.promisesLength= 0;this.resolved= false;this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.MultiRequest with arguments count: '+__args.length);}};spike.core.MultiRequest.prototype.MultiRequest=function(){this.responseData= [];this.alwaysCallbacks= [];this.countResponses= 0;this.promisesLength= 0;this.resolved= false;this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.MultiRequest with arguments count: '+arguments.length);}};spike.core.MultiRequest.prototype.constructor_1=function(promises){var $this=this;

$this.promisesLength = promises.length;

for(var i = 0; i < promises.length; i++){

promises[i].always(function(xhr, response, status){
$this.countResponses++;

if(this instanceof spike.core.Request){

if(xhr.response){
xhr.response = JSON.parse(xhr.response);
}

$this.responseData.push(xhr);
}else{
$this.responseData.push(xhr);
}

if($this.resolved == false && $this.countResponses === $this.promisesLength){
$this.resolveAlways();
$this.resolved = true;
}

});

}

};spike.core.MultiRequest.prototype.constructor_0=function(){var $this=this;};spike.core.MultiRequest.prototype.responseData= [];spike.core.MultiRequest.prototype.alwaysCallbacks= [];spike.core.MultiRequest.prototype.countResponses= 0;spike.core.MultiRequest.prototype.promisesLength= 0;spike.core.MultiRequest.prototype.resolved= false;spike.core.MultiRequest.prototype.isClass= true;spike.core.MultiRequest.prototype.always=function(callback){var $this=this;
$this.alwaysCallbacks.push(callback);
return $this;
};spike.core.MultiRequest.prototype.resolveAlways=function(){var $this=this;

for(var i = 0; i < $this.alwaysCallbacks.length; i++){
$this.alwaysCallbacks[i].apply($this, [$this.responseData]);
}

};spike.core.MultiRequest.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.MultiRequest.prototype.getClass=function(){var $this=this; return 'spike.core.MultiRequest'; };});spike.core.Assembler.createStaticClass('spike.core','spike.core.Rest', 'null',function(){ return {cacheData: {},interceptors: {},globalInterceptors: {},isClass: true,interceptor: function (interceptorName, interceptorFunction, isGlobal) {var $this=this;

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

},invokeInterceptors: function (requestData, response, promise, interceptors) {var $this=this;

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

},createCachedPromise: function (url, method, interceptors) {var $this=this;

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


},isCached: function (url, method) {var $this=this;

var data = spike.core.Rest.cacheData[url + '_' + method];

if (spike.core.Util.isNull(data)) {
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

},get: function (url, propertiesObject) {var $this=this;

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

},delete: function (url, propertiesObject) {var $this=this;

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


},update: function (url, request, propertiesObject) {var $this=this;

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

},put: function (url, request, propertiesObject) {var $this=this;
return spike.core.Rest.update(url, request, propertiesObject);
},post: function (url, request, propertiesObject) {var $this=this;

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

},getDelete: function (url, method, propertiesObject) {var $this=this;

var pathParams = propertiesObject.pathParams;
var headers = propertiesObject.headers;
var urlParams = propertiesObject.urlParams;
var interceptors = propertiesObject.interceptors || [];

var preparedUrl = url;

if (pathParams !== undefined && pathParams !== null) {
preparedUrl = spike.core.Util.preparePathDottedParams(url, pathParams);

if (preparedUrl.indexOf('/undefined') > -1 || preparedUrl.indexOf('/null') > -1) {
spike.core.Errors.throwWarn(spike.core.Errors.messages.REST_API_NULL_PATHPARAM, [preparedUrl]);
preparedUrl = spike.core.Util.removeUndefinedPathParams(preparedUrl);
}

}

if (urlParams !== undefined && urlParams !== null) {
preparedUrl = spike.core.Util.prepareUrlParams(preparedUrl, urlParams);
}

var dataType = "json";
var contentType = "application/json; charset=utf-8";

if (!spike.core.Util.isNull(propertiesObject.cache) && spike.core.Util.isNull(spike.core.Rest.cacheData[url + '_' + method])) {
spike.core.Rest.createCacheObject(url, method, propertiesObject.cache);
}

var promiseObj = {
url: preparedUrl,
type: method,
beforeSend: function () {

},
complete: function (xhr) {

if (!spike.core.Util.isNull(propertiesObject.cache)) {
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
promiseObj.alias = propertiesObject.alias;

var promise = new spike.core.Request(promiseObj);

var requestData = {url: url, method: method, pathParams: pathParams, urlParams: urlParams, headers: headers};

promise.then(function (result) {
spike.core.Rest.invokeInterceptors(requestData, result, promise, interceptors);
});

promise.catch(function (error) {
spike.core.Rest.invokeInterceptors(requestData, error, promise, interceptors);
});

return promise;


},postPut: function (url, method, request, propertiesObject) {var $this=this;

var pathParams = propertiesObject.pathParams;
var headers = propertiesObject.headers;
var urlParams = propertiesObject.urlParams;
var interceptors = propertiesObject.interceptors || [];

var preparedUrl = url;

if (pathParams !== undefined && pathParams !== null) {
preparedUrl = spike.core.Util.preparePathDottedParams(url, pathParams);

if (preparedUrl.indexOf('/undefined') > -1 || preparedUrl.indexOf('/null') > -1) {
spike.core.Errors.throwWarn(spike.core.Errors.messages.REST_API_NULL_PATHPARAM, [preparedUrl]);
preparedUrl = spike.core.Util.removeUndefinedPathParams(preparedUrl);
}

}

if (urlParams !== undefined && urlParams !== null) {
preparedUrl = spike.core.Util.prepareUrlParams(preparedUrl, urlParams);
}

var dataType = "json";
var contentType = "application/json; charset=utf-8";

if (!spike.core.Util.isNull(propertiesObject.cache) && spike.core.Util.isNull(spike.core.Rest.cacheData[url + '_' + method])) {
spike.core.Rest.createCacheObject(url, method, propertiesObject.cache);
}

var promiseObj = {
url: preparedUrl,
data: request,
type: method,
beforeSend: function () {

},
complete: function (xhr) {

if (!spike.core.Util.isNull(propertiesObject.cache)) {
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
promiseObj.alias = propertiesObject.alias;

var promise = new spike.core.Request(promiseObj);

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

},fillCache: function (url, method, data) {var $this=this;

spike.core.Rest.cacheData[url + '_' + method].filled = true;
spike.core.Rest.cacheData[url + '_' + method].data = data;
spike.core.Rest.cacheData[url + '_' + method].cacheTime = new Date().getTime();

},createCacheObject: function (url, method, cache) {var $this=this;

spike.core.Rest.cacheData[url + '_' + method] = {
filled: false,
cacheTime: new Date().getTime(),
cacheType: cache === true ? 'PERSIST' : 'TIME',
cachePeriod: cache === true ? null : cache,
data: null
};

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Rest'; },}});spike.core.Assembler.createStaticClass('spike.core','spike.core.Message', 'null',function(){ return {waitingForTranslations: {},messages: {},isClass: true,loadLanguage: function(){var $this=this;
return spike.core.Message.add(spike.core.System.config.lang, spike.core.Util.bindStringParams(spike.core.System.config.languageFilePath, { lang: spike.core.System.config.lang }));
},add: function (languageName, languageFilePath) {var $this=this;

spike.core.Log.log('register translation {0}', [languageName]);

this.waitingForTranslations[languageName] = false;

var promise = new spike.core.Request({
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
spike.core.Errors.throwWarn(spike.core.Errors.messages.TRANSLATION_LOAD_WARN, [languageName, error.status]);
}

return error;

});

return promise;

},setTranslation: function (languageName, translationData) {var $this=this;

if (typeof translationData === 'string') {

try {
translationData = JSON.parse(translationData);
} catch (err) {
console.error(err);
spike.core.Errors.throwError(spike.core.Errors.messages.TRANSLATION_PARSING, [languageName]);
}

}

spike.core.Message.messages[languageName] = translationData;
spike.core.Message.waitingForTranslations[languageName] = true;
},get: function (messageName, arrayOrMapParams) {var $this=this;

var message = this.messages[spike.core.System.config.lang][messageName];
if(!message){
spike.core.Errors.throwWarn(spike.core.Errors.messages.TRANSLATION_MESSAGE_NOT_FOUND, [messageName])
}

if(arrayOrMapParams && message){
message = spike.core.Util.bindTranslationParams(message, arrayOrMapParams);
}

return message || messageName;
},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Message'; },}});spike.core.Assembler.createStaticClass('spike.core','Templates', 'null',function(){ return {templates: {},isClass: true,compileTemplate: function(scope, name){var $this=this;
return this.templates[spike.core.Assembler.sourcePath+"_"+name](scope, scope);
},includeTemplate: function(name, params, scope){var $this=this;

name = name.split('.').join('_')+'_html';
return this.templates[spike.core.Assembler.sourcePath+"_"+name](params, scope);

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Templates'; },}});spike.core.Assembler.createStaticClass('spike.core','spike.core.Router', 'null',function(){ return {preventReloadPage: null,events: {},otherwisePath: '/',pathParamReplacement: 'var',endpoints: {},routerHTML5Mode: false,pathFunctionHandler: null,hashChangeInterval: null,lastHashValue: null,getCurrentViewCache: null,getCurrentViewRouteCache: null,getCurrentViewDataCache: null,getCurrentViewDataRouteCache: null,redirectToViewHandler: null,createLinkHandler: null,isClass: true,getRouterFactory: function () {var $this=this;
return {
path: spike.core.Router.pathFunction,
other: spike.core.Router.otherFunction
}
},otherFunction: function (pathValue) {var $this=this;
spike.core.Router.otherwisePath = pathValue;
return spike.core.Router.getRouterFactory();
},pathFunction: function (pathValue, pathObject) {var $this=this;

if (spike.core.Util.isEmpty(pathValue) || spike.core.Util.isNull(pathObject)) {
spike.core.Errors.throwError(spike.core.Errors.messages.PATH_DEFINITION);
}

if(spike.core.Router.pathFunctionHandler){
pathValue = spike.core.Router.pathFunctionHandler(pathValue, pathObject);
}

spike.core.Router.registerPath(pathValue, pathObject.controller, pathObject.routingParams, pathObject.onRoute, pathObject.name, pathObject.modal, pathObject.defaultController);

return spike.core.Router.getRouterFactory();

},registerPath: function (pathValue, pathController, routingParams, onRouteEvent, routeName, pathModal, pathModalDefaultController) {var $this=this;

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
routingParams: routingParams || {},
onRouteEvent: onRouteEvent,
pathPattern: pathPattern,
routeName: routeName,
isModal: !spike.core.Util.isEmpty(pathModal)
};

},byName: function (routeName) {var $this=this;

for (var pathValue in spike.core.Router.endpoints) {

if (spike.core.Router.endpoints[pathValue].routeName === routeName) {
return pathValue;
}

}

spike.core.Errors.throwError(spike.core.Errors.messages.ROUTE_NAME_NOT_EXIST, [routeName]);

},routeNameExist: function (routeName) {var $this=this;

for (var pathValue in spike.core.Router.endpoints) {

if (spike.core.Router.endpoints[pathValue].routeName === routeName) {
return true;
}

}

return false;

},pathPatternExist: function (pathPattern) {var $this=this;

for (var pathValue in spike.core.Router.endpoints) {

if (spike.core.Router.endpoints[pathValue].pathPattern.pattern.join("") === pathPattern.pattern.join("")) {
return true;
}

}

return false;

},createPathPattern: function (pathValue) {var $this=this;

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

},detectHTML5Mode: function () {var $this=this;

if (window.history && window.history.pushState && spike.core.System.config.html5Mode === true) {
spike.core.Router.routerHTML5Mode = true;
}else{
spike.core.System.eventsInterface.onIncompatible('HISTORY_API');
}

},registerRouter: function () {var $this=this;

spike.core.Log.ok('HTML5 router mode status: {0}', [spike.core.Router.routerHTML5Mode]);

if (spike.core.Util.isEmpty(spike.core.System.routing)) {
spike.core.Errors.throwError(spike.core.Errors.messages.ROUTING_ENABLED_NOT_DEFINED, []);
}

spike.core.System.routing.create(spike.core.Router.getRouterFactory());

if (spike.core.Router.routerHTML5Mode === false && window.location.hash.substring(0, 2) !== '#/') {
window.location.hash = '#/';
}

spike.core.Router.renderCurrentView();

if (spike.core.Router.routerHTML5Mode === false) {
this.initHashChangeEvent();
}

},initHashChangeEvent: function(){var $this=this;

function hashChangeCallback(){


if(spike.core.Router.lastHashValue !== window.location.hash){
spike.core.Router.lastHashValue = window.location.hash;
spike.core.Router.onHashChanges();
}

}

spike.core.Router.hashChangeInterval = setInterval(hashChangeCallback, 100);

},onHashChanges: function () {var $this=this;

spike.core.Log.debug('Executes spike.core.Router.onHashChanges');

if (window.location.hash.replace('#', '') === spike.core.Router.preventReloadPage) {
spike.core.Router.preventReloadPage = null;
spike.core.Router.fireRouteEvents();
return false;
}

spike.core.Router.clearCacheViewData();

spike.core.Router.fireRouteEvents();
spike.core.Router.renderCurrentView();

},onHistoryChanges: function () {var $this=this;

if (spike.core.Router.routerHTML5Mode === true) {

spike.core.Log.debug('Executes spike.core.Router.onHistoryChanges');

if (spike.core.Router.getPathName() === spike.core.Router.preventReloadPage) {
spike.core.Router.preventReloadPage = null;
spike.core.Router.fireRouteEvents();
return false;
}

spike.core.Router.clearCacheViewData();

spike.core.Router.fireRouteEvents();
spike.core.Router.renderCurrentView();

}

},fireRouteEvents: function () {var $this=this;

var currentRoute = spike.core.Router.getCurrentRoute();

for(var eventName in spike.core.Router.events){

if (spike.core.Router.events[eventName]) {
spike.core.Router.events[eventName](currentRoute, app.currentController);
}

}

},onRouteChange: function (eventName, eventFunction) {var $this=this;

if (spike.core.Router.events[eventName]) {
spike.core.Errors.throwWarn(spike.core.Errors.messages.ROUTE_EVENT_ALREADY_REGISTRED, [eventName]);
}

spike.core.Router.events[eventName] = eventFunction;

},offRouteChange: function (eventName) {var $this=this;

if (spike.core.Router.events[eventName]) {
spike.core.Router.events[eventName] = null;
}

},checkPathIntegrity: function (hashPattern, endpointPattern) {var $this=this;

for (var i = 0; i < endpointPattern.pattern.length; i++) {

if (endpointPattern.pattern[i] !== spike.core.Router.pathParamReplacement
&& endpointPattern.pattern[i] !== hashPattern.pattern[i]) {
return false;
}

}

return true;

},getURLParams: function () {var $this=this;
return spike.core.Router.getURLParams();
},getQueryParams: function () {var $this=this;
return spike.core.Router.getURLParams();
},getURLParams: function () {var $this=this;

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

},getPathParams: function () {var $this=this;
return spike.core.Router.getCurrentViewData().data.pathParams;
},getRoutingParams: function () {var $this=this;
return spike.core.Router.getCurrentViewData().data.routingParams;
},getPathData: function (hashPattern, endpointPattern) {var $this=this;

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

},clearCacheViewData: function () {var $this=this;

spike.core.Router.getCurrentViewCache = null;
spike.core.Router.getCurrentViewDataCache = null;

},setCacheViewData: function(type, data) {var $this=this;

if(type === 'DATA'){
spike.core.Router.getCurrentViewDataCache = data;
spike.core.Router.getCurrentViewDataRouteCache = spike.core.Router.getCurrentRoute();
}else {
spike.core.Router.getCurrentViewCache = data;
spike.core.Router.getCurrentViewRouteCache = spike.core.Router.getCurrentRoute();
}

},getCurrentView: function () {var $this=this;

if (spike.core.Router.getCurrentViewCache !== null && spike.core.Router.getCurrentRoute() != spike.core.Router.getCurrentViewRouteCache) {
spike.core.Log.debug('Using @getCurrentViewCache cache');
return spike.core.Router.getCurrentViewCache;
}

var currentEndpointObject = spike.core.Router.getCurrentViewData();

if(currentEndpointObject.endpoint == null && currentEndpointObject.data == null){
spike.core.Router.redirect(spike.core.Router.otherwisePath);
return;
}

var currentEndpointData = currentEndpointObject.data;
var currentEndpoint = currentEndpointObject.endpoint;

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

spike.core.Router.setCacheViewData('VIEW', currentEndpointData);

return currentEndpointData;

},getCurrentViewData: function () {var $this=this;

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

currentEndpointData.routingParams = spike.core.Router.endpoints[pathValue].routingParams || {};

viewData = {
endpoint: currentEndpoint,
data: currentEndpointData
};

break;

}

}

spike.core.Router.setCacheViewData('DATA', viewData);

return viewData;

},setPathParams: function (pathParams) {var $this=this;

var currentViewData = spike.core.Router.getCurrentViewData();

for (var pathParam in pathParams) {

if (currentViewData.data.pathParams[pathParam]
&& !spike.core.Util.isNull(pathParams[pathParam])) {
currentViewData.data.pathParams[pathParam] = pathParams[pathParam];
}

}

spike.core.Router.redirectToView(currentViewData.endpoint.pathValue, currentViewData.data.pathParams, currentViewData.data.urlParams, true);


},setURLParams: function (urlParams) {var $this=this;

var currentViewData = spike.core.Router.getCurrentViewData();

var newURLParams = {};

for (var urlParam in urlParams) {

if (urlParams[urlParam] !== null) {
newURLParams[urlParam] = urlParams[urlParam];
}

}

currentViewData.data.urlParams = newURLParams;

spike.core.Router.redirectToView(currentViewData.endpoint.pathValue, currentViewData.data.pathParams, currentViewData.data.urlParams, true);

},getCurrentRoute: function () {var $this=this;

if (spike.core.Router.routerHTML5Mode === true) {
return spike.core.Router.getPathName().substring(1, spike.core.Router.getPathName().length);
}

return window.location.hash.replace('#/', '');

},redirectToView: function (path, pathParams, urlParams, preventReloadPage) {var $this=this;

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

},pushState: function (path) {var $this=this;
history.pushState({state: path}, null, path);
},getViewData: function () {var $this=this;
var currentViewData = spike.core.Router.getCurrentViewData();
return spike.core.Assembler.extend(currentViewData.endpoint, currentViewData.data);
},reloadView: function () {var $this=this;
spike.core.Router.renderCurrentView();
},renderCurrentView: function () {var $this=this;

var currentEndpointData = spike.core.Router.getCurrentView();

if(currentEndpointData === undefined){
return;
}

if (currentEndpointData.isModal === true) {

spike.core.Log.debug('rendering controller & modal, previous controller: ' + app.previousController);

if (app.previousController === null) {

spike.core.Log.debug('rendering controller & modal, default controller: ' + currentEndpointData.defaultController);

spike.core.System.render(currentEndpointData.defaultController, currentEndpointData, currentEndpointData.onRouteEventWithModal);
} else {
spike.core.System.render(currentEndpointData.modal, currentEndpointData, currentEndpointData.onRouteEvent);
}

} else {
spike.core.System.render(currentEndpointData.controller, currentEndpointData, currentEndpointData.onRouteEvent);
}

app.previousController = currentEndpointData.controller;

},getPathValueWithoutParams: function (pathValue) {var $this=this;

if (pathValue.indexOf(':') > -1) {
return pathValue.substring(0, pathValue.indexOf(':'));
}

return pathValue;

},redirect: function (path, pathParams, urlParams, preventReloadPage) {var $this=this;
spike.core.Router.redirectToView(path, pathParams, urlParams, preventReloadPage);
},redirectByName: function (routeName, pathParams, urlParams, preventReloadPage) {var $this=this;
spike.core.Router.redirectToView(spike.core.Router.byName(routeName), pathParams, urlParams, preventReloadPage);
},location: function (url, redirectType) {var $this=this;

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

},createLink: function (path, pathParams, urlParams) {var $this=this;

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

},back: function () {var $this=this;
window.history.go(-1);
},getPathName: function(){var $this=this;
return window.location.pathname;
},bindLinks: function(element){var $this=this;

this.bindLinksForElement(element);
for(var i = 0; i < element.childElements.length; i++){

if(element.childElements[i].length > 0){
this.bindLinks(element.childElements[i]);
}

}

},bindLinksForElement: function (element) {var $this=this;

for(var i = 0; i < element.linksSelectors.length; i++){

var selector = document.getElementById(element.linksSelectors[i]);

selector.addEventListener('click', function (e) {
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

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Router'; },}});spike.core.Assembler.defineNamespace('spike.core.Element',function(){spike.core.Element=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.rendered= false;this.elementId= null;this.elementSelector= null;this.compiledHtml= null;this.parentElement= null;this.childElements= [];this.selector= {};this.eventsSelectors= [];this.linksSelectors= [];this.templatePath= null;this.triggers= {};this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.Element with arguments count: '+__args.length);}};spike.core.Element.prototype.Element=function(){this.rendered= false;this.elementId= null;this.elementSelector= null;this.compiledHtml= null;this.parentElement= null;this.childElements= [];this.selector= {};this.eventsSelectors= [];this.linksSelectors= [];this.templatePath= null;this.triggers= {};this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.Element with arguments count: '+arguments.length);}};spike.core.Element.prototype.constructor_1=function(parentElement){var $this=this;
this.Element(parentElement, null);
};spike.core.Element.prototype.constructor_2=function(parentElement,params){var $this=this;

this.constructor_0();

if(parentElement){
this.parentElement = parentElement.isClass ? parentElement : null;
}

this.margeParams(params);

this.createTemplatePath();
this.createTemplate();

};spike.core.Element.prototype.constructor_0=function(){var $this=this;};spike.core.Element.prototype.rendered= false;spike.core.Element.prototype.elementId= null;spike.core.Element.prototype.elementSelector= null;spike.core.Element.prototype.compiledHtml= null;spike.core.Element.prototype.parentElement= null;spike.core.Element.prototype.childElements= [];spike.core.Element.prototype.selector= {};spike.core.Element.prototype.eventsSelectors= [];spike.core.Element.prototype.linksSelectors= [];spike.core.Element.prototype.templatePath= null;spike.core.Element.prototype.triggers= {};spike.core.Element.prototype.isClass= true;spike.core.Element.prototype.rootSelector=function(){var $this=this;

if(this.elementSelector === null){
this.elementSelector = document.getElementById(this.elementId);
}

return this.elementSelector;
};spike.core.Element.prototype.margeParams=function(params){var $this=this;

if(params){
for(var prop in params){
this[prop] = params[prop];
}
}

};spike.core.Element.prototype.include=function(childElement){var $this=this;

childElement.extractElementId();

this.childElements.push(childElement);
return childElement.compiledHtml;

};spike.core.Element.prototype.extractElementId=function(){var $this=this;

var virtualElement = document.createElement('div');
virtualElement.innerHTML = this.compiledHtml;

this.elementId = virtualElement.firstChild.id;

};spike.core.Element.prototype.createTemplatePath=function(){var $this=this;

this.templatePath = '';

var elementPath = this.getClass().split('.');

for(var i = 0; i < elementPath.length; i++){
this.templatePath += elementPath[i]+'_';
}

this.templatePath = this.templatePath.substring(0, this.templatePath.lastIndexOf('_'))+'_html';
this.templatePath = this.templatePath.toLowerCase();

return this.templatePath;

};spike.core.Element.prototype.createTemplate=function(){var $this=this;

this.compiledHtml = spike.core.Templates.compileTemplate(this, this.templatePath);
spike.core.Selectors.createUniqueSelectors(this);

};spike.core.Element.prototype.reloadElement=function(element, params){var $this=this;
};spike.core.Element.prototype.postConstructChildren=function(){var $this=this;

for(var i = 0; i < this.childElements.length; i++){
this.childElements[i].postConstruct();
}

};spike.core.Element.prototype.trigger=function(triggerName, params){var $this=this;

if(!this.triggers[triggerName]){
spike.core.Errors.throwError(spike.core.Errors.messages.TRIGGER_NOT_DEFINED, [triggerName, scope.getClass()]);
}

var triggerDestinationElement = this.selector[this.triggers[triggerName].triggerId]();

switch(this.triggers[triggerName].triggerType){
case 'T' :
triggerDestinationElement.innerHTML = spike.core.Templates.includeTemplate(this.triggers[triggerName].modulePath, params || this, this);
break;
case 'E' :
var elementInstance = spike.core.Assembler.getClassInstance(this.triggers[triggerName].modulePath, [this, params || {}]);
triggerDestinationElement.innerHTML = this.include(elementInstance);
break;
}

};spike.core.Element.prototype.addTrigger=function(triggerType, modulePath, triggerName, triggerId){var $this=this;

this.triggers[triggerName] = {
triggerId: triggerId,
modulePath: modulePath,
triggerType: triggerType
};

};spike.core.Element.prototype.addTriggerElement=function(elementClassName, triggerName, triggerId){var $this=this;

this.addTrigger('E', elementClassName, triggerName, triggerId);
return '';

};spike.core.Element.prototype.addTriggerTemplate=function(templateName, triggerName, triggerId){var $this=this;

this.addTrigger('T', templateName, triggerName, triggerId);
return '';

};spike.core.Element.prototype.destroy=function(){var $this=this;
spike.core.Events.removeEventListeners(this);

if(this.childElements.length > 0){
for(var i = 0; i < this.childElements.length; i++){
this.childElements[i].destroy();
}
}

};spike.core.Element.prototype.render=function(){var $this=this;};spike.core.Element.prototype.postConstruct=function(){var $this=this;};spike.core.Element.prototype.getSuper=function(){var $this=this; return 'null'; };spike.core.Element.prototype.getClass=function(){var $this=this; return 'spike.core.Element'; };});spike.core.Assembler.defineNamespace('spike.core.GlobalElement',function(){spike.core.GlobalElement=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.GlobalElement with arguments count: '+__args.length);}};spike.core.GlobalElement.prototype.GlobalElement=function(){this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.GlobalElement with arguments count: '+arguments.length);}};spike.core.GlobalElement.prototype.constructor_1=function(elementId){var $this=this;

this.constructor_0();
this.elementId = elementId;
this.createTemplatePath();
this.createTemplate();
this.render();

};spike.core.GlobalElement.prototype.constructor_0=function(){var $this=this;};spike.core.GlobalElement.prototype.isClass= true;spike.core.GlobalElement.prototype.render=function(){var $this=this;

this.replaceWith();

spike.core.Events.bindEvents(this);
spike.core.Router.bindLinks(this);
spike.core.Watchers.observe(this);

this.rendered = true;

this.postConstructChildren();
this.postConstruct();


};spike.core.GlobalElement.prototype.replaceWith=function(){var $this=this;

var elementDiv = document.createElement("div");
elementDiv.innerHTML = this.compiledHtml;
elementDiv.setAttribute('element-name', this.getClass());
elementDiv.setAttribute('id', this.elementId);

spike.core.System.getAppView().replaceChild(elementDiv, this.rootSelector());

this.elementSelector = document.getElementById(this.elementId);

};spike.core.GlobalElement.prototype.destroy=function(){var $this=this;
this.super().destroy();
spike.core.Watchers.unobservable(this);
};spike.core.GlobalElement.prototype.getSuper=function(){var $this=this; return 'spike.core.Element'; };spike.core.GlobalElement.prototype.getClass=function(){var $this=this; return 'spike.core.GlobalElement'; };});spike.core.Assembler.defineNamespace('spike.core.Controller',function(){spike.core.Controller=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.scrollTop= true;this.checkNetwork= true;this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.Controller with arguments count: '+__args.length);}};spike.core.Controller.prototype.Controller=function(){this.scrollTop= true;this.checkNetwork= true;this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.Controller with arguments count: '+arguments.length);}};spike.core.Controller.prototype.constructor_0=function(){var $this=this;
};spike.core.Controller.prototype.scrollTop= true;spike.core.Controller.prototype.checkNetwork= true;spike.core.Controller.prototype.isClass= true;spike.core.Controller.prototype.render=function(){var $this=this;

this.elementId = 'root';
this.elementSelector = spike.core.System.getView();
this.rootSelector().innerHTML = this.compiledHtml;

spike.core.Events.bindEvents(this);
spike.core.Router.bindLinks(this);
spike.core.Watchers.observe(this);

this.rendered = true;

this.postConstructChildren();
this.postConstruct();

};spike.core.Controller.prototype.destroy=function(){var $this=this;
this.super().destroy();
spike.core.Watchers.unobservable(this);
};spike.core.Controller.prototype.getSuper=function(){var $this=this; return 'spike.core.Element'; };spike.core.Controller.prototype.getClass=function(){var $this=this; return 'spike.core.Controller'; };});spike.core.Assembler.defineNamespace('spike.core.Modal',function(){spike.core.Modal=function(args){var __args = [];if(args && arguments.length == 1){    if(args instanceof Array){      if(arguments.length == 1 && arguments[0] instanceof Array) {           __args = args.length == 0 ? arguments : [args];       }else{           __args = args.length == 0 ? arguments : args;       }    }else{        __args = [args];    }}else{    __args = arguments;}this.visible= false;this.isClass= true;if(this['constructor_'+__args.length] !== undefined){this['constructor_'+__args.length].apply(this, __args);}else{throw new Error('Spike: No matching constructor found spike.core.Modal with arguments count: '+__args.length);}};spike.core.Modal.prototype.Modal=function(){this.visible= false;this.isClass= true;if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found spike.core.Modal with arguments count: '+arguments.length);}};spike.core.Modal.prototype.constructor_0=function(){var $this=this;

this.createTemplatePath();
this.createTemplate();
this.render();

};spike.core.Modal.prototype.visible= false;spike.core.Modal.prototype.isClass= true;spike.core.Modal.prototype.render=function(){var $this=this;

this.parentElement = spike.core.System.getModalsView();
this.elementId = 'modal-'+spike.core.Util.hash();

console.log(this.parentElement);

var modalElement = document.createElement('div');
modalElement.id = this.elementId;
modalElement = spike.core.System.modalInterface.onConstruct(modalElement);

this.parentElement.appendChild(modalElement);
this.rootSelector().innerHTML = this.compiledHtml;

spike.core.Events.bindEvents(this);
spike.core.Router.bindLinks(this);
spike.core.Watchers.observe(this);

spike.core.System.modalInterface.onRender(this);
this.rendered = true;

this.postConstructChildren();
this.postConstruct();

};spike.core.Modal.prototype.show=function(){var $this=this;
this.visible = true;
spike.core.System.modalInterface.onShow(this);
};spike.core.Modal.prototype.hide=function(){var $this=this;
this.visible = false;
spike.core.System.modalInterface.onHide(this);
};spike.core.Modal.prototype.destroy=function(){var $this=this;
spike.core.System.modalInterface.onDestroy(this);
this.visible = false;
this.super().destroy();
spike.core.Watchers.unobservable(this);
this.rootSelector().remove();
};spike.core.Modal.prototype.getSuper=function(){var $this=this; return 'spike.core.Element'; };spike.core.Modal.prototype.getClass=function(){var $this=this; return 'spike.core.Modal'; };});spike.core.Assembler.createStaticClass('spike.core','Broadcaster', 'null',function(){ return {applicationEvents: {},isClass: true,register: function (eventName) {var $this=this;

if (!spike.core.Util.isNull(this.applicationEvents[eventName])) {
spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_ALREADY_EXIST, [eventName]);
}

this.applicationEvents[eventName] = [];

},broadcast: function (eventName, eventData) {var $this=this;

if (spike.core.Util.isNull(this.applicationEvents[eventName])) {
spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_NOT_EXIST, [eventName]);
}

for(var i = 0; i < this.applicationEvents[eventName].length; i++){
this.applicationEvents[eventName][i](eventData);
}

},listen: function (eventName, eventCallback) {var $this=this;

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

},destroy: function (eventName) {var $this=this;

if (spike.core.Util.isNull(this.applicationEvents[eventName])) {
spike.core.Errors.throwError(spike.core.Errors.messages.APPLICATION_EVENT_NOT_EXIST, [eventName]);
}

this.applicationEvents[eventName] = [];

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Broadcaster'; },}});spike.core.Assembler.createStaticClass('spike.core','spike.core.Reconcile', 'null',function(){ return {isClass: true,escape: function (s) {var $this=this;
var n = s;
n = n.replace(/&/g, '&amp;');
n = n.replace(/</g, '&lt;');
n = n.replace(/>/g, '&gt;');
n = n.replace(/"/g, '&quot;');

return n;
},mapElements: function (nodes) {var $this=this;
var map = {};
var tags = {};
var node;

var indices = [];
for (var i = 0, len = nodes.length; i < len; i++) {
node = nodes[i];
var id = (node.id) ? node.id : spike.core.Reconcile.generateId(node, tags);
map[id] = node;
node._i = i;
node._id = id;
indices.push(i);
}

return {'map': map, 'indices': indices};
},generateId: function (node, tags) {var $this=this;
var tag = (node.tagName) ? node.tagName : 'x' + node.nodeType;

if (!tags[tag]) {
tags[tag] = 0;
}

tags[tag]++;

return tag + tags[tag];
},generateMoves: function (map, nodes, indices, base, reverse, index) {var $this=this;
var moves = [];
var compare = [];
var operateMap = {};
var tags = {};

for (var i = 0, len = nodes.length; i < len; i++) {
var node = nodes[reverse ? (nodes.length - i - 1) : i],
bound = base.childNodes[reverse ? (base.childNodes.length - indices[i] - 1) : indices[i]],
id = node.id ? node.id : spike.core.Reconcile.generateId(node, tags);

if (node.attributes && node.hasAttribute('assume-no-change')) {
continue;
}

if (operateMap[id]) {
continue;
}

var existing = map[id];
if (existing) {
if (existing !== bound) {
var relativeBaseIndex = (reverse ? base.childNodes.length - existing._i - 1 : existing._i);
moves.push({
'action': 'moveChildElement',
'element': existing,
'baseIndex': index + '>' + relativeBaseIndex,
'sourceIndex': index + '>' + i
});

indices.splice(i, 0, indices.splice(relativeBaseIndex, 1)[0]);
}
if (!node.isEqualNode(existing)) {
compare.push([node, existing]);
}
} else {
var inserted = node.cloneNode(true);
var relativeBaseIndex = (reverse ? nodes.length - i - 1 : i);
moves.push({
'action': 'insertChildElement',
'element': inserted,
'baseIndex': index + '>' + relativeBaseIndex,
'sourceIndex': index + '>' + relativeBaseIndex
});
}
operateMap[id] = true;
}

for (var i = 0, len = base.childNodes.length; i < len; i++) {
var remove = base.childNodes[i];
var removeId = remove._id;
if (base.childNodes[i].attributes && base.childNodes[i].hasAttribute('assume-no-change')) {
continue;
}
if (!operateMap[removeId]) {
moves.push({
'action': 'removeChildElement',
'element': remove,
'baseIndex': index + '>' + remove._i,
'sourceIndex': null
});
}
}

return {'compare': compare, 'diff': moves};
},diffString: function (source, base, index, baseElement) {var $this=this;

var o = base == "" ? [] : base.split(/\s+/);
var n = source == "" ? [] : source.split(/\s+/);
var ns = new Object();
var os = new Object();

for (var i = 0; i < n.length; i++) {
if (ns[n[i]] == null)
ns[n[i]] = {
rows: new Array(),
o: null
};
ns[n[i]].rows.push(i);
}

for (var i = 0; i < o.length; i++) {
if (os[o[i]] == null)
os[o[i]] = {
rows: new Array(),
n: null
};
os[o[i]].rows.push(i);
}

for (var i in ns) {
if (ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1) {
n[ns[i].rows[0]] = {
text: n[ns[i].rows[0]],
row: os[i].rows[0]
};
o[os[i].rows[0]] = {
text: o[os[i].rows[0]],
row: ns[i].rows[0]
};
}
}

for (var i = 0; i < n.length - 1; i++) {
if (n[i].text != null && n[i + 1].text == null && n[i].row + 1 < o.length && o[n[i].row + 1].text == null &&
n[i + 1] == o[n[i].row + 1]) {
n[i + 1] = {
text: n[i + 1],
row: n[i].row + 1
};
o[n[i].row + 1] = {
text: o[n[i].row + 1],
row: i + 1
};
}
}

for (var i = n.length - 1; i > 0; i--) {
if (n[i].text != null && n[i - 1].text == null && n[i].row > 0 && o[n[i].row - 1].text == null &&
n[i - 1] == o[n[i].row - 1]) {
n[i - 1] = {
text: n[i - 1],
row: n[i].row - 1
};
o[n[i].row - 1] = {
text: o[n[i].row - 1],
row: i - 1
};
}
}

var oSpace = base.match(/\s+/g);
if (oSpace == null) {
oSpace = [''];
} else {
oSpace.push('');
}
var nSpace = source.match(/\s+/g);
if (nSpace == null) {
nSpace = [''];
} else {
nSpace.push('');
}

var changes = [];
var baseIndex = 0;
if (n.length == 0) {
var deletedText = '';
for (var i = 0; i < o.length; i++) {
deletedText += o[i] + oSpace[i];
baseIndex += o[i].length + oSpace[i].length;
}
if (o.length > 0) {
changes.push({
'action': 'deleteText',
'element': baseElement,
'baseIndex': index,
'sourceIndex': index,
'_textStart': 0,
'_textEnd': baseIndex,
'_deleted': deletedText,
'_length': deletedText.length
});
}
} else {
var current = null;
if (n[0].text == null) {
for (var i = 0; i < o.length; i++) {
if (o[i].text != null) {
if (current != null) {
changes.push(current);
}
current = null;
continue;
}

if (current == null) {
current = {
'action': 'deleteText',
'element': baseElement,
'baseIndex': index,
'sourceIndex': index,
'_textStart': baseIndex,
'_textEnd': 0,
'_deleted': '',
'_length': 0
};
}

current['_deleted'] += o[i] + oSpace[i];
current['_length'] = current['_deleted'].length;
baseIndex += current['_length'];
current['_textEnd'] = baseIndex;
}

if (current != null) {
changes.push(current);
current = null;
}
}

var k = 0;
for (var i = 0; i < n.length; i++) {
if (n[i].text == null) {

if (current != null && current['action'] === 'deleteText') {
changes.push(current);
current = null;
}

if (current == null) {
current = {
'action': 'insertText',
'element': baseElement,
'baseIndex': index,
'sourceIndex': index,
'_textStart': baseIndex,
'_textEnd': 0,
'_inserted': '',
'_length': 0
};
}

current['_inserted'] += n[i] + nSpace[i];
current['_length'] = current['_inserted'].length;
baseIndex += current['_length'];
current['_textEnd'] = baseIndex;

} else {
baseIndex += n[i].text.length + nSpace[i].length;
if (n[k].text == null) {
continue;
}
for (k = n[k].row + 1; k < o.length && o[k].text == null; k++) {
if (current != null && current['action'] === 'insertText') {
changes.push(current);
current = null;
}

if (current == null) {
current = {
'action': 'deleteText',
'element': baseElement,
'baseIndex': index,
'sourceIndex': index,
'_textStart': baseIndex,
'_textEnd': 0,
'_deleted': '',
'_length': 0
};
}

current['_deleted'] += o[k] + oSpace[k];
current['_length'] = current['_deleted'].length;
baseIndex += current['_length'];
current['_textEnd'] = baseIndex;
}
}
}

if (current != null) {
changes.push(current);
current = null;
}
}

return changes;
},mapStyleValues: function (styleString) {var $this=this;
var attrs = styleString ? styleString.replace(/\/\*.*\*\//g, '')
.split(/;(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/)
: [];
var map = {};
for (var i = 0; i < attrs.length; i++) {
var item = attrs[i].trim();
if (!item) {
continue;
}
var index = item.indexOf(':');
var name = item.slice(0, index).trim();
var value = item.slice(index + 1).trim();
if (name.length === 0 || value.length === 0) {
continue;
}
map[name] = value;
}
return map;
},diffStyleString: function (source, base, index, baseElement) {var $this=this;
var diffActions = [];

var sourceMap = spike.core.Reconcile.mapStyleValues(source);
var baseMap = spike.core.Reconcile.mapStyleValues(base);
for (var k in sourceMap) {
var sourceVal = sourceMap[k];
var baseVal = baseMap[k];
if (sourceVal != baseVal) {
diffActions.push({
'action': 'setStyleValue',
'name': k,
'element': baseElement,
'baseIndex': index,
'sourceIndex': index,
'_deleted': baseVal,
'_inserted': sourceVal
});
}
}

for (var k in baseMap) {
if (sourceMap[k] == null) {
diffActions.push({
'action': 'removeStyleValue',
'name': k,
'element': baseElement,
'baseIndex': index,
'sourceIndex': index,
'_deleted': baseMap[k]
});
}
}

return diffActions;
},diff: function (source, base, index) {var $this=this;
var diffActions = [];
if (index == null) {
index = '0'; // 0 for root node
}
if (source.nodeType === base.nodeType && (source.nodeType === 3 || source.nodeType === 8)) {
if (base.nodeValue !== source.nodeValue) {
var textActions = spike.core.Reconcile.diffString(source.nodeValue, base.nodeValue, index, base);
if (textActions.length > 0) {
diffActions = diffActions.concat(textActions);
}
}

return diffActions;
}

if (source.attributes && base.attributes) {
var attributes = source.attributes,
value,
name;

for (var i = attributes.length; i--;) {
value = attributes[i].nodeValue;
name = attributes[i].nodeName;

var val = base.getAttribute(name);
if (val !== value) {
if (val == null) {
diffActions.push({
'action': 'setAttribute',
'name': name,
'element': base,
'baseIndex': index,
'sourceIndex': index,
'_inserted': value
});
} else {
if (name === 'style') {
var styleChanges = spike.core.Reconcile.diffStyleString(value, val, index, base);
if (styleChanges.length > 0) {
diffActions = diffActions.concat(styleChanges);
}
} else {
diffActions.push({
'action': 'setAttribute',
'name': name,
'element': base,
'baseIndex': index,
'sourceIndex': index,
'_deleted': val,
'_inserted': value
});
}
}
}
}

attributes = base.attributes;
for (var i = attributes.length; i--;) {
name = attributes[i].nodeName;
if (source.getAttribute(name) === null) {
diffActions.push({
'action': 'removeAttribute',
'name': name,
'baseIndex': index,
'sourceIndex': index,
'_deleted': attributes[i].nodeValue
});
}
}
}

var compare = [];
if (source.childNodes && base.childNodes) {
var mapResult = spike.core.Reconcile.mapElements(base.childNodes),
nodes = source.childNodes;

var map = mapResult['map'];
var indices = mapResult['indices'];

var moves = spike.core.Reconcile.generateMoves(map, nodes, indices.slice(0), base, false, index);
if (moves['diff'].length > 1) {
var backwardMoves = spike.core.Reconcile.generateMoves(map, nodes, indices.slice(0), base, true, index);
if (backwardMoves['diff'].length < moves['diff'].length) {
moves = backwardMoves;
}
}
diffActions = diffActions.concat(moves['diff']);
compare = moves['compare'];
}

if (compare.length > 0) {
for (var i = 0, len = compare.length; i < len; i++) {
var sourceChildNode = compare[i][0];
var baseChildNode = compare[i][1];

var childDiffs = spike.core.Reconcile.diff(
sourceChildNode,
baseChildNode, index + '>' +
baseChildNode._i);

if (childDiffs.length > 0) {
diffActions = diffActions.concat(childDiffs);
}

delete baseChildNode._i;
delete baseChildNode._id;
}
}

return diffActions;
},sortChange: function (a, b) {var $this=this;
if (a['sourceIndex'] === b['sourceIndex']) {
if (a['_textStart'] && b['_textStart']) {
return (a['_textStart'] > b['_textStart']) ? 1 : -1;
}
return 0;
} else if (!a['sourceIndex'] && b['sourceIndex']) {
return -1;
} else if (a['sourceIndex'] && !b['sourceIndex']) {
return 1;
}
var aIndices = a['sourceIndex'].split('>');
var bIndices = b['sourceIndex'].split('>');
var equal = true;
var i = 0;
while (equal && i < aIndices.length && i < bIndices.length) {
var aN = parseInt(aIndices[i], 10);
var bN = parseInt(bIndices[i], 10);
if (aN === bN) {
i++;
continue;
} else if (isNaN(aN) || isNaN(bN)) {
return isNaN(aN) ? 1 : -1;
} else {
return (aN > bN) ? 1 : -1;
}
}

return 0;
},findChildAtIndex: function (node, index) {var $this=this;
if (!index || !node.childNodes || node.childNodes.length === 0) {
return null;
}

var result = {};
var indices = index.split('>');
var found = true;
var lastParentIndex = '';
for (var i = 1, len = indices.length; i < len; i++) {
var nodeIndex = parseInt(indices[i], 10);
if (node.childNodes && node.childNodes.length > nodeIndex) {
node = node.childNodes[nodeIndex];
} else {
lastParentIndex = indices.slice(0, i - 1).join('>');
found = false;
break;
}
}

result['lastParent'] = found ? node.parentNode : node;
result['lastParentIndex'] = found ? index.slice(0, index.lastIndexOf('>')) : lastParentIndex;
result['node'] = found ? node : null;
result['found'] = found;
return result;
},apply: function (changes, base, force, showChanges) {var $this=this;
var unapplied = [];
var moves = [];
var removals = [];
var conflictChanges = [];
var textChanges = {};
var styleChanges = {};
for (var c = 0, cLen = changes.length; c < cLen; c++) {
var change = changes[c];
var action = change['action'];
var baseIndex = change['baseIndex'];
var sourceIndex = change['sourceIndex'];
var baseReference = change['_baseReference'];
var sourceReference = change['_sourceReference'];

if (change['_conflict'] && !force) {
change['_baseReference'] = spike.core.Reconcile.findChildAtIndex(base, baseIndex);
if (sourceIndex && baseIndex !== sourceIndex) {
change['_sourceReference'] = spike.core.Reconcile.findChildAtIndex(base, sourceIndex);
}
conflictChanges.push(change);
continue;
}

var node = null;
var findBaseChildResult = baseReference;
if (findBaseChildResult == null) {
findBaseChildResult = spike.core.Reconcile.findChildAtIndex(base, baseIndex);
if (findBaseChildResult == null) {
unapplied.push(change);
continue;
}
}

var node = findBaseChildResult['node'];
if (!findBaseChildResult['found']) {
if (action === 'insertChildElement') {
var lastParent = findBaseChildResult['lastParent'];
var insertion = change['element'];
if (showChanges) {
var insNode = document.createElement('ins');
ins.appendChild(insertion);
insertion = ins;
}
moves.push({
'parent': lastParent,
'insertion': insertion,
'source': null,
'change': change,
'appendOnly': false
});
} else {
unapplied.push(change);
}
continue;
}

if (node === null) {
continue;
}

if (action === 'moveChildElement' || action === 'insertChildElement') {
var sourceNode = node;
if (sourceIndex !== baseIndex) {
var findSourceChildResult = sourceReference;
if (findSourceChildResult == null) {
findSourceChildResult = spike.core.Reconcile.findChildAtIndex(base, sourceIndex);
}
sourceNode = findSourceChildResult !== null ? findSourceChildResult['node'] : null;
}

if (action === 'moveChildElement') {
moves.push({
'parent': node.parentNode,
'insertion': node,
'source': sourceNode,
'change': change,
'appendOnly': false
});
} else {
var insertion = change['element'];
if (showChanges) {
var insNode = document.createElement('ins');
insNode.appendChild(insertion);
insertion = insNode;
}
moves.push({
'parent': node.parentNode,
'insertion': insertion,
'source': sourceNode,
'change': change,
'appendOnly': false
});
}

} else if (action === 'removeChildElement') {
if (showChanges) {
var delNode = document.createElement('del');
delNode.appendChild(node.cloneNode(true));
moves.push({
'parent': node.parentNode,
'insertion': delNode,
'source': null,
'change': change,
'appendOnly': true
});
}
removals.push([node.parentNode, node]);
} else if (action === 'deleteText' || action === 'insertText' ||
action === 'setStyleValue' || action === 'removeStyleValue') {
var existingOp = textChanges[change['baseIndex']];
if (!existingOp) {
existingOp = {
'parent': node.parentNode,
'source': node,
'changes': []
};
}

existingOp['changes'].push(change);
if (action === 'insertText' || action === 'deleteText') {
textChanges[change['baseIndex']] = existingOp;
} else {
styleChanges[change['baseIndex']] = existingOp;
}
} else if (action === 'replaceText') {
if (!showChanges) {
node.nodeValue = change['_inserted'];
} else {
var deletionNode = document.createElement('del');
deletionNode.appendChild(document.createTextNode(change['_deleted']));
var insertionNode = document.createElement('ins');
insertionNode.appendChild(document.createTextNode(change['_inserted']));
moves.push({
'parent': node.parentNode,
'insertion': deletionNode,
'source': node,
'change': change,
'appendOnly': false
});
moves.push({
'parent': node.parentNode,
'insertion': insertionNode,
'source': node,
'change': change,
'appendOnly': false
});
node.nodeValue = '';
}
} else if (action === 'setAttribute') {
node.setAttribute(change['name'], change['_inserted']);
} else if (action === 'removeAttribute') {
node.removeAttribute(change['name']);
}
}

moves.sort(function (a, b) {
return spike.core.Reconcile.sortChange(a['change'], b['change']);
});
for (var i = 0, len = moves.length; i < len; i++) {
var move = moves[i];
var parent = move['parent'],
insertion = move['insertion'],
source = move['source'],
change = move['change'],
appendOnly = move['appendOnly'];

if (source === null && !appendOnly) {
var sourceIndex = change['sourceIndex'];
if (sourceIndex) {
var lastIndexStr = sourceIndex.substr(sourceIndex.lastIndexOf('>') + 1, sourceIndex.length);
var childIndex = parseInt(lastIndexStr, 10);
if (parent.childNodes && parent.childNodes.length > childIndex) {
source = parent.childNodes[childIndex];
}
}
}
parent.insertBefore(insertion, source);
}

for (var i = 0; i < removals.length; i++) {
var removal = removals[i];
removal[0].removeChild(removal[1]);
}

for (var b in textChanges) {
var nodeChanges = textChanges[b];
var node = nodeChanges['source'];
var value = node.nodeValue;
var nodeOps = nodeChanges['changes'];
nodeOps.sort(function (a, b) {
return a['_textStart'] > b['_textStart'] ? 1 : -1;
});
var newStr = '';
var valueIndex = 0;
for (var i = 0; i < nodeOps.length; i++) {
var op = nodeOps[i];
if (op['action'] === 'insertText') {
newStr += value.substr(valueIndex, op['_textStart']);
if (showChanges) {
newStr += '<ins>' + spike.core.Reconcile.escape(op['_inserted']) + '</ins>';
} else {
newStr += op['_inserted'];
}
if (valueIndex === op['_textStart']) {
newStr += value.substr(valueIndex, op['_textEnd']);
}
} else {
newStr += value.substr(valueIndex, op['_textStart']);
if (!!showChanges) {
newStr += ('<del>' + spike.core.Reconcile.escape(op['_deleted']) + '</del>');
}
}
valueIndex = op['_textEnd'];
}
newStr += value.substr(valueIndex);

if (!showChanges) {
node.nodeValue = newStr;
} else {
node.innerHTML = newStr;
}
}

for (var b in styleChanges) {
var nodeChanges = styleChanges[b];
var node = nodeChanges['source'];
var nodeOps = nodeChanges['changes'];

var styleMap = spike.core.Reconcile.mapStyleValues(node.getAttribute('style'));
for (var i = 0; i < nodeOps.length; i++) {
var op = nodeOps[i];
if (op['action'] === 'setStyleValue') {
styleMap[op['name']] = op['_inserted'];
} else {
delete styleMap[op['name']];
}
}

var str = [];
for (var k in styleMap) {
str.push(k + ': ' + styleMap[k]);
}

if (str.length > 0) {
node.setAttribute('style', str.join(';') + (str.length === 1 ? ';' : ''));
} else {
node.removeAttribute('style');
}
}

var conflicts = [];
while (conflictChanges.length > 0) {
var change = conflictChanges.pop();
var conflict = {
'mine': [],
'theirs': []
};
conflict[change['_owner']].push(change);
if (change['_conflictedWith']) {
var conflictedWithChange = change['_conflictedWith'];
if (conflictedWithChange) {
for (var k = 0; k < conflictedWithChange.length; k++) {
var conflictedWithItem = conflictedWithChange[k];
var i = conflictChanges.indexOf(conflictedWithItem);
if (i > -1) {
conflictChanges.splice(i, 1);
conflict[conflictedWithItem['_owner']].push(conflictedWithItem);
}
if (conflictedWithItem['_conflictedWith']) {
for (var s = 0; s < conflictedWithItem['_conflictedWith'].length; s++) {
var item = conflictedWithItem['_conflictedWith'][s];
var i = conflictChanges.indexOf(item);
if (i > -1) {
conflictChanges.splice(i, 1);
conflict[item['_owner']].push(item);
}

delete item['_conflictedWith'];
}
}

delete conflictedWithItem['_conflictedWith'];
}

delete change['_conflictedWith'];
}
}
conflicts.push(conflict);
}

return {'unapplied': unapplied, 'conflicts': conflicts};
},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Reconcile'; },}});spike.core.Assembler.createStaticClass('spike.core','Watchers', 'null',function(){ return {watchers: {},scopes: {},observables: [],excludedProperties: [
'childElements',
'parentElement',
'eventsSelectors',
'linksSelectors',
'compiledHtml',
'elementSelector',
'templatePath',
'selector'
],isClass: true,update: function(scope, watcherName){var $this=this;
this.compileWatchers(scope, watcherName);
},compileWatchers: function(scope, watcherName){var $this=this;

var wasChanged = false;
var watchers = [];

if(this.watchers[spike.core.Assembler.sourcePath+"_"+scope.templatePath]){
watchers = this.watchers[spike.core.Assembler.sourcePath+"_"+scope.templatePath](scope);
}

if(watchers.length > 0){

var virtualDom = scope.rootSelector();
var watchElements = [];

if(watcherName){
watchElements = virtualDom.querySelectorAll('[sp-watch="'+watcherName+'"]');
}else {
watchElements = virtualDom.querySelectorAll('[sp-watch]');
}

for(var i = 0; i < watchElements.length; i++){


if(watcherName !== watchElements[i].getAttribute('sp-watch') && watchElements[i].getAttribute('sp-watch-manual') !== null){
continue;
}

for(var k = 0; k < watchers.length; k++){

if(watchers[k][0] === watchElements[i].getAttribute('sp-watch')){

var currentHtml = watchElements[i].outerHTML;
var watcherHtml = $this.fillAutoSelectors(watchers[k][1], currentHtml);;

if(spike.core.Util.hashString(watcherHtml) !== spike.core.Util.hashString(currentHtml)){

spike.core.Log.log('Watcher reflow needed');

$this.replaceChangedElements(watcherHtml, watchElements[i]);
wasChanged = true;

}

}

}

}

}

if(wasChanged === true){
spike.core.Events.bindEvents(scope);
spike.core.Router.bindLinks(scope);
}

},replaceChangedElements: function(watcherHtml, currentElement){var $this=this;

var watcherVirtual = document.createElement('div');
watcherVirtual.innerHTML = watcherHtml;

if(currentElement.innerHTML.length === 0){
document.getElementById(currentElement.id).innerHTML = watcherVirtual.firstChild.innerHTML;
}else{

var changes = spike.core.Reconcile.diff(watcherVirtual.firstChild, currentElement);
spike.core.Reconcile.apply(changes, document.getElementById(currentElement.id));

}

},fillAutoSelectors: function(watcherHtml, currentHtml){var $this=this;

var idListFromWatcher = spike.core.Util.findStringBetween(watcherHtml, 'id="','"');
var idListFromCurrent = spike.core.Util.findStringBetween(currentHtml, 'id="','"');
var replaced = {};

for(var i = 0; i < idListFromWatcher.length; i++){

for(var k = 0; k < idListFromCurrent.length; k++){

if(idListFromCurrent[k].indexOf(idListFromWatcher[i]) > -1 && !replaced[idListFromCurrent[k]] ){
watcherHtml = watcherHtml.replace('id="'+idListFromWatcher[i]+'"', 'id="'+idListFromCurrent[k]+'"');
replaced[idListFromCurrent[k]] = true;
}else if(idListFromCurrent[k].indexOf(idListFromWatcher[i]) > -1 && replaced[idListFromCurrent[k]]){
watcherHtml = watcherHtml.replace('id="'+idListFromWatcher[i]+'"', 'id="gen-'+spike.core.Util.hash()+'"');
}

}

}

var namesListFromWatcher = spike.core.Util.findStringBetween(watcherHtml, ' name="','"');
var namesListFromCurrent = spike.core.Util.findStringBetween(currentHtml, ' name="','"');

for(var i = 0; i < namesListFromWatcher.length; i++){

for(var k = 0; k < namesListFromCurrent.length; k++){

if(namesListFromCurrent[k].indexOf(namesListFromWatcher[i]) > -1){
watcherHtml = watcherHtml.replace(' name="'+namesListFromWatcher[i]+'"', ' name="'+namesListFromCurrent[k]+'"');
}

}

}

return watcherHtml;

},cleanAutoSelectors: function(html){var $this=this;

var element = document.createElement('div');
element.innerHTML = html;

var idElements = element.querySelectorAll('[id]');
for(var i = 0; i < idElements.length; i++){
idElements[i].setAttribute('id', '');
}

var nameElements = element.querySelectorAll('[name]');
for(var i = 0; i < nameElements.length; i++){
nameElements[i].setAttribute('name', '');
}

return element.innerHTML;

},observe: function(scope){var $this=this;
this.observables.push(scope);
},unobservable: function(scope){var $this=this;

var index = -1;
for(var i = 0; i < this.observables.length; i++){

if(this.observables[i].getClass() === scope.getClass() && this.observables[i].elementId === scope.elementId){
this.observables.splice(i, 1);
break;
}

}

},stringifyScope: function(scope){var $this=this;

var stringify = '';

for(var key in scope) {
if(typeof scope[key] !== 'function'){

if($this.excludedProperties.indexOf(key) == -1){
stringify += key + JSON.stringify(scope[key]);
}

}

}

return stringify;

},detectScopeChange: function(scope){var $this=this;

var stringify = $this.stringifyScope(scope);

if(stringify !== $this.scopes[scope.elementId]){
spike.core.Log.log('scope changed during lifecycle');
$this.compileWatchers(scope);
}

$this.scopes[scope.elementId] = stringify;

},createWatchLoop: function(scope){var $this=this;

setTimeout(function(){

for(var i = 0; i < $this.observables.length; i++){
$this.detectScopeChange($this.observables[i]);
}

$this.createWatchLoop();

}, 100)

},getSuper:function(){var $this=this; return 'null'; },getClass:function(){var $this=this; return 'spike.core.Watchers'; },}});spike.core.Assembler.dependencies(function(){spike.core.Assembler.extend(spike.core.Element.prototype,spike.core.GlobalElement.prototype);spike.core.Assembler.extend(spike.core.Element.prototype,spike.core.Controller.prototype);spike.core.Assembler.extend(spike.core.Element.prototype,spike.core.Modal.prototype);});(function (history) {

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

})(window.history);

