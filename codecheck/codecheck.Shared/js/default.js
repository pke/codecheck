// For an introduction to the Hub/Pivot template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=392285
(function () {
    "use strict";

    var activation = Windows.ApplicationModel.Activation;
    var app = WinJS.Application;
    var nav = WinJS.Navigation;
    var sched = WinJS.Utilities.Scheduler;
    var ui = WinJS.UI;
    
    function imagePath(value) {
        return "http://www.codecheck.info/img/" + value + "/1";
    }

    WinJS.Namespace.define("codecheck.api", {
        imagePath: imagePath,
    });    

    WinJS.Namespace.define("codecheck.binding", {
        image: WinJS.Binding.converter(function(value){
            return imagePath(value);
        }),

        displayIf: WinJS.Binding.converter(function (value) {
            return value ? "block" : "none";
        })
    });
    WinJS.Namespace.define("codecheck.ui", {
        browse: WinJS.UI.eventHandler(function (event) {
            var item;
            ["category", "product", "article"].some(function (property) {
                if (item = event.srcElement[property]) {
                    if (item.link) {
                        return Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(item.link));
                    } else {
                        WinJS.Navigation.navigate("/pages/" + property + "Page.html", {
                            id: item.id,
                            name: item.name,
                            imgId: item.imgId
                        });
                    }
                    return true;
                }
            });
        }),

        searchSuggestions: WinJS.UI.eventHandler(function (event) {
            var query = event.detail.queryText.toLowerCase();
            var suggestions = event.detail.searchSuggestionCollection;
            var suggestionsPromise = codecheck.api.searchSuggestionsAsync(query, 5).then(function (result) {
                result.forEach(function (suggestion) {
                    suggestions.appendQuerySuggestion(suggestion);
                });
            });
            /*var productsPromise = codecheck.api.searchAsync(query).then(function(results) {
                results.forEach(function(result){
                    if (result.prodMbrs) {
                        result.prodMbrs.forEach(function(product) {
                            var image = product.imgId ? Windows.Storage.Streams.RandomAccessStreamReference.createFromUri(new Windows.Foundation.Uri(imagePath(product.imgId))) : null;
                            suggestions.appendResultSuggestion(product.name, product.subtit ? product.subtit : "", product.id, image);
                        });
                    }                    
                });
            });*/
            event.detail.setPromise(WinJS.Promise.join([suggestionsPromise]));
        }),

        search: WinJS.UI.eventHandler(function (event) {
            var query = event.detail.queryText.toLowerCase();
            codecheck.api.searchAsync(query).then(function (results) {
                if (results.length === 1 && results[0].prodMbrs.length === 1) {
                    WinJS.Navigation.navigate("/pages/productPage.html", { id: results[0].prodMbrs[0].id });
                } else {

                }
            });
        })
    });

    var _recentWriting = WinJS.Promise.as();
    function saveRecentAsync() {
        return WinJS.Application.local.writeText("recent.json", JSON.stringify(codecheck.model.recent.slice(0)));
    }
    function loadRecent() {
        return WinJS.Application.local.readText("recent.json").done(function (data) {
            if (data) {
                try {
                    data = JSON.parse(data);
                    codecheck.model.recent.splice.apply(codecheck.model.recent, [0, codecheck.model.recent.length].concat(data || []));
                } catch (e) {
                }
            }
        }, function (error) {
        });
    }

    WinJS.Namespace.define("codecheck.model", {
        categories: new WinJS.Binding.List(),
        recent: new WinJS.Binding.List(/*[
            { id: 327979, name: "Nutella", subtit: "", imgId: 16402 }
        ]*/),
        addRecent: function (product) {
            if (!this.recent.some(function (item) {
                    return item.id === product.id;
            })) {
                this.recent.push({
                    id: product.id,
                    imgId: product.imgId,
                    name: product.name,
                    subtit: product.subtit
                });
                _recentWriting = _recentWriting.then(saveRecentAsync, saveRecentAsync);
            }
        }
    });

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            hookUpBackButtonGlobalEventHandlers();
            loadRecent();
            nav.history = app.sessionState.history || {};
            nav.history.current.initialPlaceholder = true;

            // Optimize the load of the application and while the splash screen is shown, execute high priority scheduled work.
            ui.disableAnimations();
            var p = ui.processAll().then(function () {
                if (args.detail.arguments) {
                    var index;
                    if ((index = args.detail.arguments.indexOf("/products/")) != -1) {
                        var id = args.detail.arguments.substr("/products/".length);
                        return nav.navigate("/pages/productPage.html", { id: id });
                    }
                }
                //nav.state = { id: 327979 };
                //Application.navigator.home = "/pages/productPage.html"
                return nav.navigate(nav.location || Application.navigator.home, nav.state);
            }).then(function () {
                return sched.requestDrain(sched.Priority.aboveNormal + 1);
            }).then(function () {
                ui.enableAnimations();
            });

            args.setPromise(p);
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;
    };

    function hookUpBackButtonGlobalEventHandlers() {
        // Subscribes to global events on the window object
        window.addEventListener('keyup', backButtonGlobalKeyUpHandler, false)
    }

    // CONSTANTS
    var KEY_LEFT = "Left";
    var KEY_BROWSER_BACK = "BrowserBack";
    var MOUSE_BACK_BUTTON = 3;

    function backButtonGlobalKeyUpHandler(event) {
        // Navigates back when (alt + left) or BrowserBack keys are released.
        if ((event.key === KEY_LEFT && event.altKey && !event.shiftKey && !event.ctrlKey) || (event.key === KEY_BROWSER_BACK)) {
            nav.back();
        }
    }

    app.start();
})();
