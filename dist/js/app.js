var __spike_tn = 5;
spike.core.Assembler.defineNamespace('app', ['Config'], function () {
    app.Config = function () {
        app.Config.prototype = new spike.core.Config();
    };
    app.Config.prototype.getSuper = function () {
        return 'spike.core.Config';
    };
    app.Config.prototype.getClass = function () {
        return 'app.Config';
    };
});
spike.core.Assembler.defineNamespace('app', ['Events'], function () {
    app.Events = function () {
        app.Events.prototype = new spike.core.EventsInterface();
    };
    app.Events.prototype.onRender = function () {
        spike.core.Log.log('App onRender event');
    };
    app.Events.prototype.getSuper = function () {
        return 'spike.core.EventsInterface';
    };
    app.Events.prototype.getClass = function () {
        return 'app.Events';
    };
});
spike.core.Assembler.defineNamespace('app', ['Loader'], function () {
    app.Loader = function () {
        app.Loader.prototype = new spike.core.LoaderInterface();
    };
    app.Loader.prototype.loadApplication = function () {

        spike.core.System.setConfig(new app.Config());
        spike.core.System.setRouting(new app.Routing());
        spike.core.System.setEventsInterface(new app.Events());

        spike.core.Message.add("en", "i18/en.json").then(function () {
            spike.core.Log.log('Language EN loaded');
        });

        spike.core.Rest.interceptor("Request", function (response, promise) {
            spike.core.Log.log('invoke Request interceptor');
        });

        spike.core.Broadcaster.register('SomeEvent');

    };
    app.Loader.prototype.getSuper = function () {
        return 'spike.core.LoaderInterface';
    };
    app.Loader.prototype.getClass = function () {
        return 'app.Loader';
    };
});
spike.core.Assembler.defineNamespace('app', ['Routing'], function () {
    app.Routing = function () {
        app.Routing.prototype = new spike.core.RoutingInterface();
    };
    app.Routing.prototype.create = function (router) {

        router.path('/', {controller: 'app.controller.home.Home'});

    };
    app.Routing.prototype.getSuper = function () {
        return 'spike.core.RoutingInterface';
    };
    app.Routing.prototype.getClass = function () {
        return 'app.Routing';
    };
});
spike.core.Assembler.defineNamespace('app.controller.home', ['Home'], function () {
    app.controller.home.Home = function () {
        app.controller.home.Home.prototype = new spike.core.Controller();
    };
    app.controller.home.Home.prototype.init = function () {

        spike.core.Log.log('spike.core.Controller Home initialized');

    };
    app.controller.home.Home.prototype.getSuper = function () {
        return 'spike.core.Controller';
    };
    app.controller.home.Home.prototype.getClass = function () {
        return 'app.controller.home.Home';
    };
});