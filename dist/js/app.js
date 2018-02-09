spike.core.Assembler.resetNamespaces(5, 'app');spike.core.Assembler.defineNamespace('app',['Config'],function(){app.Config=function(){var $this=this;};app.Config.prototype.getSuper=function(){var $this=this; return 'spike.core.Config'; };app.Config.prototype.getClass=function(){var $this=this; return 'app.Config'; };});spike.core.Assembler.defineNamespace('app',['Events'],function(){app.Events=function(){var $this=this;};app.Events.prototype.onRender=function(){var $this=this;

spike.core.Log.log('App onRender event');
};app.Events.prototype.getSuper=function(){var $this=this; return 'spike.core.EventsInterface'; };app.Events.prototype.getClass=function(){var $this=this; return 'app.Events'; };});spike.core.Assembler.defineNamespace('app',['Loader'],function(){app.Loader=function(){var $this=this;};app.Loader.prototype.loadApplication=function(){var $this=this;

spike.core.System.setConfig(new app.Config());
spike.core.System.setRouting(new app.Routing());
spike.core.System.setEventsInterface(new app.Events());

spike.core.Log.log('Load application done');

spike.core.Message.add("en", "i18/en.json").then(function(){
spike.core.Log.log('Language EN loaded');
});

spike.core.Rest.interceptor("Request", function(response, promise){
spike.core.Log.log('invoke Request interceptor');
});

spike.core.Broadcaster.register('SomeEvent');

};app.Loader.prototype.getSuper=function(){var $this=this; return 'spike.core.LoaderInterface'; };app.Loader.prototype.getClass=function(){var $this=this; return 'app.Loader'; };});spike.core.Assembler.defineNamespace('app',['Routing'],function(){app.Routing=function(){var $this=this;};app.Routing.prototype.create=function(router){var $this=this;

router.path('/', { controller: 'app.controller.home.Home' });

};app.Routing.prototype.getSuper=function(){var $this=this; return 'spike.core.RoutingInterface'; };app.Routing.prototype.getClass=function(){var $this=this; return 'app.Routing'; };});spike.core.Assembler.defineNamespace('app.controller.home',['Home'],function(){app.controller.home.Home=function(){var $this=this;

spike.core.Log.log('spike.core.Controller Home initialized');

this.model.customerName = 'Mateusz M.';
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
};app.controller.home.Home.prototype.getSuper=function(){var $this=this; return 'spike.core.Controller'; };app.controller.home.Home.prototype.getClass=function(){var $this=this; return 'app.controller.home.Home'; };});spike.core.Assembler.dependencies(function(){app.controller.home.Home_1=spike.core.Controller_1;app.controller.home.Home_2=spike.core.Controller_2;spike.core.Assembler.extend(spike.core.Config.prototype,app.Config.prototype);spike.core.Assembler.extend(spike.core.Controller.prototype,app.controller.home.Home.prototype);spike.core.Assembler.extend(spike.core.Controller_1.prototype,app.controller.home.Home_1.prototype);spike.core.Assembler.extend(spike.core.Controller_2.prototype,app.controller.home.Home_2.prototype);spike.core.Assembler.extend(spike.core.RoutingInterface.prototype,app.Routing.prototype);spike.core.Assembler.extend(spike.core.LoaderInterface.prototype,app.Loader.prototype);spike.core.Assembler.extend(spike.core.EventsInterface.prototype,app.Events.prototype);});spike.core.Assembler.setConstructorsMap({'app.Loader':{'0':'app.Loader',},'spike.core.Util':{'0':'spike.core.Util',},'app.Config':{'0':'app.Config',},'spike.core.Templates':{'0':'spike.core.Templates',},'spike.core.Broadcaster':{'0':'spike.core.Broadcaster',},'spike.core.Rest':{'0':'spike.core.Rest',},'spike.core.Events':{'0':'spike.core.Events',},'spike.core.Router':{'0':'spike.core.Router',},'spike.core.Message':{'0':'spike.core.Message',},'spike.core.Config':{'0':'spike.core.Config',},'spike.core.Element':{'0':'spike.core.Element','2':'spike.core.Element_2',},'app.Routing':{'0':'app.Routing',},'spike.core.LoaderInterface':{'0':'spike.core.LoaderInterface',},'spike.core.EventsInterface':{'0':'spike.core.EventsInterface',},'spike.core.Modal':{'1':'spike.core.Modal_1','0':'spike.core.Modal','2':'spike.core.Modal_2',},'spike.core.ModalInterface':{'0':'spike.core.ModalInterface',},'spike.core.Errors':{'0':'spike.core.Errors',},'spike.core.Request':{'1':'spike.core.Request_1','0':'spike.core.Request',},'spike.core.Controller':{'0':'spike.core.Controller','1':'spike.core.Controller_1','2':'spike.core.Controller_2',},'app.Events':{'0':'app.Events',},'spike.core.RoutingInterface':{'0':'spike.core.RoutingInterface',},'spike.core.Selectors':{'0':'spike.core.Selectors',},'app.controller.home.Home':{'0':'app.controller.home.Home','1':'app.controller.home.Home_1','2':'app.controller.home.Home_2',},'spike.core.GlobalElement':{'0':'spike.core.GlobalElement','2':'spike.core.GlobalElement_2',},'spike.core.System':{'0':'spike.core.System',},'spike.core.Log':{'0':'spike.core.Log',},});