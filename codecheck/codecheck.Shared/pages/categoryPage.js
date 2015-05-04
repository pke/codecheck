// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/categoryPage.html", {
        categories: new WinJS.Binding.List(),
        products: new WinJS.Binding.List(),
        
        ready: function (element, options) {
            this.category = options;
            WinJS.Binding.processAll(element, this);
            this.update(options);
        },

        update: function (options) {
            var that = this;
            codecheck.api.catAsync(options.id).then(function (result) {
                if (result.catMbrs && result.catMbrs.length) {
                    that.products.length = 0;
                    that.categories.splice.apply(that.categories, [0, that.categories.length].concat(result.catMbrs));
                } else {
                    that.categories.length = 0;
                    var products = Object.keys(result.groupedProdMbrs).map(function (key) {
                        return {
                            name: key,
                            items: new WinJS.Binding.List(result.groupedProdMbrs[key])
                        }
                    }).sort(function (a, b) {
                        return a.name.localeCompare(b.name);
                    });
                    that.products.splice.apply(that.products, [0, that.products.length].concat(products));
                }
            });
        },

        unload: function () {
            this.products.length = this.categories.length = 0;
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in layout.
        }
    });
})();
