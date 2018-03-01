spike.core.Assembler.resetNamespaces(7, 'app');spike.core.Assembler.defineNamespace('app.Config',function(){app.Config=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Config with arguments count: '+args.length);}};app.Config.prototype.Config=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.Config with arguments count: '+arguments.length);}};app.Config.prototype.constructor_0=function(){var $this=this;};app.Config.prototype.languageFilePath= "i18/{lang}.json";app.Config.prototype.html5Mode= true;app.Config.prototype.isClass= true;app.Config.prototype.getSuper=function(){var $this=this; return 'spike.core.Config'; };app.Config.prototype.getClass=function(){var $this=this; return 'app.Config'; };});spike.core.Assembler.defineNamespace('app.Events',function(){app.Events=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Events with arguments count: '+args.length);}};app.Events.prototype.Events=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.Events with arguments count: '+arguments.length);}};app.Events.prototype.constructor_0=function(){var $this=this;};app.Events.prototype.isClass= true;app.Events.prototype.onRender=function(){var $this=this;

spike.core.Log.log('App onRender event');
};app.Events.prototype.getSuper=function(){var $this=this; return 'spike.core.EventsInterface'; };app.Events.prototype.getClass=function(){var $this=this; return 'app.Events'; };});spike.core.Assembler.defineNamespace('app.Loader',function(){app.Loader=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Loader with arguments count: '+args.length);}};app.Loader.prototype.Loader=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.Loader with arguments count: '+arguments.length);}};app.Loader.prototype.constructor_0=function(){var $this=this;};app.Loader.prototype.isClass= true;app.Loader.prototype.loadApplication=function(){var $this=this;

spike.core.System.setConfig(new app.Config([]));
spike.core.System.setRouting(new app.Routing([]));
spike.core.System.setEventsInterface(new app.Events([]));

spike.core.Log.log('Load application done');

spike.core.Rest.interceptor("Request", function(response, promise){
spike.core.Log.log('Invoke Request interceptor');
});

spike.core.Broadcaster.register('SomeEvent');

};app.Loader.prototype.getSuper=function(){var $this=this; return 'spike.core.LoaderInterface'; };app.Loader.prototype.getClass=function(){var $this=this; return 'app.Loader'; };});spike.core.Assembler.defineNamespace('app.Routing',function(){app.Routing=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Routing with arguments count: '+args.length);}};app.Routing.prototype.Routing=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.Routing with arguments count: '+arguments.length);}};app.Routing.prototype.constructor_0=function(){var $this=this;};app.Routing.prototype.isClass= true;app.Routing.prototype.create=function(router){var $this=this;
router.path('/', { controller: 'app.controller.home.Home' });
};app.Routing.prototype.getSuper=function(){var $this=this; return 'spike.core.RoutingInterface'; };app.Routing.prototype.getClass=function(){var $this=this; return 'app.Routing'; };});spike.core.Assembler.defineNamespace('app.controller.home.Home',function(){app.controller.home.Home=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.controller.home.Home with arguments count: '+args.length);}};app.controller.home.Home.prototype.Home=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.controller.home.Home with arguments count: '+arguments.length);}};app.controller.home.Home.prototype.constructor_0=function(){var $this=this;
spike.core.Log.log('run Home from constructor before render');
};app.controller.home.Home.prototype.isClass= true;app.controller.home.Home.prototype.postConstruct=function(){var $this=this;
spike.core.Log.log('run Home postConstruct after render');
};app.controller.home.Home.prototype.getSuper=function(){var $this=this; return 'spike.core.Controller'; };app.controller.home.Home.prototype.getClass=function(){var $this=this; return 'app.controller.home.Home'; };});spike.core.Assembler.defineNamespace('app.element.global.navigation.Navigation',function(){app.element.global.navigation.Navigation=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.element.global.navigation.Navigation with arguments count: '+args.length);}};app.element.global.navigation.Navigation.prototype.Navigation=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.element.global.navigation.Navigation with arguments count: '+arguments.length);}};app.element.global.navigation.Navigation.prototype.constructor_0=function(){var $this=this;
spike.core.Log.log('run Navigation from constructor  before render');
};app.element.global.navigation.Navigation.prototype.isClass= true;app.element.global.navigation.Navigation.prototype.postConstruct=function(){var $this=this;
spike.core.Log.log('run Navigation postConstruct after render');
};app.element.global.navigation.Navigation.prototype.getSuper=function(){var $this=this; return 'spike.core.GlobalElement'; };app.element.global.navigation.Navigation.prototype.getClass=function(){var $this=this; return 'app.element.global.navigation.Navigation'; };});spike.core.Assembler.defineNamespace('app.element.header.Header',function(){app.element.header.Header=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.element.header.Header with arguments count: '+args.length);}};app.element.header.Header.prototype.Header=function(){if(this['constructor_'+arguments.length] !== undefined){this['constructor_'+arguments.length].apply(this, arguments);}else{throw new Error('Spike: No matching constructor found app.element.header.Header with arguments count: '+arguments.length);}};app.element.header.Header.prototype.constructor_0=function(){var $this=this;
spike.core.Log.log('run Header from constructor  before render');
};app.element.header.Header.prototype.isClass= true;app.element.header.Header.prototype.postConstruct=function(){var $this=this;
spike.core.Log.log('run Header postConstruct after render');
};app.element.header.Header.prototype.getSuper=function(){var $this=this; return 'spike.core.Element'; };app.element.header.Header.prototype.getClass=function(){var $this=this; return 'app.element.header.Header'; };});spike.core.Assembler.dependencies(function(){spike.core.Assembler.extend(spike.core.Config.prototype,app.Config.prototype);spike.core.Assembler.extend(spike.core.Element.prototype,app.element.header.Header.prototype);spike.core.Assembler.extend(spike.core.LoaderInterface.prototype,app.Loader.prototype);spike.core.Assembler.extend(spike.core.EventsInterface.prototype,app.Events.prototype);spike.core.Assembler.extend(spike.core.Controller.prototype,app.controller.home.Home.prototype);spike.core.Assembler.extend(spike.core.RoutingInterface.prototype,app.Routing.prototype);spike.core.Assembler.extend(spike.core.GlobalElement.prototype,app.element.global.navigation.Navigation.prototype);});