// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/articlePage.html", {
        init: function(element, options) {
            this.contentPromise = codecheck.api.getArticleAsync(options.id);
        },

        ready: function (element, options) {
            this.contentPromise.then(function (article) {
                WinJS.Binding.processAll(element, article);
            });
        },

        unload: function () {
            this.contentPromise && this.contentPromise.cancel();
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO: Respond to changes in layout.
        }
    });
})();
