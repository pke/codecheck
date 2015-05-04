(function () {
    "use strict";

    var CryptographicBuffer = Windows.Security.Cryptography.CryptographicBuffer;
    var BinaryStringEncoding = Windows.Security.Cryptography.BinaryStringEncoding;

    function nonce(length) {
        return CryptographicBuffer.encodeToBase64String(CryptographicBuffer.generateRandom(length));
    }

    var deviceId = "hrbLl2SqKFyQPmrlEVBxqg";
    var username = "androswan3";
    var sessionId = "5d0dfef8c206ad6bc8f3d27c22aba973";
    var authorizationHeader = null;
    var authorizationExpirationTime = Date.now();

    var _httpClient = null;
    function getHttpClientAsync() {
        if (_httpClient) {
            return _httpClient;
        }
        var httpClient = new Windows.Web.Http.HttpClient();
        var headers = httpClient.defaultRequestHeaders;
        headers.userAgent.tryParseAdd("Codecheck/2.8.2 (Android/4.4.2)");
        headers.accept.tryParseAdd("application/json");
        return _httpClient = WinJS.Promise.as(httpClient);
    }

    function authAsync() {
        var clientNonce = nonce(16);
        return requestAsync({
            method: "POST",
            path: "/session/auth",
            content: {
                sendTargetingInfo: true,
                username: username,
                authType: "DigestQuick",
                clientNonce: clientNonce,
                sessionId: sessionId,
                deviceId: deviceId
            }
        }).then(function (result) {
            authorizationExpirationTime = Date.now() + (result.expiresIn * 1000);
            var sessionNonce = result.nonce;
            var secret = [
                79, 12, 56, 56, 99, 4, -34, 46, -107, 75,
                116, 78, 62, 96, 64, -107, -116, -10, -25, -51,
                18, 93, -112, -124, -7, -107, -108, -101, 85, 73,
                68, -5
            ];
            var writer = new Windows.Storage.Streams.DataWriter();
            writer.writeBuffer(CryptographicBuffer.convertStringToBinary(username, BinaryStringEncoding.utf8));
            writer.writeBuffer(CryptographicBuffer.decodeFromBase64String(sessionNonce));
            writer.writeBuffer(CryptographicBuffer.decodeFromBase64String(clientNonce));
            var algo = Windows.Security.Cryptography.Core.MacAlgorithmProvider.openAlgorithm(Windows.Security.Cryptography.Core.MacAlgorithmNames.hmacSha256);
            var hash = algo.createHash(CryptographicBuffer.createFromByteArray(secret));
            hash.append(writer.detachBuffer());
            var digest = CryptographicBuffer.encodeToBase64String(hash.getValueAndReset());
            return authorizationHeader = Windows.Web.Http.Headers.HttpCredentialsHeaderValue.tryParse('DigestQuick nonce="' + sessionNonce + '",mac="' + digest + '"').credentialsHeaderValue;
        });
    }

    function signedRequestAsync(options) {
        options.headers = options.headers || {};
        var getAuthorizationAsync = WinJS.Promise.as(authorizationHeader);
        if (!authorizationHeader || Date.now() >= authorizationExpirationTime) {
            getAuthorizationAsync = authAsync();
        }
        return getAuthorizationAsync.then(function (authorizationHeader) {
            options.headers["authorization"] = authorizationHeader;
            return requestAsync(options);
        });
    }

    function requestAsync(options) {
        var url = new Windows.Foundation.Uri("http://www.codecheck.info/WebService/rest" + options.path);
        options.method = (options.method || "get").toLowerCase();
        var request = new Windows.Web.Http.HttpRequestMessage(Windows.Web.Http.HttpMethod[options.method], url);
        if (options.headers) {
            Object.keys(options.headers).forEach(function (headerKey) {
                var requestHeader;
                if (headerKey in request.headers) {
                    requestHeader = request.headers[headerKey];
                    if (requestHeader && typeof requestHeader.parseAdd === "function") {
                        return requestHeader.parseAdd(options.headers[headerKey]);
                    } else {
                        return request.headers[headerKey] = options.headers[headerKey];
                    }
                } else {
                    return request.headers.tryAppendWithoutValidation(headerKey, options.headers[headerKey]);
                }
            });
        }
        if (options.content) {
            request.content = new Windows.Web.Http.HttpStringContent(JSON.stringify(options.content));
            request.content.headers.contentType = Windows.Web.Http.Headers.HttpMediaTypeHeaderValue.parse("application/json");
        }
        return getHttpClientAsync()
        .then(function (httpClient) {
            return httpClient.sendRequestAsync(request);
        }).then(function (response) {
            response.ensureSuccessStatusCode();
            return response.content.readAsStringAsync();
        }).then(function (responseText) {
            return JSON.parse(responseText);
        }).then(function (data) {
            if (data.error) {
                var error = new WinJS.ErrorFromName("CodecheckError", data.error);
                error.code = data.errorCode;
                return WinJS.Promise.wrapError(error);
            }
            return data.result;
        }, function (error) {
            console.error(error);
            return WinJS.Promise.wrapError(error);
        });
    }

    WinJS.Namespace.define("codecheck.api", {
        flags: {
            addInfo: 0x1,
            incredientsDesc: 0x2,
            incredientsList: 0x4,
            labels: 0x8,
            productArticles: 0x10,
            productComments: 0x20,
            categoryArticles: 0x40,
            categoryComments: 0x80,
            categoryPath: 0x100,
            nutritionTable: 0x200,
            trafficLight: 0x400,
            incredientsSummary: 0x800,
            counts: 0x1000,
            oilSummary: 0x2000,
            oilDetails: 0x4000,
            lowestQuotes: 0x8000,
            priceQuotes: 0x10000,
            hormoneSummary: 0x20000,
            hormoneDetails: 0x40000,
            microbeadSummary: 0x100000,
            microbeadDetails: 0x200000,
            alternativeProducts: 0x400000,
            badge: 0x1000000,
            lastVisit: 0x10000000,
        },

        catAsync: function (id) {
            return signedRequestAsync({
                path: "/gcat/id/" + id + "/" + 0x1000000 + "/4"
            });
        },

        getProductAsync: function (id, what) {
            var flags = 22199561;
            what = what || [];
            if (what.indexOf("details") >= 0) {
                flags |= 514 | 771;
            }
            if (what.indexOf("comments") >= 0) {
                flags |= 240;
            }
            return signedRequestAsync({
                path: "/prod/id/" + flags + "/" + id
            });
        },

        searchSuggestionsAsync: function (term, maxResults) {
            term = term.trim();
            if (term === "") {
                return WinJS.Promise.as([]);
            }
            return signedRequestAsync({
                path: "/term/prod/" + term + "/" + maxResults
            }).then(null, function (error) {
                return [];
            });
        },

        searchAsync: function (name) {
            name = name.trim();
            if (name === "") {
                return WinJS.Promise.as([]);
            }
            return signedRequestAsync({
                path: "/prod/gsearch/" + 0x1000000 + "/4/" + name
            }).then(null, function (error) {
                return [];
            });
        },

        getArticleAsync: function (id) {
            return signedRequestAsync({
                path: "/arti/id/" + id
            });
        },

        signedRequestAsync: signedRequestAsync
    });

    codecheck.api.catAsync(0)
    .then(function (result) {
        codecheck.model.categories.push.apply(codecheck.model.categories, result.catMbrs);
    });

})();
