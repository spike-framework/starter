spike.core.Assembler.resetNamespaces(5, 'app');spike.core.Assembler.defineNamespace('app.Config',function(){app.Config=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Config with arguments count: '+args.length);}};app.Config.prototype.constructor_0=function(){var $this=this;};app.Config.prototype.languageFilePath= "i18/{lang}.json";app.Config.prototype.getSuper=function(){var $this=this; return 'spike.core.Config'; };app.Config.prototype.getClass=function(){var $this=this; return 'app.Config'; };});spike.core.Assembler.defineNamespace('app.Events',function(){app.Events=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Events with arguments count: '+args.length);}};app.Events.prototype.constructor_0=function(){var $this=this;};app.Events.prototype.onRender=function(){var $this=this;

spike.core.Log.log('App onRender event');
};app.Events.prototype.getSuper=function(){var $this=this; return 'spike.core.EventsInterface'; };app.Events.prototype.getClass=function(){var $this=this; return 'app.Events'; };});spike.core.Assembler.defineNamespace('app.Loader',function(){app.Loader=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Loader with arguments count: '+args.length);}};app.Loader.prototype.constructor_0=function(){var $this=this;};app.Loader.prototype.loadApplication=function(){var $this=this;

spike.core.System.setConfig(new app.Config([]));
spike.core.System.setRouting(new app.Routing([]));
spike.core.System.setEventsInterface(new app.Events([]));

spike.core.Log.log('Load application done');

spike.core.Rest.interceptor("Request", function(response, promise){
spike.core.Log.log('Invoke Request interceptor');
});

spike.core.Broadcaster.register('SomeEvent');

};app.Loader.prototype.getSuper=function(){var $this=this; return 'spike.core.LoaderInterface'; };app.Loader.prototype.getClass=function(){var $this=this; return 'app.Loader'; };});spike.core.Assembler.defineNamespace('app.Routing',function(){app.Routing=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.Routing with arguments count: '+args.length);}};app.Routing.prototype.constructor_0=function(){var $this=this;};app.Routing.prototype.create=function(router){var $this=this;
router.path('/', { controller: 'app.controller.home.Home' });
};app.Routing.prototype.getSuper=function(){var $this=this; return 'spike.core.RoutingInterface'; };app.Routing.prototype.getClass=function(){var $this=this; return 'app.Routing'; };});spike.core.Assembler.defineNamespace('app.controller.home.Home',function(){app.controller.home.Home=function(args){if(this['constructor_'+args.length] !== undefined){this['constructor_'+args.length].apply(this, args);}else{throw new Error('Spike: No matching constructor found app.controller.home.Home with arguments count: '+args.length);}};app.controller.home.Home.prototype.constructor_0=function(){var $this=this;

spike.core.Log.log('spike.core.Controller Home initialized');
console.log(this);

this.model.customerName = 'Mateusz';
this.model.amount = 8000;
this.model.type = 'PAYOUT';
this.model.accountName = 'mKonto';
this.model.phoneNumber = '666 334 111';
this.model.comment = 'Wyplata';

this.model.depositFormBank = true;

};app.controller.home.Home.prototype.model= {
customerName: '',
amount: 0,
type: '',
accountName: '',
phoneNumber: '',
comment: '',
depositFormBank: false,
};app.controller.home.Home.prototype.getSuper=function(){var $this=this; return 'spike.core.Controller'; };app.controller.home.Home.prototype.getClass=function(){var $this=this; return 'app.controller.home.Home'; };});spike.core.Assembler.dependencies(function(){spike.core.Assembler.extend(spike.core.Config.prototype,app.Config.prototype);spike.core.Assembler.extend(spike.core.Controller.prototype,app.controller.home.Home.prototype);spike.core.Assembler.extend(spike.core.RoutingInterface.prototype,app.Routing.prototype);spike.core.Assembler.extend(spike.core.LoaderInterface.prototype,app.Loader.prototype);spike.core.Assembler.extend(spike.core.EventsInterface.prototype,app.Events.prototype);});