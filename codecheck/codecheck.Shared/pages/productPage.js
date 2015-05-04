// For an introduction to the Page Control template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    function pad(num, size) {
        return ('000000' + num).substr(-size);
    }

    WinJS.UI.Pages.define("/pages/productPage.html", {
        init: function (element, options) {
            this.getProductAsync = codecheck.api.getProductAsync(options.id);
            var that = this;

            pin.winControl.onclick = function() {
                that.getProductAsync.then(function (product) {
                    // Download the image to the local folder
                    Windows.Storage.ApplicationData.current.localFolder.createFolderAsync("tiles", Windows.Storage.CreationCollisionOption.openIfExists)
                    .then(function (folder) {
                        return folder.createFileAsync(product.id + ".jpg", Windows.Storage.CreationCollisionOption.replaceExisting)
                    }).then(function (file) {
                        var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                        var download = downloader.createDownload(new Windows.Foundation.Uri(codecheck.api.imagePath(product.imgId)), file);
                        return download.startAsync()
                        .then(function () {
                            return new Windows.Foundation.Uri("ms-appdata:///local/tiles/" + file.name);
                        });
                    }).then(function (imageUri) {
                        var tile = new Windows.UI.StartScreen.SecondaryTile(
                            product.id,
                            product.name,
                            "/products/" + product.id,
                            imageUri,
                            Windows.UI.StartScreen.TileSize.square150x150);
                        var selectionRect = pin.getBoundingClientRect();
                        var buttonCoordinates = {
                            x: selectionRect.left,
                            y: selectionRect.top,
                            width: selectionRect.width,
                            height: selectionRect.height
                        };
                        var placement = Windows.UI.Popups.Placement.above;
                        return tile.requestCreateForSelectionAsync(buttonCoordinates, placement).then(function (result) {
                        });                    
                    });
                });
            }
        },
        
        processed: function (element, options) {
            var that = this;
            return this.getProductAsync.then(function (product) {
                codecheck.model.addRecent(product);
                product.comments = new WinJS.Binding.List();
                product.articles = new WinJS.Binding.List();
                if (product.catArtiCnt || product.catCommCnt || product.prodArtiCnt || product.prodCommCnt) {
                    codecheck.api.getProductAsync(product.id, ["comments"])
                    .then(function (result) {
                        product.articles.push.apply(product.articles, result.catArti);
                        product.comments.push.apply(product.comments, result.prodComm);
                    });
                }
                if (product.trafficLight) {
                    product.trafficLight = new WinJS.Binding.List(Object.keys(product.trafficLight).map(function (key) {
                        var item = product.trafficLight[key];
                        if (typeof item.value === "undefined") {
                            return {};
                        }
                        return {
                            what: key,
                            color: "#" + pad(item.color.toString(16), 6),
                            name: WinJS.Resources.getString("nutrition." + key).value,
                            desc: item.desc,
                            value: item.value.toFixed(item.value < 1 ? 1 : 0).toString().replace(".", ",")
                        };
                    }));
                }
                if (product.altProducts) {
                    product.altProducts.prodList = new WinJS.Binding.List(product.altProducts.prodList);
                } else {
                    product.altProducts = {
                        kindText: "keine" //i18n
                    };
                }
                WinJS.Binding.processAll(element, product);
            });
        },

        ready: function (element, options) {
        },

        unload: function () {
            this.getProductAsync && this.getProductAsync.cancel();
        },

        updateLayout: function (element) {
        }
    });
})();
