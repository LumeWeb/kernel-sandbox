(function () {
    'use strict';

    // log provides a wrapper for console.log that prefixes '[libkernel]' to the
    // output.
    function log(...inputs) {
        console.log("[libkernel]", ...inputs);
    }
    // logErr provides a wrapper for console.error that prefixes '[libkernel]' to
    // the output.
    function logErr(...inputs) {
        console.error("[libkernel]", ...inputs);
    }

    // objAsString will try to return the provided object as a string. If the
    // object is already a string, it will be returned without modification. If the
    // object is an 'Error', the message of the error will be returned. If the object
    // has a toString method, the toString method will be called and the result
    // will be returned. If the object is null or undefined, a special string will
    // be returned indicating that the undefined/null object cannot be converted to
    // a string. In all other cases, JSON.stringify is used. If JSON.stringify
    // throws an exception, a message "[could not provide object as string]" will
    // be returned.
    //
    // NOTE: objAsString is intended to produce human readable output. It is lossy,
    // and it is not intended to be used for serialization.
    function objAsString(obj) {
        // Check for undefined input.
        if (obj === undefined) {
            return "[cannot convert undefined to string]";
        }
        if (obj === null) {
            return "[cannot convert null to string]";
        }
        // Parse the error into a string.
        if (typeof obj === "string") {
            return obj;
        }
        // Check if the object is an error, and return the message of the error if
        // so.
        if (obj instanceof Error) {
            return obj.message;
        }
        // Check if the object has a 'toString' method defined on it. To ensure
        // that we don't crash or throw, check that the toString is a function, and
        // also that the return value of toString is a string.
        if (Object.prototype.hasOwnProperty.call(obj, "toString")) {
            if (typeof obj.toString === "function") {
                const str = obj.toString();
                if (typeof str === "string") {
                    return str;
                }
            }
        }
        // If the object does not have a custom toString, attempt to perform a
        // JSON.stringify. We use a lot of bigints in libskynet, and calling
        // JSON.stringify on an object with a bigint will cause a throw, so we add
        // some custom handling to allow bigint objects to still be encoded.
        try {
            return JSON.stringify(obj, (_, v) => {
                if (typeof v === "bigint") {
                    return v.toString();
                }
                return v;
            });
        }
        catch (err) {
            if (err !== undefined && typeof err.message === "string") {
                return `[stringify failed]: ${err.message}`;
            }
            return "[stringify failed]";
        }
    }

    // addContextToErr is a helper function that standardizes the formatting of
    // adding context to an error.
    //
    // NOTE: To protect against accidental situations where an Error type or some
    // other type is provided instead of a string, we wrap both of the inputs with
    // objAsString before returning them. This prevents runtime failures.
    function addContextToErr$1(err, context) {
        if (err === null || err === undefined) {
            err = "[no error provided]";
        }
        return objAsString(context) + ": " + objAsString(err);
    }

    const MAX_UINT_64 = 18446744073709551615n;
    // bufToB64 will convert a Uint8Array to a base64 string with URL encoding and
    // no padding characters.
    function bufToB64$1(buf) {
        const b64Str = btoa(String.fromCharCode(...buf));
        return b64Str.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    }
    // encodeU64 will encode a bigint in the range of a uint64 to an 8 byte
    // Uint8Array.
    function encodeU64$1(num) {
        // Check the bounds on the bigint.
        if (num < 0) {
            return [new Uint8Array(0), "expected a positive integer"];
        }
        if (num > MAX_UINT_64) {
            return [new Uint8Array(0), "expected a number no larger than a uint64"];
        }
        // Encode the bigint into a Uint8Array.
        const encoded = new Uint8Array(8);
        for (let i = 0; i < encoded.length; i++) {
            const byte = Number(num & 0xffn);
            encoded[i] = byte;
            num = num >> 8n;
        }
        return [encoded, null];
    }

    const gfi$1 = function (init) {
        let i;
        const r = new Float64Array(16);
        if (init)
            for (i = 0; i < init.length; i++)
                r[i] = init[i];
        return r;
    };
    gfi$1([1]); gfi$1([
        0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f,
        0x6cee, 0x5203,
    ]); gfi$1([
        0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df,
        0xd9dc, 0x2406,
    ]); gfi$1([
        0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e,
        0x36d3, 0x2169,
    ]); gfi$1([
        0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666,
        0x6666, 0x6666,
    ]); gfi$1([
        0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1,
        0x2480, 0x2b83,
    ]);

    // checkObj take an untrusted object and a list of typechecks to perform and
    // will check that the object adheres to the typechecks. If a type is missing
    // or has the wrong type, an error will be returned. This is intended to be
    // used to check untrusted objects after they get decoded from JSON. This is
    // particularly useful when receiving objects from untrusted entities over the
    // network or over postMessage.
    //
    // Below is an example object, followed by the call that you would make to
    // checkObj to verify the object.
    //
    // const expectedObj = {
    //   aNum: 35,
    //   aStr: "hi",
    //   aBig: 10n,
    // };
    //
    // const err = checkObj(expectedObj, [
    //   ["aNum", "number"],
    //   ["aStr", "string"],
    //   ["aBig", "bigint"],
    // ]);
    function checkObj(obj, checks) {
        for (let i = 0; i < checks.length; i++) {
            const check = checks[i];
            const type = typeof obj[check[0]];
            if (type !== check[1]) {
                return "check failed, expecting " + check[1] + " got " + type;
            }
        }
        return null;
    }

    // Create the queryMap.
    let queries = {};
    // Define the nonce handling. nonceSeed is 16 random bytes that get generated
    // at init and serve as the baseline for creating random nonces. nonceCounter
    // tracks which messages have been sent. We hash together the nonceSeed and the
    // current nonceCounter to get a secure nonce.
    //
    // We need a secure nonce so that we know which messages from the kernel are
    // intended for us. There could be multiple pieces of independent code talking
    // to the kernel and using nonces, by having secure random nonces we can
    // guarantee that the applications will not use conflicting nonces.
    let nonceSeed;
    let nonceCounter;
    function initNonce() {
        nonceSeed = new Uint8Array(16);
        nonceCounter = 0;
        crypto.getRandomValues(nonceSeed);
    }
    // nextNonce will combine the nonceCounter with the nonceSeed to produce a
    // unique string that can be used as the nonce with the kernel.
    //
    // Note: the nonce is only ever going to be visible to the kernel and to other
    // code running in the same webpage, so we don't need to hash our nonceSeed. We
    // just need it to be unique, not undetectable.
    function nextNonce() {
        let nonceNum = nonceCounter;
        nonceCounter += 1;
        let [nonceNumBytes, err] = encodeU64$1(BigInt(nonceNum));
        if (err !== null) {
            // encodeU64 only fails if nonceNum is outside the bounds of a
            // uint64, which shouldn't happen ever.
            logErr("encodeU64 somehow failed", err);
        }
        let noncePreimage = new Uint8Array(nonceNumBytes.length + nonceSeed.length);
        noncePreimage.set(nonceNumBytes, 0);
        noncePreimage.set(nonceSeed, nonceNumBytes.length);
        return bufToB64$1(noncePreimage);
    }
    // Establish the handler for incoming messages.
    function handleMessage(event) {
        // Ignore all messages that aren't from approved kernel sources. The two
        // approved sources are skt.us and the browser extension bridge (which has
        // an event.source equal to 'window')
        if (event.source !== window && event.origin !== "https://skt.us") {
            return;
        }
        // Ignore any messages that don't have a method and data field.
        if (!("method" in event.data) || !("data" in event.data)) {
            return;
        }
        // Handle logging messages.
        if (event.data.method === "log") {
            // We display the logging message if the kernel is a browser
            // extension, so that the kernel's logs appear in the app
            // console as well as the extension console. If the kernel is
            // in an iframe, its logging messages will already be in the
            // app console and therefore don't need to be displayed.
            if (kernelOrigin === window.origin) {
                if (event.data.data.isErr) {
                    console.error(event.data.data.message);
                }
                else {
                    console.log(event.data.data.message);
                }
            }
            return;
        }
        // init is complete when the kernel sends us the auth status. If the
        // user is logged in, report success, otherwise return an error
        // indicating that the user is not logged in.
        if (event.data.method === "kernelAuthStatus") {
            // If we have received an auth status message, it means the bootloader
            // at a minimum is working.
            if (initResolved === false) {
                initResolved = true;
                // We can't actually establish that init is complete until the
                // kernel source has been set. This happens async and might happen
                // after we receive the auth message.
                sourcePromise.then(() => {
                    initResolve();
                });
            }
            // If the auth status message says that login is complete, it means
            // that the user is logged in.
            if (loginResolved === false && event.data.data.loginComplete === true) {
                loginResolved = true;
                loginResolve();
            }
            // If the auth status message says that the kernel loaded, it means
            // that the kernel is ready to receive messages.
            if (kernelLoadedResolved === false && event.data.data.kernelLoaded !== "not yet") {
                kernelLoadedResolved = true;
                if (event.data.data.kernelLoaded === "success") {
                    kernelLoadedResolve(null);
                }
                else {
                    kernelLoadedResolve(event.data.data.kernelLoaded);
                }
            }
            // If we have received a message indicating that the user has logged
            // out, we need to reload the page and reset the auth process.
            if (event.data.data.logoutComplete === true) {
                {
                    logoutResolve();
                }
                window.location.reload();
            }
            return;
        }
        // Check that the message sent has a nonce. We don't log
        // on failure because the message may have come from 'window', which
        // will happen if the app has other messages being sent to the window.
        if (!("nonce" in event.data)) {
            return;
        }
        // If we can't locate the nonce in the queries map, there is nothing to do.
        // This can happen especially for responseUpdate messages.
        if (!(event.data.nonce in queries)) {
            return;
        }
        let query = queries[event.data.nonce];
        // Handle a response. Once the response has been received, it is safe to
        // delete the query from the queries map.
        if (event.data.method === "response") {
            queries[event.data.nonce].resolve([event.data.data, event.data.err]);
            delete queries[event.data.nonce];
            return;
        }
        // Handle a response update.
        if (event.data.method === "responseUpdate") {
            // If no update handler was provided, there is nothing to do.
            if (typeof query.receiveUpdate === "function") {
                query.receiveUpdate(event.data.data);
            }
            return;
        }
        // Handle a responseNonce.
        if (event.data.method === "responseNonce") {
            if (typeof query.kernelNonceReceived === "function") {
                query.kernelNonceReceived(event.data.data.nonce);
            }
            return;
        }
        // Ignore any other messages as they might be from other applications.
    }
    // launchKernelFrame will launch the skt.us iframe that is used to connect to the
    // Skynet kernel if the kernel cannot be reached through the browser extension.
    function launchKernelFrame() {
        let iframe = document.createElement("iframe");
        iframe.src = "https://skt.us";
        iframe.width = "0";
        iframe.height = "0";
        iframe.style.border = "0";
        iframe.style.position = "absolute";
        document.body.appendChild(iframe);
        kernelSource = iframe.contentWindow;
        kernelOrigin = "https://skt.us";
        kernelAuthLocation = "https://skt.us/auth.html";
        sourceResolve();
        // Set a timer to fail the login process if the kernel doesn't load in
        // time.
        setTimeout(() => {
            if (initResolved === true) {
                return;
            }
            initResolved = true;
            initResolve("tried to open kernel in iframe, but hit a timeout");
        }, 24000);
    }
    // messageBridge will send a message to the bridge of the skynet extension to
    // see if it exists. If it does not respond or if it responds with an error,
    // messageBridge will open an iframe to skt.us and use that as the kernel.
    let kernelSource;
    let kernelOrigin;
    let kernelAuthLocation;
    function messageBridge() {
        // Establish the function that will handle the bridge's response.
        let bridgeInitComplete = false;
        let bridgeResolve = () => { }; // Need to set bridgeResolve here to make tsc happy
        let p = new Promise((resolve) => {
            bridgeResolve = resolve;
        });
        p.then(([, err]) => {
            // Check if the timeout already elapsed.
            if (bridgeInitComplete === true) {
                logErr("received response from bridge, but init already finished");
                return;
            }
            bridgeInitComplete = true;
            // Deconstruct the input and return if there's an error.
            if (err !== null) {
                logErr("bridge exists but returned an error", err);
                launchKernelFrame();
                return;
            }
            // Bridge has responded successfully, and there's no error.
            kernelSource = window;
            kernelOrigin = window.origin;
            kernelAuthLocation = "http://kernel.skynet/auth.html";
            console.log("established connection to bridge, using browser extension for kernel");
            sourceResolve();
        });
        // Add the handler to the queries map.
        let nonce = nextNonce();
        queries[nonce] = {
            resolve: bridgeResolve,
        };
        // Send a message to the bridge of the browser extension to determine
        // whether the bridge exists.
        window.postMessage({
            nonce,
            method: "kernelBridgeVersion",
        }, window.origin);
        // Set a timeout, if we do not hear back from the bridge in 500
        // milliseconds we assume that the bridge is not available.
        setTimeout(() => {
            // If we've already received and processed a message from the
            // bridge, there is nothing to do.
            if (bridgeInitComplete === true) {
                return;
            }
            bridgeInitComplete = true;
            log("browser extension not found, falling back to skt.us");
            launchKernelFrame();
        }, 500);
        return initPromise;
    }
    // init is a function that returns a promise which will resolve when
    // initialization is complete.
    //
    // The init / auth process has 5 stages. The first stage is that something
    // somewhere needs to call init(). It is safe to call init() multiple times,
    // thanks to the 'initialized' variable.
    let initialized = false; // set to true once 'init()' has been called
    let initResolved = false; // set to true once we know the bootloader is working
    let initResolve;
    let initPromise;
    let loginResolved = false; // set to true once we know the user is logged in
    let loginResolve;
    let loginPromise;
    let kernelLoadedResolved = false; // set to true once the user kernel is loaded
    let kernelLoadedResolve;
    let kernelLoadedPromise;
    let logoutResolve;
    let logoutPromise;
    let sourceResolve;
    let sourcePromise; // resolves when the source is known and set
    function init() {
        // If init has already been called, just return the init promise.
        if (initialized === true) {
            return initPromise;
        }
        initialized = true;
        // Run all of the init functions.
        initNonce();
        window.addEventListener("message", handleMessage);
        messageBridge();
        // Create the promises that resolve at various stages of the auth flow.
        initPromise = new Promise((resolve) => {
            initResolve = resolve;
        });
        loginPromise = new Promise((resolve) => {
            loginResolve = resolve;
        });
        kernelLoadedPromise = new Promise((resolve) => {
            kernelLoadedResolve = resolve;
        });
        logoutPromise = new Promise((resolve) => {
            logoutResolve = resolve;
        });
        sourcePromise = new Promise((resolve) => {
            sourceResolve = resolve;
        });
        // Return the initPromise, which will resolve when bootloader init is
        // complete.
        return initPromise;
    }
    // callModule is a generic function to call a module. The first input is the
    // module identifier (typically a skylink), the second input is the method
    // being called on the module, and the final input is optional and contains
    // input data to be passed to the module. The input data will depend on the
    // module and the method that is being called. The return value is an ErrTuple
    // that contains the module's response. The format of the response is an
    // arbitrary object whose fields depend on the module and method being called.
    //
    // callModule can only be used for query-response communication, there is no
    // support for sending or receiving updates.
    function callModule(module, method, data) {
        let moduleCallData = {
            module,
            method,
            data,
        };
        let [, query] = newKernelQuery("moduleCall", moduleCallData, false);
        return query;
    }
    // connectModule is the standard function to send a query to a module that can
    // optionally send and optionally receive updates. The first three inputs match
    // the inputs of 'callModule', and the fourth input is a function that will be
    // called any time that the module sends a responseUpdate. The receiveUpdate
    // function should have the following signature:
    //
    // 	`function receiveUpdate(data: any)`
    //
    // The structure of the data will depend on the module and method that was
    // queried.
    //
    // The first return value is a 'sendUpdate' function that can be called to send
    // a queryUpdate to the module. The sendUpdate function has the same signature
    // as the receiveUpdate function, it's an arbitrary object whose fields depend
    // on the module and method being queried.
    //
    // The second return value is a promise that returns an ErrTuple. It will
    // resolve when the module sends a response message, and works the same as the
    // return value of callModule.
    function connectModule(module, method, data, receiveUpdate) {
        let moduleCallData = {
            module,
            method,
            data,
        };
        return newKernelQuery("moduleCall", moduleCallData, true, receiveUpdate);
    }
    // newKernelQuery opens a query to the kernel. Details like postMessage
    // communication and nonce handling are all abstracted away by newKernelQuery.
    //
    // The first arg is the method that is being called on the kernel, and the
    // second arg is the data that will be sent to the kernel as input to the
    // method.
    //
    // The thrid arg is an optional function that can be passed in to receive
    // responseUpdates to the query. Not every query will send responseUpdates, and
    // most responseUpdates can be ignored, but sometimes contain useful
    // information like download progress.
    //
    // The first output is a 'sendUpdate' function that can be called to send a
    // queryUpdate. The second output is a promise that will resolve when the query
    // receives a response message. Once the response message has been received, no
    // more updates can be sent or received.
    function newKernelQuery(method, data, sendUpdates, receiveUpdate) {
        // NOTE: The implementation here is gnarly, because I didn't want to use
        // async/await (that decision should be left to the caller) and I also
        // wanted this function to work correctly even if init() had not been
        // called yet.
        //
        // This function returns a sendUpdate function along with a promise, so we
        // can't simply wrap everything in a basic promise. The sendUpdate function
        // has to block internally until all of the setup is complete, and then we
        // can't send a query until all of the setup is complete, and the setup
        // cylce has multiple dependencies and therefore we get a few promises that
        // all depend on each other.
        //
        // Using async/await here actually breaks certain usage patterns (or at
        // least makes them much more difficult to use correctly). The standard way
        // to establish duplex communication using connectModule is to define a
        // variable 'sendUpdate' before defining the function 'receiveUpdate', and
        // then setting 'sendUpdate' equal to the first return value of
        // 'connectModue'. It looks like this:
        //
        // let sendUpdate;
        // let receiveUpdate = function(data: any) {
        //     if (data.needsUpdate) {
        //         sendUpdate(someUpdate)
        //     }
        // }
        // let [sendUpdateFn, response] = connectModule(x, y, z, receiveUpdate)
        // sendUpdate = sendUpdateFn
        //
        // If we use async/await, it's not safe to set sendUpdate after
        // connectModule returns because 'receiveUpdate' may be called before
        // 'sendUpdate' is set. You can fix that by using a promise, but it's a
        // complicated fix and we want this library to be usable by less
        // experienced developers.
        //
        // Therefore, we make an implementation tradeoff here and avoid async/await
        // at the cost of having a bunch of complicated promise chaining.
        // Create a promise that will resolve once the nonce is available. We
        // cannot get the nonce until init() is complete. getNonce therefore
        // implies that init is complete.
        let getNonce = new Promise((resolve) => {
            init().then(() => {
                kernelLoadedPromise.then(() => {
                    resolve(nextNonce());
                });
            });
        });
        // Two promises are being created at once here. Once is 'p', which will be
        // returned to the caller of newKernelQuery and will be resolved when the
        // kernel provides a 'response' message. The other is for internal use and
        // will resolve once the query has been created.
        let p;
        let haveQueryCreated = new Promise((queryCreatedResolve) => {
            p = new Promise((resolve) => {
                getNonce.then((nonce) => {
                    queries[nonce] = { resolve };
                    if (receiveUpdate !== null && receiveUpdate !== undefined) {
                        queries[nonce]["receiveUpdate"] = receiveUpdate;
                    }
                    queryCreatedResolve(nonce);
                });
            });
        });
        // Create a promise that will be resolved once we are ready to receive the
        // kernelNonce. We won't be ready to receive the kernel nonce until after
        // the queries[nonce] object has been created.
        let readyForKernelNonce;
        let getReadyForKernelNonce = new Promise((resolve) => {
            readyForKernelNonce = resolve;
        });
        // Create the sendUpdate function. It defaults to doing nothing. After the
        // sendUpdate function is ready to receive the kernelNonce, resolve the
        // promise that blocks until the sendUpdate function is ready to receive
        // the kernel nonce.
        let sendUpdate;
        if (sendUpdates !== true) {
            sendUpdate = () => { };
            readyForKernelNonce(); // We won't get a kernel nonce, no reason to block.
        }
        else {
            // sendUpdate will send an update to the kernel. The update can't be
            // sent until the kernel nonce is known. Create a promise that will
            // resolve when the kernel nonce is known.
            //
            // This promise cannot itself be created until the queries[nonce]
            // object has been created, so block for the query to be created.
            let blockForKernelNonce = new Promise((resolve) => {
                haveQueryCreated.then((nonce) => {
                    queries[nonce]["kernelNonceReceived"] = resolve;
                    readyForKernelNonce();
                });
            });
            // The sendUpdate function needs both the local nonce and also the
            // kernel nonce. Block for both. Having the kernel nonce implies that
            // the local nonce is ready, therefore start by blocking for the kernel
            // nonce.
            sendUpdate = function (updateData) {
                blockForKernelNonce.then((nonce) => {
                    kernelSource.postMessage({
                        method: "queryUpdate",
                        nonce,
                        data: updateData,
                    }, kernelOrigin);
                });
            };
        }
        // Prepare to send the query to the kernel. The query cannot be sent until
        // the queries object is created and also we are ready to receive the
        // kernel nonce.
        haveQueryCreated.then((nonce) => {
            getReadyForKernelNonce.then(() => {
                // There are two types of messages we can send depending on whether
                // we are talking to skt.us or the background script.
                let kernelMessage = {
                    method,
                    nonce,
                    data,
                    sendKernelNonce: sendUpdates,
                };
                let backgroundMessage = {
                    method: "newKernelQuery",
                    nonce,
                    data: kernelMessage,
                };
                // The message structure needs to adjust based on whether we are
                // talking directly to the kernel or whether we are talking to the
                // background page.
                if (kernelOrigin === "https://skt.us") {
                    kernelSource.postMessage(kernelMessage, kernelOrigin);
                }
                else {
                    kernelSource.postMessage(backgroundMessage, kernelOrigin);
                }
            });
        });
        // Return sendUpdate and the promise. sendUpdate is already set to block
        // until all the necessary prereqs are complete.
        return [sendUpdate, p];
    }

    // There are 5 stages of auth.
    //
    // Stage 0: Bootloader is not loaded.
    // Stage 1: Bootloader is loaded, user is not logged in.
    // Stage 2: Bootloader is loaded, user is logged in.
    // Stage 3: Kernel is loaded, user is logged in.
    // Stage 4: Kernel is loaded, user is logged out.
    //
    // init() will block until auth has reached stage 1. If the user is already
    // logged in from a previous session, auth will immediately progress to stage
    // 2.
    //
    // loginComplete() will block until auth has reached stage 2. The kernel is not
    // ready to receive messages yet, but apps do not need to present users with a
    // login dialog.
    //
    // kernelLoaded() will block until auth has reached stage 3. kernelLoaded()
    // returns a promise that can resolve with an error. If there was an error, it
    // means the kernel could not be loaded and cannot be used.
    //
    // logoutComplete() will block until auth has reached stage 4. libkernel does
    // not support resetting the auth stages, once stage 4 has been reached the app
    // needs to refresh.
    // loginComplete will resolve when the user has successfully logged in.
    function loginComplete() {
        return loginPromise;
    }
    // kernelLoaded will resolve when the user has successfully loaded the kernel.
    // If there was an error in loading the kernel, the error will be returned.
    //
    // NOTE: kernelLoaded will not resolve until after loginComplete has resolved.
    function kernelLoaded() {
        return kernelLoadedPromise;
    }
    // logoutComplete will resolve when the user has logged out. Note that
    // logoutComplete will only resolve if the user logged in first - if the user
    // was not logged in to begin with, this promise will not resolve.
    function logoutComplete() {
        return logoutPromise;
    }
    // openAuthWindow is intended to be used as an onclick target when the user
    // clicks the 'login' button on a skynet application. It will block until the
    // auth location is known, and then it will pop open the correct auth window
    // for the user.
    //
    // NOTE: openAuthWindow will only open a window if the user is not already
    // logged in. If the user is already logged in, this function is a no-op.
    //
    // NOTE: When using this function, you probably want to have your login button
    // faded out or presenting the user with a spinner until init() resolves. In
    // the worst case (user has no browser extension, and is on a slow internet
    // connection) this could take multiple seconds.
    function openAuthWindow() {
        // openAuthWindow doesn't care what the auth status is, it's just trying to
        // open the right window.
        init().then(() => {
            window.open(kernelAuthLocation, "_blank");
        });
    }

    // download will take a skylink and return the file data for that skylink. The
    // download occurs using a kernel module that verifies the data's integrity and
    // prevents the portal from lying about the download.
    function download(skylink) {
        return new Promise((resolve) => {
            let downloadModule = "AQCIaQ0P-r6FwPEDq3auCZiuH_jqrHfqRcY7TjZ136Z_Yw";
            let data = {
                skylink,
            };
            callModule(downloadModule, "secureDownload", data).then(([result, err]) => {
                // Pull the fileData out of the result.
                if (err !== null) {
                    resolve([new Uint8Array(0), addContextToErr$1(err, "unable to complete download")]);
                    return;
                }
                resolve([result.fileData, null]);
            });
        });
    }

    // registryRead will perform a registry read on a portal. readEntry does not
    // guarantee that the latest revision has been provided, however it does
    // guarantee that the provided data has a matching signature.
    //
    // registryRead returns the full registry entry object provided by the module
    // because the object is relatively complex and all of the fields are more or
    // less required.
    function registryRead(publicKey, dataKey) {
        return new Promise((resolve) => {
            let registryModule = "AQCovesg1AXUzKXLeRzQFILbjYMKr_rvNLsNhdq5GbYb2Q";
            let data = {
                publicKey,
                dataKey,
            };
            callModule(registryModule, "readEntry", data).then(([result, err]) => {
                if (err !== null) {
                    resolve([{}, addContextToErr$1(err, "readEntry module call failed")]);
                    return;
                }
                resolve([
                    {
                        exists: result.exists,
                        entryData: result.entryData,
                        revision: result.revision,
                    },
                    null,
                ]);
            });
        });
    }
    // registryWrite will perform a registry write on a portal.
    //
    // registryWrite is not considered a safe function, there are easy ways to
    // misuse registryWrite such that user data will be lost. We recommend using a
    // safe set of functions for writing to the registry such as getsetjson.
    function registryWrite(keypair, dataKey, entryData, revision) {
        return new Promise((resolve) => {
            let registryModule = "AQCovesg1AXUzKXLeRzQFILbjYMKr_rvNLsNhdq5GbYb2Q";
            let callData = {
                publicKey: keypair.publicKey,
                secretKey: keypair.secretKey,
                dataKey,
                entryData,
                revision,
            };
            callModule(registryModule, "writeEntry", callData).then(([result, err]) => {
                if (err !== null) {
                    resolve(["", err]);
                    return;
                }
                resolve([result.entryID, null]);
            });
        });
    }

    // upload will take a filename and some file data and perform a secure upload
    // to Skynet. All data is verified and the correct Skylink is returned. This
    // function cannot fully guarantee that the data was pinned, but it can fully
    // guarantee that the final skylink matches the data that was presented for the
    // upload.
    function upload(filename, fileData) {
        return new Promise((resolve) => {
            // Prepare the module call.
            let uploadModule = "AQAT_a0MzOInZoJzt1CwBM2U8oQ3GIfP5yKKJu8Un-SfNg";
            let data = {
                filename,
                fileData,
            };
            callModule(uploadModule, "secureUpload", data).then(([result, err]) => {
                // Pull the skylink out of the result.
                if (err !== null) {
                    resolve(["", addContextToErr$1(err, "uable to complete upload")]);
                    return;
                }
                resolve([result.skylink, null]);
            });
        });
    }

    // kernelVersion will fetch the version number of the kernel. If successful,
    // the returned value will be an object containing a field 'version' with a
    // version string, and a 'distribtion' field with a string that states the
    // distribution of the kernel".
    function kernelVersion() {
        return new Promise((resolve) => {
            let [, query] = newKernelQuery("version", {}, false);
            query.then(([result, err]) => {
                if (err !== null) {
                    resolve(["", "", err]);
                    return;
                }
                resolve([result.version, result.distribution, err]);
            });
        });
    }

    var kernel = /*#__PURE__*/Object.freeze({
        __proto__: null,
        kernelLoaded: kernelLoaded,
        loginComplete: loginComplete,
        logoutComplete: logoutComplete,
        openAuthWindow: openAuthWindow,
        download: download,
        registryRead: registryRead,
        registryWrite: registryWrite,
        upload: upload,
        kernelVersion: kernelVersion,
        callModule: callModule,
        connectModule: connectModule,
        init: init,
        newKernelQuery: newKernelQuery,
        addContextToErr: addContextToErr$1,
        checkObj: checkObj
    });

    // Blake2B, adapted from the reference implementation in RFC7693
    // Ported to Javascript by DC - https://github.com/dcposch
    // Then ported to typescript by https://github.com/DavidVorick
    // 64-bit unsigned addition
    // Sets v[a,a+1] += v[b,b+1]
    // v should be a Uint32Array
    function ADD64AA(v, a, b) {
        const o0 = v[a] + v[b];
        let o1 = v[a + 1] + v[b + 1];
        if (o0 >= 0x100000000) {
            o1++;
        }
        v[a] = o0;
        v[a + 1] = o1;
    }
    // 64-bit unsigned addition
    // Sets v[a,a+1] += b
    // b0 is the low 32 bits of b, b1 represents the high 32 bits
    function ADD64AC(v, a, b0, b1) {
        let o0 = v[a] + b0;
        if (b0 < 0) {
            o0 += 0x100000000;
        }
        let o1 = v[a + 1] + b1;
        if (o0 >= 0x100000000) {
            o1++;
        }
        v[a] = o0;
        v[a + 1] = o1;
    }
    // Little-endian byte access
    function B2B_GET32(arr, i) {
        return arr[i] ^ (arr[i + 1] << 8) ^ (arr[i + 2] << 16) ^ (arr[i + 3] << 24);
    }
    // G Mixing function
    // The ROTRs are inlined for speed
    function B2B_G(a, b, c, d, ix, iy, m, v) {
        const x0 = m[ix];
        const x1 = m[ix + 1];
        const y0 = m[iy];
        const y1 = m[iy + 1];
        ADD64AA(v, a, b); // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
        ADD64AC(v, a, x0, x1); // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits
        // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
        let xor0 = v[d] ^ v[a];
        let xor1 = v[d + 1] ^ v[a + 1];
        v[d] = xor1;
        v[d + 1] = xor0;
        ADD64AA(v, c, d);
        // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
        xor0 = v[b] ^ v[c];
        xor1 = v[b + 1] ^ v[c + 1];
        v[b] = (xor0 >>> 24) ^ (xor1 << 8);
        v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);
        ADD64AA(v, a, b);
        ADD64AC(v, a, y0, y1);
        // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
        xor0 = v[d] ^ v[a];
        xor1 = v[d + 1] ^ v[a + 1];
        v[d] = (xor0 >>> 16) ^ (xor1 << 16);
        v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);
        ADD64AA(v, c, d);
        // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
        xor0 = v[b] ^ v[c];
        xor1 = v[b + 1] ^ v[c + 1];
        v[b] = (xor1 >>> 31) ^ (xor0 << 1);
        v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
    }
    // Initialization Vector
    const BLAKE2B_IV32 = new Uint32Array([
        0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a, 0xade682d1,
        0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
    ]);
    const SIGMA8 = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12,
        0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4, 7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4, 10,
        15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9, 12, 5, 1, 15, 14, 13, 4, 10, 0,
        7, 6, 3, 9, 2, 8, 11, 13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7,
        1, 4, 10, 5, 10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
        15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
    ];
    // These are offsets into a uint64 buffer.
    // Multiply them all by 2 to make them offsets into a uint32 buffer,
    // because this is Javascript and we don't have uint64s
    const SIGMA82 = new Uint8Array(SIGMA8.map(function (x) {
        return x * 2;
    }));
    // Compression function. 'last' flag indicates last block.
    // Note we're representing 16 uint64s as 32 uint32s
    function blake2bCompress(ctx, last) {
        const v = new Uint32Array(32);
        const m = new Uint32Array(32);
        let i = 0;
        // init work variables
        for (i = 0; i < 16; i++) {
            v[i] = ctx.h[i];
            v[i + 16] = BLAKE2B_IV32[i];
        }
        // low 64 bits of offset
        v[24] = v[24] ^ ctx.t;
        v[25] = v[25] ^ (ctx.t / 0x100000000);
        // high 64 bits not supported, offset may not be higher than 2**53-1
        // last block flag set ?
        if (last) {
            v[28] = ~v[28];
            v[29] = ~v[29];
        }
        // get little-endian words
        for (i = 0; i < 32; i++) {
            m[i] = B2B_GET32(ctx.b, 4 * i);
        }
        // twelve rounds of mixing
        for (i = 0; i < 12; i++) {
            B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1], m, v);
            B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3], m, v);
            B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5], m, v);
            B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7], m, v);
            B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9], m, v);
            B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11], m, v);
            B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13], m, v);
            B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15], m, v);
        }
        for (i = 0; i < 16; i++) {
            ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
        }
    }
    // Creates a BLAKE2b hashing context
    // Requires an output length between 1 and 64 bytes
    function blake2bInit() {
        // state, 'param block'
        const ctx = {
            b: new Uint8Array(128),
            h: new Uint32Array(16),
            t: 0,
            c: 0,
            outlen: 32, // output length in bytes
        };
        // initialize hash state
        for (let i = 0; i < 16; i++) {
            ctx.h[i] = BLAKE2B_IV32[i];
        }
        ctx.h[0] ^= 0x01010000 ^ 32;
        return ctx;
    }
    // Updates a BLAKE2b streaming hash
    // Requires hash context and Uint8Array (byte array)
    function blake2bUpdate(ctx, input) {
        for (let i = 0; i < input.length; i++) {
            if (ctx.c === 128) {
                // buffer full ?
                ctx.t += ctx.c; // add counters
                blake2bCompress(ctx, false); // compress (not last)
                ctx.c = 0; // counter to zero
            }
            ctx.b[ctx.c++] = input[i];
        }
    }
    // Completes a BLAKE2b streaming hash
    // Returns a Uint8Array containing the message digest
    function blake2bFinal(ctx) {
        ctx.t += ctx.c; // mark last block offset
        while (ctx.c < 128) {
            // fill up with zeros
            ctx.b[ctx.c++] = 0;
        }
        blake2bCompress(ctx, true); // final block flag = 1
        // little endian convert and store
        const out = new Uint8Array(ctx.outlen);
        for (let i = 0; i < ctx.outlen; i++) {
            out[i] = ctx.h[i >> 2] >> (8 * (i & 3));
        }
        return out;
    }
    // Computes the blake2b hash of the input. Returns 32 bytes.
    let blake2b = function (input) {
        const ctx = blake2bInit();
        blake2bUpdate(ctx, input);
        return blake2bFinal(ctx);
    };

    const defaultPortalList = ["https://siasky.net", "https://web3portal.com"];

    // DICTIONARY_UNIQUE_PREFIX defines the number of characters that are
    // guaranteed to be unique for each word in the dictionary. The seed code only
    // looks at these three characters when parsing a word, allowing users to make
    // substitutions for words if they prefer or find it easier to memorize.
    const DICTIONARY_UNIQUE_PREFIX = 3;
    // dictionary contains the word list for the mysky seed.
    const dictionary = [
        "abbey",
        "ablaze",
        "abort",
        "absorb",
        "abyss",
        "aces",
        "aching",
        "acidic",
        "across",
        "acumen",
        "adapt",
        "adept",
        "adjust",
        "adopt",
        "adult",
        "aerial",
        "afar",
        "affair",
        "afield",
        "afloat",
        "afoot",
        "afraid",
        "after",
        "agenda",
        "agile",
        "aglow",
        "agony",
        "agreed",
        "ahead",
        "aided",
        "aisle",
        "ajar",
        "akin",
        "alarms",
        "album",
        "alerts",
        "alley",
        "almost",
        "aloof",
        "alpine",
        "also",
        "alumni",
        "always",
        "amaze",
        "ambush",
        "amidst",
        "ammo",
        "among",
        "amply",
        "amused",
        "anchor",
        "angled",
        "ankle",
        "antics",
        "anvil",
        "apart",
        "apex",
        "aphid",
        "aplomb",
        "apply",
        "archer",
        "ardent",
        "arena",
        "argue",
        "arises",
        "army",
        "around",
        "arrow",
        "ascend",
        "aside",
        "asked",
        "asleep",
        "aspire",
        "asylum",
        "atlas",
        "atom",
        "atrium",
        "attire",
        "auburn",
        "audio",
        "august",
        "aunt",
        "autumn",
        "avatar",
        "avidly",
        "avoid",
        "awful",
        "awning",
        "awoken",
        "axes",
        "axis",
        "axle",
        "aztec",
        "azure",
        "baby",
        "bacon",
        "badge",
        "bailed",
        "bakery",
        "bamboo",
        "banjo",
        "basin",
        "batch",
        "bawled",
        "bays",
        "beer",
        "befit",
        "begun",
        "behind",
        "being",
        "below",
        "bested",
        "bevel",
        "beware",
        "beyond",
        "bias",
        "bids",
        "bikini",
        "birth",
        "bite",
        "blip",
        "boat",
        "bodies",
        "bogeys",
        "boil",
        "boldly",
        "bomb",
        "border",
        "boss",
        "both",
        "bovine",
        "boxes",
        "broken",
        "brunt",
        "bubble",
        "budget",
        "buffet",
        "bugs",
        "bulb",
        "bumper",
        "bunch",
        "butter",
        "buying",
        "buzzer",
        "byline",
        "bypass",
        "cabin",
        "cactus",
        "cadets",
        "cafe",
        "cage",
        "cajun",
        "cake",
        "camp",
        "candy",
        "casket",
        "catch",
        "cause",
        "cease",
        "cedar",
        "cell",
        "cement",
        "cent",
        "chrome",
        "cider",
        "cigar",
        "cinema",
        "circle",
        "claim",
        "click",
        "clue",
        "coal",
        "cobra",
        "cocoa",
        "code",
        "coffee",
        "cogs",
        "coils",
        "colony",
        "comb",
        "cool",
        "copy",
        "cousin",
        "cowl",
        "cube",
        "cuffs",
        "custom",
        "dads",
        "daft",
        "dagger",
        "daily",
        "damp",
        "dapper",
        "darted",
        "dash",
        "dating",
        "dawn",
        "dazed",
        "debut",
        "decay",
        "deftly",
        "deity",
        "dented",
        "depth",
        "desk",
        "devoid",
        "dice",
        "diet",
        "digit",
        "dilute",
        "dime",
        "dinner",
        "diode",
        "ditch",
        "divers",
        "dizzy",
        "doctor",
        "dodge",
        "does",
        "dogs",
        "doing",
        "donuts",
        "dosage",
        "dotted",
        "double",
        "dove",
        "down",
        "dozen",
        "dreams",
        "drinks",
        "drunk",
        "drying",
        "dual",
        "dubbed",
        "dude",
        "duets",
        "duke",
        "dummy",
        "dunes",
        "duplex",
        "dusted",
        "duties",
        "dwarf",
        "dwelt",
        "dying",
        "each",
        "eagle",
        "earth",
        "easy",
        "eating",
        "echo",
        "eden",
        "edgy",
        "edited",
        "eels",
        "eggs",
        "eight",
        "either",
        "eject",
        "elapse",
        "elbow",
        "eldest",
        "eleven",
        "elite",
        "elope",
        "else",
        "eluded",
        "emails",
        "ember",
        "emerge",
        "emit",
        "empty",
        "energy",
        "enigma",
        "enjoy",
        "enlist",
        "enmity",
        "enough",
        "ensign",
        "envy",
        "epoxy",
        "equip",
        "erase",
        "error",
        "estate",
        "etched",
        "ethics",
        "excess",
        "exhale",
        "exit",
        "exotic",
        "extra",
        "exult",
        "fading",
        "faked",
        "fall",
        "family",
        "fancy",
        "fatal",
        "faulty",
        "fawns",
        "faxed",
        "fazed",
        "feast",
        "feel",
        "feline",
        "fences",
        "ferry",
        "fever",
        "fewest",
        "fiat",
        "fibula",
        "fidget",
        "fierce",
        "fight",
        "films",
        "firm",
        "five",
        "fixate",
        "fizzle",
        "fleet",
        "flying",
        "foamy",
        "focus",
        "foes",
        "foggy",
        "foiled",
        "fonts",
        "fossil",
        "fowls",
        "foxes",
        "foyer",
        "framed",
        "frown",
        "fruit",
        "frying",
        "fudge",
        "fuel",
        "fully",
        "fuming",
        "fungal",
        "future",
        "fuzzy",
        "gables",
        "gadget",
        "gags",
        "gained",
        "galaxy",
        "gambit",
        "gang",
        "gasp",
        "gather",
        "gauze",
        "gave",
        "gawk",
        "gaze",
        "gecko",
        "geek",
        "gels",
        "germs",
        "geyser",
        "ghetto",
        "ghost",
        "giant",
        "giddy",
        "gifts",
        "gills",
        "ginger",
        "girth",
        "giving",
        "glass",
        "glide",
        "gnaw",
        "gnome",
        "goat",
        "goblet",
        "goes",
        "going",
        "gone",
        "gopher",
        "gossip",
        "gotten",
        "gown",
        "grunt",
        "guest",
        "guide",
        "gulp",
        "guru",
        "gusts",
        "gutter",
        "guys",
        "gypsy",
        "gyrate",
        "hairy",
        "having",
        "hawk",
        "hazard",
        "heels",
        "hefty",
        "height",
        "hence",
        "heron",
        "hiding",
        "hijack",
        "hiker",
        "hills",
        "hinder",
        "hippo",
        "hire",
        "hive",
        "hoax",
        "hobby",
        "hockey",
        "hold",
        "honked",
        "hookup",
        "hope",
        "hornet",
        "hotel",
        "hover",
        "howls",
        "huddle",
        "huge",
        "hull",
        "humid",
        "hunter",
        "huts",
        "hybrid",
        "hyper",
        "icing",
        "icon",
        "idiom",
        "idled",
        "idols",
        "igloo",
        "ignore",
        "iguana",
        "impel",
        "incur",
        "injury",
        "inline",
        "inmate",
        "input",
        "insult",
        "invoke",
        "ionic",
        "irate",
        "iris",
        "irony",
        "island",
        "issued",
        "itches",
        "items",
        "itself",
        "ivory",
        "jabbed",
        "jaded",
        "jagged",
        "jailed",
        "jargon",
        "jaunt",
        "jaws",
        "jazz",
        "jeans",
        "jeers",
        "jester",
        "jewels",
        "jigsaw",
        "jingle",
        "jive",
        "jobs",
        "jockey",
        "jogger",
        "joking",
        "jolted",
        "jostle",
        "joyous",
        "judge",
        "juicy",
        "july",
        "jump",
        "junk",
        "jury",
        "karate",
        "keep",
        "kennel",
        "kept",
        "kettle",
        "king",
        "kiosk",
        "kisses",
        "kiwi",
        "knee",
        "knife",
        "koala",
        "ladder",
        "lagoon",
        "lair",
        "lakes",
        "lamb",
        "laptop",
        "large",
        "last",
        "later",
        "lava",
        "layout",
        "lazy",
        "ledge",
        "leech",
        "left",
        "legion",
        "lemon",
        "lesson",
        "liar",
        "licks",
        "lids",
        "lied",
        "light",
        "lilac",
        "limits",
        "linen",
        "lion",
        "liquid",
        "listen",
        "lively",
        "loaded",
        "locker",
        "lodge",
        "lofty",
        "logic",
        "long",
        "lopped",
        "losing",
        "loudly",
        "love",
        "lower",
        "loyal",
        "lucky",
        "lumber",
        "lunar",
        "lurk",
        "lush",
        "luxury",
        "lymph",
        "lynx",
        "lyrics",
        "macro",
        "mailed",
        "major",
        "makeup",
        "malady",
        "mammal",
        "maps",
        "match",
        "maul",
        "mayor",
        "maze",
        "meant",
        "memoir",
        "menu",
        "merger",
        "mesh",
        "metro",
        "mews",
        "mice",
        "midst",
        "mighty",
        "mime",
        "mirror",
        "misery",
        "moat",
        "mobile",
        "mocked",
        "mohawk",
        "molten",
        "moment",
        "money",
        "moon",
        "mops",
        "morsel",
        "mostly",
        "mouth",
        "mowing",
        "much",
        "muddy",
        "muffin",
        "mugged",
        "mullet",
        "mumble",
        "muppet",
        "mural",
        "muzzle",
        "myriad",
        "myth",
        "nagged",
        "nail",
        "names",
        "nanny",
        "napkin",
        "nasty",
        "navy",
        "nearby",
        "needed",
        "neon",
        "nephew",
        "nerves",
        "nestle",
        "never",
        "newt",
        "nexus",
        "nibs",
        "niche",
        "niece",
        "nifty",
        "nimbly",
        "nobody",
        "nodes",
        "noises",
        "nomad",
        "noted",
        "nouns",
        "nozzle",
        "nuance",
        "nudged",
        "nugget",
        "null",
        "number",
        "nuns",
        "nurse",
        "nylon",
        "oaks",
        "oars",
        "oasis",
        "object",
        "occur",
        "ocean",
        "odds",
        "offend",
        "often",
        "okay",
        "older",
        "olive",
        "omega",
        "onion",
        "online",
        "onto",
        "onward",
        "oozed",
        "opened",
        "opus",
        "orange",
        "orbit",
        "orchid",
        "orders",
        "organs",
        "origin",
        "oscar",
        "otter",
        "ouch",
        "ought",
        "ounce",
        "oust",
        "oval",
        "oven",
        "owed",
        "owls",
        "owner",
        "oxygen",
        "oyster",
        "ozone",
        "pact",
        "pager",
        "palace",
        "paper",
        "pastry",
        "patio",
        "pause",
        "peeled",
        "pegs",
        "pencil",
        "people",
        "pepper",
        "pests",
        "petals",
        "phase",
        "phone",
        "piano",
        "picked",
        "pierce",
        "pimple",
        "pirate",
        "pivot",
        "pixels",
        "pizza",
        "pledge",
        "pliers",
        "plus",
        "poetry",
        "point",
        "poker",
        "polar",
        "ponies",
        "pool",
        "potato",
        "pouch",
        "powder",
        "pram",
        "pride",
        "pruned",
        "prying",
        "public",
        "puck",
        "puddle",
        "puffin",
        "pulp",
        "punch",
        "puppy",
        "purged",
        "push",
        "putty",
        "pylons",
        "python",
        "queen",
        "quick",
        "quote",
        "radar",
        "rafts",
        "rage",
        "raking",
        "rally",
        "ramped",
        "rapid",
        "rarest",
        "rash",
        "rated",
        "ravine",
        "rays",
        "razor",
        "react",
        "rebel",
        "recipe",
        "reduce",
        "reef",
        "refer",
        "reheat",
        "relic",
        "remedy",
        "repent",
        "reruns",
        "rest",
        "return",
        "revamp",
        "rewind",
        "rhino",
        "rhythm",
        "ribbon",
        "richly",
        "ridges",
        "rift",
        "rigid",
        "rims",
        "riots",
        "ripped",
        "rising",
        "ritual",
        "river",
        "roared",
        "robot",
        "rodent",
        "rogue",
        "roles",
        "roomy",
        "roped",
        "roster",
        "rotate",
        "rover",
        "royal",
        "ruby",
        "rudely",
        "rugged",
        "ruined",
        "ruling",
        "rumble",
        "runway",
        "rural",
        "sack",
        "safety",
        "saga",
        "sailor",
        "sake",
        "salads",
        "sample",
        "sanity",
        "sash",
        "satin",
        "saved",
        "scenic",
        "school",
        "scoop",
        "scrub",
        "scuba",
        "second",
        "sedan",
        "seeded",
        "setup",
        "sewage",
        "sieve",
        "silk",
        "sipped",
        "siren",
        "sizes",
        "skater",
        "skew",
        "skulls",
        "slid",
        "slower",
        "slug",
        "smash",
        "smog",
        "snake",
        "sneeze",
        "sniff",
        "snout",
        "snug",
        "soapy",
        "sober",
        "soccer",
        "soda",
        "soggy",
        "soil",
        "solved",
        "sonic",
        "soothe",
        "sorry",
        "sowed",
        "soya",
        "space",
        "speedy",
        "sphere",
        "spout",
        "sprig",
        "spud",
        "spying",
        "square",
        "stick",
        "subtly",
        "suede",
        "sugar",
        "summon",
        "sunken",
        "surfer",
        "sushi",
        "suture",
        "swept",
        "sword",
        "swung",
        "system",
        "taboo",
        "tacit",
        "tagged",
        "tail",
        "taken",
        "talent",
        "tamper",
        "tanks",
        "tasked",
        "tattoo",
        "taunts",
        "tavern",
        "tawny",
        "taxi",
        "tell",
        "tender",
        "tepid",
        "tether",
        "thaw",
        "thorn",
        "thumbs",
        "thwart",
        "ticket",
        "tidy",
        "tiers",
        "tiger",
        "tilt",
        "timber",
        "tinted",
        "tipsy",
        "tirade",
        "tissue",
        "titans",
        "today",
        "toffee",
        "toilet",
        "token",
        "tonic",
        "topic",
        "torch",
        "tossed",
        "total",
        "touchy",
        "towel",
        "toxic",
        "toyed",
        "trash",
        "trendy",
        "tribal",
        "truth",
        "trying",
        "tubes",
        "tucks",
        "tudor",
        "tufts",
        "tugs",
        "tulips",
        "tunnel",
        "turnip",
        "tusks",
        "tutor",
        "tuxedo",
        "twang",
        "twice",
        "tycoon",
        "typist",
        "tyrant",
        "ugly",
        "ulcers",
        "umpire",
        "uncle",
        "under",
        "uneven",
        "unfit",
        "union",
        "unmask",
        "unrest",
        "unsafe",
        "until",
        "unveil",
        "unwind",
        "unzip",
        "upbeat",
        "update",
        "uphill",
        "upkeep",
        "upload",
        "upon",
        "upper",
        "urban",
        "urgent",
        "usage",
        "useful",
        "usher",
        "using",
        "usual",
        "utmost",
        "utopia",
        "vague",
        "vain",
        "value",
        "vane",
        "vary",
        "vats",
        "vaults",
        "vector",
        "veered",
        "vegan",
        "vein",
        "velvet",
        "vessel",
        "vexed",
        "vials",
        "victim",
        "video",
        "viking",
        "violin",
        "vipers",
        "vitals",
        "vivid",
        "vixen",
        "vocal",
        "vogue",
        "voice",
        "vortex",
        "voted",
        "vowels",
        "voyage",
        "wade",
        "waffle",
        "waist",
        "waking",
        "wanted",
        "warped",
        "water",
        "waxing",
        "wedge",
        "weird",
        "went",
        "wept",
        "were",
        "whale",
        "when",
        "whole",
        "width",
        "wield",
        "wife",
        "wiggle",
        "wildly",
        "winter",
        "wiring",
        "wise",
        "wives",
        "wizard",
        "wobbly",
        "woes",
        "woken",
        "wolf",
        "woozy",
        "worry",
        "woven",
        "wrap",
        "wrist",
        "wrong",
        "yacht",
        "yahoo",
        "yanks",
    ];

    // tryStringify will try to turn the provided input into a string. If the input
    // object is already a string, the input object will be returned. If the input
    // object has a toString method, the toString method will be called. If that
    // fails, we try to call JSON.stringify on the object. And if that fails, we
    // set the return value to "[stringify failed]".
    function tryStringify(obj) {
        // Check for undefined input.
        if (obj === undefined) {
            return "[cannot stringify undefined input]";
        }
        if (obj === null) {
            return "[null]";
        }
        // Parse the error into a string.
        if (typeof obj === "string") {
            return obj;
        }
        // Check if the object has a 'toString' method defined on it. To ensure
        // that we don't crash or throw, check that the toString is a function, and
        // also that the return value of toString is a string.
        if (Object.prototype.hasOwnProperty.call(obj, "toString")) {
            if (typeof obj.toString === "function") {
                let str = obj.toString();
                if (typeof str === "string") {
                    return str;
                }
            }
        }
        // If the object does not have a custom toString, attempt to perform a
        // JSON.stringify.
        try {
            return JSON.stringify(obj);
        }
        catch {
            return "[stringify failed]";
        }
    }

    // addContextToErr is a helper function that standardizes the formatting of
    // adding context to an error. Within the world of go we discovered that being
    // persistent about layering context onto errors is helpful when debugging,
    // even though it often creates rather verbose error messages.
    //
    // addContextToErr will return null if the input err is null.
    //
    // NOTE: To protect against accidental situations where an Error type or some
    // other type is provided instead of a string, we wrap both of the inputs with
    // tryStringify before returning them. This prevents runtime failures.
    function addContextToErr(err, context) {
        if (err === null) {
            err = "[no error provided]";
        }
        err = tryStringify(err);
        return tryStringify(context) + ": " + tryStringify(err);
    }
    // composeErr takes a series of inputs and composes them into a single string.
    // Each element will be separated by a newline. If the input is not a string,
    // it will be transformed into a string with JSON.stringify.
    //
    // Any object that cannot be stringified will be skipped, though an error will
    // be logged.
    function composeErr(...inputs) {
        let result = "";
        let resultEmpty = true;
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i] === null) {
                continue;
            }
            if (resultEmpty) {
                resultEmpty = false;
            }
            else {
                result += "\n";
            }
            result += tryStringify(inputs[i]);
        }
        if (resultEmpty) {
            return null;
        }
        return result;
    }

    // Helper consts to make it easy to return empty values alongside errors.
    const nu8$6 = new Uint8Array(0);
    // b64ToBuf will take an untrusted base64 string and convert it into a
    // Uin8Array, returning an error if the input is not valid base64.
    function b64ToBuf(b64) {
        // Check that the final string is valid base64.
        let b64regex = /^[0-9a-zA-Z-_/+=]*$/;
        if (!b64regex.test(b64)) {
            return [nu8$6, "provided string is not valid base64"];
        }
        // Swap any '-' characters for '+', and swap any '_' characters for '/'
        // for use in the atob function.
        b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
        // Perform the conversion.
        let binStr = atob(b64);
        let len = binStr.length;
        let buf = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            buf[i] = binStr.charCodeAt(i);
        }
        return [buf, null];
    }
    // bufToHex takes a Uint8Array as input and returns the hex encoding of those
    // bytes as a string.
    function bufToHex(buf) {
        return [...buf].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    // bufToB64 will convert a Uint8Array to a base64 string with URL encoding and
    // no padding characters.
    function bufToB64(buf) {
        let b64Str = btoa(String.fromCharCode.apply(null, buf));
        return b64Str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    }
    // bufToStr takes an ArrayBuffer as input and returns a text string. bufToStr
    // will check for invalid characters.
    function bufToStr(buf) {
        try {
            let text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
            return [text, null];
        }
        catch (err) {
            return ["", addContextToErr(err.toString(), "unable to decode ArrayBuffer to string")];
        }
    }
    // decodeBigint will take an 8 byte Uint8Array and decode it as a bigint.
    function decodeBigint(buf) {
        if (buf.length !== 8) {
            return [0n, "a number is expected to be 8 bytes"];
        }
        let num = 0n;
        for (let i = 7; i >= 0; i--) {
            num *= 256n;
            num += BigInt(buf[i]);
        }
        return [num, null];
    }
    // encodePrefixedBytes takes a Uint8Array as input and returns a Uint8Array
    // that has the length prefixed as an 8 byte prefix. The input can be at most 4
    // GiB.
    function encodePrefixedBytes(bytes) {
        let len = bytes.length;
        if (len > 4294968295) {
            return [nu8$6, "input is too large to be encoded"];
        }
        let buf = new ArrayBuffer(8 + len);
        let view = new DataView(buf);
        view.setUint32(0, len, true);
        let uint8Bytes = new Uint8Array(buf);
        uint8Bytes.set(bytes, 8);
        return [uint8Bytes, null];
    }
    // encodeU64 will encode a bigint in the range of a uint64 to an 8 byte
    // Uint8Array.
    function encodeU64(num) {
        // Check the bounds on the bigint.
        if (num < 0) {
            return [nu8$6, "expected a positive integer"];
        }
        if (num > 18446744073709551615n) {
            return [nu8$6, "expected a number no larger than a uint64"];
        }
        // Encode the bigint into a Uint8Array.
        let encoded = new Uint8Array(8);
        for (let i = 0; i < encoded.length; i++) {
            let byte = Number(num & 0xffn);
            encoded[i] = byte;
            num = num >> 8n;
        }
        return [encoded, null];
    }
    // hexToBuf takes an untrusted string as input, verifies that the string is
    // valid hex, and then converts the string to a Uint8Array.
    function hexToBuf(hex) {
        // Check that the length makes sense.
        if (hex.length % 2 != 0) {
            return [nu8$6, "input has incorrect length"];
        }
        // Check that all of the characters are legal.
        let match = /[0-9A-Fa-f]*/g;
        if (!match.test(hex)) {
            return [nu8$6, "input has invalid character"];
        }
        // Create the buffer and fill it.
        let matches = hex.match(/.{1,2}/g);
        if (matches === null) {
            return [nu8$6, "input is incomplete"];
        }
        let u8 = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
        return [u8, null];
    }

    // Helper values for cleanly returning errors.
    const nu8$5 = new Uint8Array(0);
    // blake2bAddSubtreeToProofStack will add a subtree to a proof stack.
    function blake2bAddSubtreeToProofStack(ps, subtreeRoot, subtreeHeight) {
        // Input checking.
        if (subtreeRoot.length !== 32) {
            return "cannot add subtree because root is wrong length";
        }
        // If the proofStack has no elements in it yet, add the subtree
        // with no further checks.
        if (ps.subtreeRoots.length === 0) {
            ps.subtreeRoots.push(subtreeRoot);
            ps.subtreeHeights.push(subtreeHeight);
            return null;
        }
        // Check the height of the new subtree against the height of the smallest
        // subtree in the proofStack. If the new subtree is larger, the subtree
        // cannot be added.
        let maxHeight = ps.subtreeHeights[ps.subtreeHeights.length - 1];
        if (subtreeHeight > maxHeight) {
            return `cannot add a subtree that is taller ${subtreeHeight} than the smallest ${maxHeight} subtree in the stack`;
        }
        // If the new subtreeHeight is smaller than the max height, we can just
        // append the subtree height without doing anything more.
        if (subtreeHeight < maxHeight) {
            ps.subtreeRoots.push(subtreeRoot);
            ps.subtreeHeights.push(subtreeHeight);
            return null;
        }
        // If the new subtree is the same height as the smallest subtree, we
        // have to pull the smallest subtree out, combine it with the new
        // subtree, and push the result.
        let oldSTR = ps.subtreeRoots.pop();
        ps.subtreeHeights.pop(); // We already have the height.
        let combinedRoot = new Uint8Array(65);
        combinedRoot[0] = 1;
        combinedRoot.set(oldSTR, 1);
        combinedRoot.set(subtreeRoot, 33);
        let newSubtreeRoot = blake2b(combinedRoot);
        return blake2bAddSubtreeToProofStack(ps, newSubtreeRoot, subtreeHeight + 1n);
    }
    // blake2bAddLeafBytesToProofStack will add a leaf to a proof stack.
    function blake2bAddLeafBytesToProofStack(ps, leafBytes) {
        if (leafBytes.length !== 64) {
            return "proofStack expects leafByte objects to be exactly 64 bytes";
        }
        let taggedBytes = new Uint8Array(65);
        taggedBytes.set(leafBytes, 1);
        let subtreeRoot = blake2b(taggedBytes);
        return blake2bAddSubtreeToProofStack(ps, subtreeRoot, 1n);
    }
    // blake2bProofStackRoot returns the final Merkle root of the data in the
    // current proof stack.
    function blake2bProofStackRoot(ps) {
        // Input checking.
        if (ps.subtreeRoots.length === 0) {
            return [nu8$5, "cannot compute the Merkle root of an empty data set"];
        }
        // Algorithm is pretty basic, start with the final tree, and then add
        // it to the previous tree. Repeat until there are no more trees.
        let baseSubtreeRoot = ps.subtreeRoots.pop();
        while (ps.subtreeRoots.length !== 0) {
            let nextSubtreeRoot = ps.subtreeRoots.pop();
            let combinedRoot = new Uint8Array(65);
            combinedRoot[0] = 1;
            combinedRoot.set(baseSubtreeRoot, 1);
            combinedRoot.set(nextSubtreeRoot, 33);
            baseSubtreeRoot = blake2b(combinedRoot);
        }
        return [baseSubtreeRoot, null];
    }
    // nextSubtreeHeight returns the height of the largest subtree that contains
    // 'start', contains no elements prior to 'start', and also does not contain
    // 'end'.
    function nextSubtreeHeight(start, end) {
        // Input checking.
        if (end <= start) {
            return [0n, 0n, `end (${end}) must be strictly larger than start (${start})`];
        }
        // Merkle trees have a nice mathematical property that the largest tree
        // which contains a particular node and no nodes prior to it will have
        // a height that is equal to the number of trailing zeroes in the base
        // 2 representation of the index of that node.
        //
        // We are exploiting that property to compute the 'idealTreeHeight'. If
        // 'start' is zero, the ideal tree height will just keep counting up
        // forever, so we cut it off at 53.
        let idealTreeHeight = 1n;
        let idealTreeSize = 1n;
        // The conditional inside the loop tests if the next ideal tree size is
        // acceptable. If it is, we increment the height and double the size.
        while (start % (idealTreeSize * 2n) === 0n) {
            idealTreeHeight++;
            idealTreeSize = idealTreeSize * 2n;
        }
        // To compute the max tree height, we essentially just find the largest
        // power of 2 that is smaller than or equal to the gap between start
        // and end.
        let maxTreeHeight = 1n;
        let maxTreeSize = 1n;
        let range = end - start + 1n;
        while (maxTreeSize * 2n < range) {
            maxTreeHeight++;
            maxTreeSize = maxTreeSize * 2n;
        }
        // Return the smaller of the ideal height and the max height, as each
        // of them is an upper bound on how large things are allowed to be.
        if (idealTreeHeight < maxTreeHeight) {
            return [idealTreeHeight, idealTreeSize, null];
        }
        return [maxTreeHeight, maxTreeSize, null];
    }
    // blake2bMerkleRoot computes the merkle root of the provided data using a leaf
    // size of 64 bytes and blake2b as the hashing function.
    function blake2bMerkleRoot(data) {
        // Check that the input is an acceptable length.
        if (data.length % 64 !== 0) {
            return [nu8$5, "cannot take the merkle root of data that is not a multiple of 64 bytes"];
        }
        // Compute the Merkle root.
        let ps = {
            subtreeRoots: [],
            subtreeHeights: [],
        };
        for (let i = 0; i < data.length; i += 64) {
            blake2bAddLeafBytesToProofStack(ps, data.slice(i, i + 64));
        }
        return blake2bProofStackRoot(ps);
    }
    // blake2bVerifySectorRangeProof will verify a merkle proof that the provided
    // data exists within the provided sector at the provided range.
    //
    // NOTE: This implementation only handles a single range, but the transition to
    // doing mulit-range proofs is not very large. The main reason I didn't extend
    // this function was because it made the inputs a lot messier. The Sia merkle
    // tree repo uses the same techniques and has the full implementation, use that
    // as a reference if you need to extend this function to support multi-range
    // proofs.
    function blake2bVerifySectorRangeProof(root, data, rangeStart, rangeEnd, proof) {
        // Verify the inputs.
        if (root.length !== 32) {
            return "provided root is not a blake2b sector root";
        }
        if (rangeEnd <= rangeStart) {
            return "provided has no data";
        }
        if (rangeStart < 0n) {
            return "cannot use negative ranges";
        }
        if (rangeEnd > 4194304n) {
            return "range is out of bounds";
        }
        if (proof.length % 32 !== 0) {
            return "merkle proof has invalid length";
        }
        if (data.length !== Number(rangeEnd - rangeStart)) {
            return "data length does not match provided range";
        }
        if (data.length % 64 !== 0) {
            return "data must have a multiple of 64 bytes";
        }
        // We will consume proof elements until we get to the rangeStart of the
        // data.
        let ps = {
            subtreeRoots: [],
            subtreeHeights: [],
        };
        let currentOffset = 0n;
        let proofOffset = 0;
        while (currentOffset < rangeStart) {
            if (proof.length < proofOffset + 32) {
                return "merkle proof has insufficient data";
            }
            let [height, size, errNST] = nextSubtreeHeight(currentOffset / 64n, rangeStart / 64n);
            if (errNST !== null) {
                return addContextToErr(errNST, "error computing subtree height of initial proof stack");
            }
            let newSubtreeRoot = new Uint8Array(32);
            newSubtreeRoot.set(proof.slice(proofOffset, proofOffset + 32), 0);
            proofOffset += 32;
            let errSPS = blake2bAddSubtreeToProofStack(ps, newSubtreeRoot, height);
            if (errSPS !== null) {
                return addContextToErr(errSPS, "error adding subtree to initial proof stack");
            }
            currentOffset += size * 64n;
        }
        // We will consume data elements until we get to the end of the data.
        let dataOffset = 0;
        while (data.length > dataOffset) {
            let errLBPS = blake2bAddLeafBytesToProofStack(ps, data.slice(dataOffset, dataOffset + 64));
            if (errLBPS !== null) {
                return addContextToErr(errLBPS, "error adding leaves to proof stack");
            }
            dataOffset += 64;
            currentOffset += 64n;
        }
        // Consume proof elements until the entire sector is proven.
        let sectorEnd = 4194304n;
        while (currentOffset < sectorEnd) {
            if (proof.length < proofOffset + 32) {
                return "merkle proof has insufficient data";
            }
            let [height, size, errNST] = nextSubtreeHeight(currentOffset / 64n, sectorEnd / 64n);
            if (errNST !== null) {
                return addContextToErr(errNST, "error computing subtree height of trailing proof stack");
            }
            let newSubtreeRoot = new Uint8Array(32);
            newSubtreeRoot.set(proof.slice(proofOffset, proofOffset + 32), 0);
            proofOffset += 32;
            let errSPS = blake2bAddSubtreeToProofStack(ps, newSubtreeRoot, height);
            if (errSPS !== null) {
                return addContextToErr(errSPS, "error adding subtree to trailing proof stack");
            }
            currentOffset += size * 64n;
        }
        return null;
    }

    // Helper consts to make it easier to return empty values in the event of an
    // error.
    const nu8$4 = new Uint8Array(0);
    // verifyDownload will verify a download response from a portal. The input is
    // essentially components of a skylink - the offset, length, and merkle root.
    // The output is the raw file data.
    //
    // The 'buf' input should match the standard response body of a verified
    // download request to a portal, which is the skylink raw data followed by a
    // merkle proof. The offset and length provided as input indicate the offset
    // and length of the skylink raw data - not the offset and length of the
    // request within the file (that would be a different set of params).
    //
    // The skylink raw data itself breaks down into a metadata component and a file
    // component. The metadata component will contain information like the length
    // of the real file, and any fanout structure for large files. The first step
    // we need to take is verifying the Merkel proof, which will appear at the end
    // of the buffer. We'll have to hash the data we received and then compare it
    // against the Merkle proof and ensure it matches the data we are expecting.
    // Then we'll have to look at the layout to figure out which pieces of the data
    // are the full file, while also checking for corruption as the file can be
    // malicious independent of the portal operator.
    //
    // As long as the Merkle proof matches the root, offset, and length that we
    // have as input, the portal is considered non-malicious. Any additional errors
    // we find after that can be considered malice or incompetence on the part of
    // the person who uploaded the file.
    function verifyDownload(root, offset, fetchSize, buf) {
        let u8 = new Uint8Array(buf);
        // Input checking. If any of this is incorrect, its safe to blame the
        // server because the skylink format fundamentally should enable these
        // to be correct.
        if (u8.length < fetchSize) {
            return [nu8$4, true, "provided data is not large enough to cover fetchSize"];
        }
        if (u8.length < 99) {
            return [nu8$4, true, "provided data is not large enough to contain a skyfile"];
        }
        // Grab the skylinkData and Merkle proof from the array, and then
        // verify the Merkle proof.
        let skylinkData = u8.slice(0, Number(fetchSize));
        let merkleProof = u8.slice(Number(fetchSize), u8.length);
        let errVBSRP = blake2bVerifySectorRangeProof(root, skylinkData, offset, fetchSize, merkleProof);
        if (errVBSRP !== null) {
            return [nu8$4, true, addContextToErr(errVBSRP, "provided Merkle proof is not valid")];
        }
        // Up until this point, an error indicated that the portal was at fault for
        // either returning the wrong data or otherwise providing a malformed
        // repsonse. The remaining checks relate to the consistency of the file
        // itself, if the file is corrupt but the hash matches, there will be an
        // error and the portal will not be at fault.
        // The organization of the skylinkData is always:
        // 	layoutBytes || fanoutBytes || metadataBytes || fileBytes
        //
        // The layout is always exactly 99 bytes. Bytes [1,8] of the layout
        // contain the exact size of the fileBytes. Bytes [9, 16] of the layout
        // contain the exact size of the metadata. And bytes [17,24] of the
        // layout contain the exact size of the fanout. To get the offset of
        // the fileData, we need to extract the sizes of the metadata and
        // fanout, and then add those values to 99 to get the fileData offset.
        let fileSizeBytes = skylinkData.slice(1, 9);
        let mdSizeBytes = skylinkData.slice(9, 17);
        let fanoutSizeBytes = skylinkData.slice(17, 25);
        let [fileSize, errFSDN] = decodeBigint(fileSizeBytes);
        if (errFSDN !== null) {
            return [nu8$4, false, addContextToErr(errFSDN, "unable to decode filesize")];
        }
        let [mdSize, errMDDN] = decodeBigint(mdSizeBytes);
        if (errMDDN !== null) {
            return [nu8$4, false, addContextToErr(errMDDN, "unable to decode metadata size")];
        }
        let [fanoutSize, errFODN] = decodeBigint(fanoutSizeBytes);
        if (errFODN !== null) {
            return [nu8$4, false, addContextToErr(errFODN, "unable to decode fanout size")];
        }
        if (BigInt(skylinkData.length) < 99n + fileSize + mdSize + fanoutSize) {
            return [nu8$4, false, "provided data is too short to contain the full skyfile"];
        }
        let fileData = skylinkData.slice(Number(99n + mdSize + fanoutSize), Number(99n + mdSize + fanoutSize + fileSize));
        return [fileData, false, null];
    }

    // @ts-nocheck
    // json_parse extracted from the json-bigint npm library
    // regexpxs extracted from
    // (c) BSD-3-Clause
    // https://github.com/fastify/secure-json-parse/graphs/contributors and https://github.com/hapijs/bourne/graphs/contributors
    const suspectProtoRx = /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/;
    const suspectConstructorRx = /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/;
    let json_parse = function (options) {
        // This is a function that can parse a JSON text, producing a JavaScript
        // data structure. It is a simple, recursive descent parser. It does not use
        // eval or regular expressions, so it can be used as a model for implementing
        // a JSON parser in other languages.
        // We are defining the function inside of another function to avoid creating
        // global variables.
        // Default options one can override by passing options to the parse()
        let _options = {
            strict: false,
            storeAsString: false,
            alwaysParseAsBig: false,
            protoAction: "error",
            constructorAction: "error",
        };
        // If there are options, then use them to override the default _options
        if (options !== undefined && options !== null) {
            if (options.strict === true) {
                _options.strict = true;
            }
            if (options.storeAsString === true) {
                _options.storeAsString = true;
            }
            _options.alwaysParseAsBig = options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false;
            if (typeof options.constructorAction !== "undefined") {
                if (options.constructorAction === "error" ||
                    options.constructorAction === "ignore" ||
                    options.constructorAction === "preserve") {
                    _options.constructorAction = options.constructorAction;
                }
                else {
                    throw new Error(`Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`);
                }
            }
            if (typeof options.protoAction !== "undefined") {
                if (options.protoAction === "error" || options.protoAction === "ignore" || options.protoAction === "preserve") {
                    _options.protoAction = options.protoAction;
                }
                else {
                    throw new Error(`Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`);
                }
            }
        }
        let at, // The index of the current character
        ch, // The current character
        escapee = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            b: "\b",
            f: "\f",
            n: "\n",
            r: "\r",
            t: "\t",
        }, text, error = function (m) {
            // Call error when something is wrong.
            throw {
                name: "SyntaxError",
                message: m,
                at: at,
                text: text,
            };
        }, next = function (c) {
            // If a c parameter is provided, verify that it matches the current character.
            if (c && c !== ch) {
                error("Expected '" + c + "' instead of '" + ch + "'");
            }
            // Get the next character. When there are no more characters,
            // return the empty string.
            ch = text.charAt(at);
            at += 1;
            return ch;
        }, number = function () {
            // Parse a number value.
            let number, string = "";
            if (ch === "-") {
                string = "-";
                next("-");
            }
            while (ch >= "0" && ch <= "9") {
                string += ch;
                next();
            }
            if (ch === ".") {
                string += ".";
                while (next() && ch >= "0" && ch <= "9") {
                    string += ch;
                }
            }
            if (ch === "e" || ch === "E") {
                string += ch;
                next();
                if (ch === "-" || ch === "+") {
                    string += ch;
                    next();
                }
                while (ch >= "0" && ch <= "9") {
                    string += ch;
                    next();
                }
            }
            number = +string;
            if (!isFinite(number)) {
                error("Bad number");
            }
            else {
                if (Number.isSafeInteger(number))
                    return !_options.alwaysParseAsBig ? number : BigInt(number);
                // Number with fractional part should be treated as number(double) including big integers in scientific notation, i.e 1.79e+308
                else
                    return _options.storeAsString ? string : /[.eE]/.test(string) ? number : BigInt(string);
            }
        }, string = function () {
            // Parse a string value.
            let hex, i, string = "", uffff;
            // When parsing for string values, we must look for " and \ characters.
            if (ch === '"') {
                let startAt = at;
                while (next()) {
                    if (ch === '"') {
                        if (at - 1 > startAt)
                            string += text.substring(startAt, at - 1);
                        next();
                        return string;
                    }
                    if (ch === "\\") {
                        if (at - 1 > startAt)
                            string += text.substring(startAt, at - 1);
                        next();
                        if (ch === "u") {
                            uffff = 0;
                            for (i = 0; i < 4; i += 1) {
                                hex = parseInt(next(), 16);
                                if (!isFinite(hex)) {
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            string += String.fromCharCode(uffff);
                        }
                        else if (typeof escapee[ch] === "string") {
                            string += escapee[ch];
                        }
                        else {
                            break;
                        }
                        startAt = at;
                    }
                }
            }
            error("Bad string");
        }, white = function () {
            // Skip whitespace.
            while (ch && ch <= " ") {
                next();
            }
        }, word = function () {
            // true, false, or null.
            switch (ch) {
                case "t":
                    next("t");
                    next("r");
                    next("u");
                    next("e");
                    return true;
                case "f":
                    next("f");
                    next("a");
                    next("l");
                    next("s");
                    next("e");
                    return false;
                case "n":
                    next("n");
                    next("u");
                    next("l");
                    next("l");
                    return null;
            }
            error("Unexpected '" + ch + "'");
        }, value, // Place holder for the value function.
        array = function () {
            // Parse an array value.
            let array = [];
            if (ch === "[") {
                next("[");
                white();
                if (ch === "]") {
                    next("]");
                    return array; // empty array
                }
                while (ch) {
                    array.push(value());
                    white();
                    if (ch === "]") {
                        next("]");
                        return array;
                    }
                    next(",");
                    white();
                }
            }
            error("Bad array");
        }, object = function () {
            // Parse an object value.
            let key, object = Object.create(null);
            if (ch === "{") {
                next("{");
                white();
                if (ch === "}") {
                    next("}");
                    return object; // empty object
                }
                while (ch) {
                    key = string();
                    white();
                    next(":");
                    if (_options.strict === true && Object.hasOwnProperty.call(object, key)) {
                        error('Duplicate key "' + key + '"');
                    }
                    if (suspectProtoRx.test(key) === true) {
                        if (_options.protoAction === "error") {
                            error("Object contains forbidden prototype property");
                        }
                        else if (_options.protoAction === "ignore") {
                            value();
                        }
                        else {
                            object[key] = value();
                        }
                    }
                    else if (suspectConstructorRx.test(key) === true) {
                        if (_options.constructorAction === "error") {
                            error("Object contains forbidden constructor property");
                        }
                        else if (_options.constructorAction === "ignore") {
                            value();
                        }
                        else {
                            object[key] = value();
                        }
                    }
                    else {
                        object[key] = value();
                    }
                    white();
                    if (ch === "}") {
                        next("}");
                        return object;
                    }
                    next(",");
                    white();
                }
            }
            error("Bad object");
        };
        value = function () {
            // Parse a JSON value. It could be an object, an array, a string, a number,
            // or a word.
            white();
            switch (ch) {
                case "{":
                    return object();
                case "[":
                    return array();
                case '"':
                    return string();
                case "-":
                    return number();
                default:
                    return ch >= "0" && ch <= "9" ? number() : word();
            }
        };
        // Return the json_parse function. It will have access to all of the above
        // functions and variables.
        return function (source, reviver) {
            let result;
            text = source + "";
            at = 0;
            ch = " ";
            result = value();
            white();
            if (ch) {
                error("Syntax error");
            }
            // If there is a reviver function, we recursively walk the new structure,
            // passing each name/value pair to the reviver function for possible
            // transformation, starting with a temporary root object that holds the result
            // in an empty key. If there is not a reviver function, we simply return the
            // result.
            return typeof reviver === "function"
                ? (function walk(holder, key) {
                    let v, value = holder[key];
                    if (value && typeof value === "object") {
                        Object.keys(value).forEach(function (k) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            }
                            else {
                                delete value[k];
                            }
                        });
                    }
                    return reviver.call(holder, key, value);
                })({ "": result }, "")
                : result;
        };
    };
    // parseJSON is a wrapper for JSONbig.parse that returns an error rather than
    // throwing an error. JSONbig is an alternative to JSON.parse that decodes
    // every number as a bigint. This is required when working with the skyd API
    // because the skyd API uses 64 bit precision for all of its numbers, and
    // therefore cannot be parsed losslessly by javascript. The skyd API is
    // cryptographic, therefore full precision is required.
    function parseJSON(json) {
        try {
            let obj = json_parse({ alwaysParseAsBig: true })(json);
            return [obj, null];
        }
        catch (err) {
            return [{}, tryStringify(err)];
        }
    }

    // Helper consts that make it easier to return empty values when returning an
    // error inside of a function.
    const nu8$3 = new Uint8Array(0);
    // parseSkylinkBitfield parses a skylink bitfield and returns the corresponding
    // version, offset, and fetchSize.
    function parseSkylinkBitfield(skylink) {
        // Validate the input.
        if (skylink.length !== 34) {
            return [0n, 0n, 0n, "provided skylink has incorrect length"];
        }
        // Extract the bitfield.
        let bitfield = new DataView(skylink.buffer).getUint16(0, true);
        // Extract the version.
        let version = (bitfield & 3) + 1;
        // Only versions 1 and 2 are recognized.
        if (version !== 1 && version !== 2) {
            return [0n, 0n, 0n, "provided skylink has unrecognized version"];
        }
        // If the skylink is set to version 2, we only recognize the link if
        // the rest of the bits in the bitfield are empty.
        if (version === 2) {
            if ((bitfield & 3) !== bitfield) {
                return [0n, 0n, 0n, "provided skylink has unrecognized version"];
            }
            return [BigInt(version), 0n, 0n, null];
        }
        // Verify that the mode is valid, then fetch the mode.
        bitfield = bitfield >> 2;
        if ((bitfield & 255) === 255) {
            return [0n, 0n, 0n, "provided skylink has an unrecognized version"];
        }
        let mode = 0;
        for (let i = 0; i < 8; i++) {
            if ((bitfield & 1) === 0) {
                bitfield = bitfield >> 1;
                break;
            }
            bitfield = bitfield >> 1;
            mode++;
        }
        // If the mode is greater than 7, this is not a valid v1 skylink.
        if (mode > 7) {
            return [0n, 0n, 0n, "provided skylink has an invalid v1 bitfield"];
        }
        // Determine the offset and fetchSize increment.
        let offsetIncrement = 4096 << mode;
        let fetchSizeIncrement = 4096;
        let fetchSizeStart = 0;
        if (mode > 0) {
            fetchSizeIncrement = fetchSizeIncrement << (mode - 1);
            fetchSizeStart = (1 << 15) << (mode - 1);
        }
        // The next three bits decide the fetchSize.
        let fetchSizeBits = bitfield & 7;
        fetchSizeBits++; // semantic upstep, range should be [1,8] not [0,8).
        let fetchSize = fetchSizeBits * fetchSizeIncrement + fetchSizeStart;
        bitfield = bitfield >> 3;
        // The remaining bits determine the offset.
        let offset = bitfield * offsetIncrement;
        if (offset + fetchSize > 1 << 22) {
            return [0n, 0n, 0n, "provided skylink has an invalid v1 bitfield"];
        }
        // Return what we learned.
        return [BigInt(version), BigInt(offset), BigInt(fetchSize), null];
    }
    // skylinkV1Bitfield sets the bitfield of a V1 skylink. It assumes the version
    // is 1 and the offset is 0. It will determine the appropriate fetchSize from
    // the provided dataSize.
    function skylinkV1Bitfield(dataSizeBI) {
        // Check that the dataSize is not too large.
        if (dataSizeBI > 1 << 22) {
            return [nu8$3, "dataSize must be less than the sector size"];
        }
        let dataSize = Number(dataSizeBI);
        // Determine the mode for the file. The mode is determined by the
        // dataSize.
        let mode = 0;
        for (let i = 1 << 15; i < dataSize; i *= 2) {
            mode += 1;
        }
        // Determine the download number.
        let downloadNumber = 0;
        if (mode === 0) {
            if (dataSize !== 0) {
                downloadNumber = Math.floor((dataSize - 1) / (1 << 12));
            }
        }
        else {
            let step = 1 << (11 + mode);
            let target = dataSize - (1 << (14 + mode));
            if (target !== 0) {
                downloadNumber = Math.floor((target - 1) / step);
            }
        }
        // Create the Uint8Array and fill it out. The main reason I switch over
        // the 7 modes like this is because I wasn't sure how to make a uint16
        // in javascript. If we could treat the uint8array as a uint16 and then
        // later convert it over, we could use basic bitshifiting and really
        // simplify the code here.
        let bitfield = new Uint8Array(2);
        if (mode === 7) {
            // 0 0 0 X X X 0 1|1 1 1 1 1 1 0 0
            bitfield[0] = downloadNumber;
            bitfield[0] *= 4;
            bitfield[0] += 1;
            bitfield[1] = 4 + 8 + 16 + 32 + 64 + 128;
        }
        if (mode === 6) {
            // 0 0 0 0 X X X 0|1 1 1 1 1 1 0 0
            bitfield[0] = downloadNumber;
            bitfield[0] *= 2;
            bitfield[1] = 4 + 8 + 16 + 32 + 64 + 128;
        }
        if (mode === 5) {
            // 0 0 0 0 0 X X X|0 1 1 1 1 1 0 0
            bitfield[0] = downloadNumber;
            bitfield[1] = 4 + 8 + 16 + 32 + 64;
        }
        if (mode === 4) {
            // 0 0 0 0 0 0 X X|X 0 1 1 1 1 0 0
            bitfield[0] = downloadNumber;
            bitfield[0] /= 2;
            bitfield[1] = (downloadNumber & 1) * 128;
            bitfield[1] += 4 + 8 + 16 + 32;
        }
        if (mode === 3) {
            // 0 0 0 0 0 0 0 X|X X 0 1 1 1 0 0
            bitfield[0] = downloadNumber;
            bitfield[0] /= 4;
            bitfield[1] = (downloadNumber & 3) * 64;
            bitfield[1] += 4 + 8 + 16;
        }
        if (mode === 2) {
            // 0 0 0 0 0 0 0 0|X X X 0 1 1 0 0
            bitfield[0] = 0;
            bitfield[1] = downloadNumber * 32;
            bitfield[1] += 4 + 8;
        }
        if (mode === 1) {
            // 0 0 0 0 0 0 0 0|0 X X X 0 1 0 0
            bitfield[0] = 0;
            bitfield[1] = downloadNumber * 16;
            bitfield[1] += 4;
        }
        if (mode === 0) {
            // 0 0 0 0 0 0 0 0|0 0 X X X 0 0 0
            bitfield[0] = 0;
            bitfield[1] = downloadNumber * 8;
        }
        // Swap the byte order.
        let zero = bitfield[0];
        bitfield[0] = bitfield[1];
        bitfield[1] = zero;
        return [bitfield, null];
    }

    const HASH_SIZE = 64;
    const K = [
        0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b,
        0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118, 0xd807aa98, 0xa3030242,
        0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe,
        0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694, 0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
        0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc,
        0xbd41fbd4, 0x76f988da, 0x831153b5, 0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f,
        0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967,
        0x0a0e6e70, 0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
        0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b, 0xa2bfe8a1,
        0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218,
        0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8, 0x19a4c116, 0xb8d2d0c8, 0x1e376c08,
        0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
        0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3, 0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814,
        0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915,
        0xc67178f2, 0xe372532b, 0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f,
        0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
        0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be,
        0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817,
    ];
    function ts64(x, i, h, l) {
        x[i] = (h >> 24) & 0xff;
        x[i + 1] = (h >> 16) & 0xff;
        x[i + 2] = (h >> 8) & 0xff;
        x[i + 3] = h & 0xff;
        x[i + 4] = (l >> 24) & 0xff;
        x[i + 5] = (l >> 16) & 0xff;
        x[i + 6] = (l >> 8) & 0xff;
        x[i + 7] = l & 0xff;
    }
    function crypto_hashblocks_hl(hh, hl, m, n) {
        let wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
        let ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
        let pos = 0;
        while (n >= 128) {
            for (i = 0; i < 16; i++) {
                j = 8 * i + pos;
                wh[i] = (m[j + 0] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
                wl[i] = (m[j + 4] << 24) | (m[j + 5] << 16) | (m[j + 6] << 8) | m[j + 7];
            }
            for (i = 0; i < 80; i++) {
                bh0 = ah0;
                bh1 = ah1;
                bh2 = ah2;
                bh3 = ah3;
                bh4 = ah4;
                bh5 = ah5;
                bh6 = ah6;
                bh7 = ah7;
                bl0 = al0;
                bl1 = al1;
                bl2 = al2;
                bl3 = al3;
                bl4 = al4;
                bl5 = al5;
                bl6 = al6;
                bl7 = al7;
                // add
                h = ah7;
                l = al7;
                a = l & 0xffff;
                b = l >>> 16;
                c = h & 0xffff;
                d = h >>> 16;
                // Sigma1
                h =
                    ((ah4 >>> 14) | (al4 << (32 - 14))) ^
                        ((ah4 >>> 18) | (al4 << (32 - 18))) ^
                        ((al4 >>> (41 - 32)) | (ah4 << (32 - (41 - 32))));
                l =
                    ((al4 >>> 14) | (ah4 << (32 - 14))) ^
                        ((al4 >>> 18) | (ah4 << (32 - 18))) ^
                        ((ah4 >>> (41 - 32)) | (al4 << (32 - (41 - 32))));
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                // Ch
                h = (ah4 & ah5) ^ (~ah4 & ah6);
                l = (al4 & al5) ^ (~al4 & al6);
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                // K
                h = K[i * 2];
                l = K[i * 2 + 1];
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                // w
                h = wh[i % 16];
                l = wl[i % 16];
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                th = (c & 0xffff) | (d << 16);
                tl = (a & 0xffff) | (b << 16);
                // add
                h = th;
                l = tl;
                a = l & 0xffff;
                b = l >>> 16;
                c = h & 0xffff;
                d = h >>> 16;
                // Sigma0
                h =
                    ((ah0 >>> 28) | (al0 << (32 - 28))) ^
                        ((al0 >>> (34 - 32)) | (ah0 << (32 - (34 - 32)))) ^
                        ((al0 >>> (39 - 32)) | (ah0 << (32 - (39 - 32))));
                l =
                    ((al0 >>> 28) | (ah0 << (32 - 28))) ^
                        ((ah0 >>> (34 - 32)) | (al0 << (32 - (34 - 32)))) ^
                        ((ah0 >>> (39 - 32)) | (al0 << (32 - (39 - 32))));
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                // Maj
                h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
                l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                bh7 = (c & 0xffff) | (d << 16);
                bl7 = (a & 0xffff) | (b << 16);
                // add
                h = bh3;
                l = bl3;
                a = l & 0xffff;
                b = l >>> 16;
                c = h & 0xffff;
                d = h >>> 16;
                h = th;
                l = tl;
                a += l & 0xffff;
                b += l >>> 16;
                c += h & 0xffff;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                bh3 = (c & 0xffff) | (d << 16);
                bl3 = (a & 0xffff) | (b << 16);
                ah1 = bh0;
                ah2 = bh1;
                ah3 = bh2;
                ah4 = bh3;
                ah5 = bh4;
                ah6 = bh5;
                ah7 = bh6;
                ah0 = bh7;
                al1 = bl0;
                al2 = bl1;
                al3 = bl2;
                al4 = bl3;
                al5 = bl4;
                al6 = bl5;
                al7 = bl6;
                al0 = bl7;
                if (i % 16 === 15) {
                    for (j = 0; j < 16; j++) {
                        // add
                        h = wh[j];
                        l = wl[j];
                        a = l & 0xffff;
                        b = l >>> 16;
                        c = h & 0xffff;
                        d = h >>> 16;
                        h = wh[(j + 9) % 16];
                        l = wl[(j + 9) % 16];
                        a += l & 0xffff;
                        b += l >>> 16;
                        c += h & 0xffff;
                        d += h >>> 16;
                        // sigma0
                        th = wh[(j + 1) % 16];
                        tl = wl[(j + 1) % 16];
                        h = ((th >>> 1) | (tl << (32 - 1))) ^ ((th >>> 8) | (tl << (32 - 8))) ^ (th >>> 7);
                        l = ((tl >>> 1) | (th << (32 - 1))) ^ ((tl >>> 8) | (th << (32 - 8))) ^ ((tl >>> 7) | (th << (32 - 7)));
                        a += l & 0xffff;
                        b += l >>> 16;
                        c += h & 0xffff;
                        d += h >>> 16;
                        // sigma1
                        th = wh[(j + 14) % 16];
                        tl = wl[(j + 14) % 16];
                        h = ((th >>> 19) | (tl << (32 - 19))) ^ ((tl >>> (61 - 32)) | (th << (32 - (61 - 32)))) ^ (th >>> 6);
                        l =
                            ((tl >>> 19) | (th << (32 - 19))) ^
                                ((th >>> (61 - 32)) | (tl << (32 - (61 - 32)))) ^
                                ((tl >>> 6) | (th << (32 - 6)));
                        a += l & 0xffff;
                        b += l >>> 16;
                        c += h & 0xffff;
                        d += h >>> 16;
                        b += a >>> 16;
                        c += b >>> 16;
                        d += c >>> 16;
                        wh[j] = (c & 0xffff) | (d << 16);
                        wl[j] = (a & 0xffff) | (b << 16);
                    }
                }
            }
            // add
            h = ah0;
            l = al0;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[0];
            l = hl[0];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[0] = ah0 = (c & 0xffff) | (d << 16);
            hl[0] = al0 = (a & 0xffff) | (b << 16);
            h = ah1;
            l = al1;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[1];
            l = hl[1];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[1] = ah1 = (c & 0xffff) | (d << 16);
            hl[1] = al1 = (a & 0xffff) | (b << 16);
            h = ah2;
            l = al2;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[2];
            l = hl[2];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[2] = ah2 = (c & 0xffff) | (d << 16);
            hl[2] = al2 = (a & 0xffff) | (b << 16);
            h = ah3;
            l = al3;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[3];
            l = hl[3];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[3] = ah3 = (c & 0xffff) | (d << 16);
            hl[3] = al3 = (a & 0xffff) | (b << 16);
            h = ah4;
            l = al4;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[4];
            l = hl[4];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[4] = ah4 = (c & 0xffff) | (d << 16);
            hl[4] = al4 = (a & 0xffff) | (b << 16);
            h = ah5;
            l = al5;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[5];
            l = hl[5];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[5] = ah5 = (c & 0xffff) | (d << 16);
            hl[5] = al5 = (a & 0xffff) | (b << 16);
            h = ah6;
            l = al6;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[6];
            l = hl[6];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[6] = ah6 = (c & 0xffff) | (d << 16);
            hl[6] = al6 = (a & 0xffff) | (b << 16);
            h = ah7;
            l = al7;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = hh[7];
            l = hl[7];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            hh[7] = ah7 = (c & 0xffff) | (d << 16);
            hl[7] = al7 = (a & 0xffff) | (b << 16);
            pos += 128;
            n -= 128;
        }
        return n;
    }
    const sha512internal = function (out, m, n) {
        let hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
        hh[0] = 0x6a09e667;
        hh[1] = 0xbb67ae85;
        hh[2] = 0x3c6ef372;
        hh[3] = 0xa54ff53a;
        hh[4] = 0x510e527f;
        hh[5] = 0x9b05688c;
        hh[6] = 0x1f83d9ab;
        hh[7] = 0x5be0cd19;
        hl[0] = 0xf3bcc908;
        hl[1] = 0x84caa73b;
        hl[2] = 0xfe94f82b;
        hl[3] = 0x5f1d36f1;
        hl[4] = 0xade682d1;
        hl[5] = 0x2b3e6c1f;
        hl[6] = 0xfb41bd6b;
        hl[7] = 0x137e2179;
        crypto_hashblocks_hl(hh, hl, m, n);
        n %= 128;
        for (i = 0; i < n; i++)
            x[i] = m[b - n + i];
        x[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x[n - 9] = 0;
        ts64(x, n - 8, (b / 0x20000000) | 0, b << 3);
        crypto_hashblocks_hl(hh, hl, x, n);
        for (i = 0; i < 8; i++)
            ts64(out, 8 * i, hh[i], hl[i]);
        return 0;
    };
    // sha512 is the standard sha512 cryptographic hash function. This is the
    // default choice for Skynet operations, though many of the Sia protocol
    // standards use blake2b instead, so you will see both.
    function sha512(m) {
        const out = new Uint8Array(HASH_SIZE);
        sha512internal(out, m, m.length);
        return out;
    }

    let crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32;
    let gf = function () {
        let r = new Float64Array(16);
        return r;
    };
    let gfi = function (init) {
        let i, r = new Float64Array(16);
        if (init)
            for (i = 0; i < init.length; i++)
                r[i] = init[i];
        return r;
    };
    let gf0 = gf(), gf1 = gfi([1]), D = gfi([
        0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f,
        0x6cee, 0x5203,
    ]), D2 = gfi([
        0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df,
        0xd9dc, 0x2406,
    ]), X = gfi([
        0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e,
        0x36d3, 0x2169,
    ]), Y = gfi([
        0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666,
        0x6666, 0x6666,
    ]), I = gfi([
        0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1,
        0x2480, 0x2b83,
    ]);
    function vn(x, xi, y, yi, n) {
        let i, d = 0;
        for (i = 0; i < n; i++)
            d |= x[xi + i] ^ y[yi + i];
        return (1 & ((d - 1) >>> 8)) - 1;
    }
    function crypto_verify_32(x, xi, y, yi) {
        return vn(x, xi, y, yi, 32);
    }
    function set25519(r, a) {
        let i;
        for (i = 0; i < 16; i++)
            r[i] = a[i] | 0;
    }
    function car25519(o) {
        let i, v, c = 1;
        for (i = 0; i < 16; i++) {
            v = o[i] + c + 65535;
            c = Math.floor(v / 65536);
            o[i] = v - c * 65536;
        }
        o[0] += c - 1 + 37 * (c - 1);
    }
    function sel25519(p, q, b) {
        let t, c = ~(b - 1);
        for (let i = 0; i < 16; i++) {
            t = c & (p[i] ^ q[i]);
            p[i] ^= t;
            q[i] ^= t;
        }
    }
    function pack25519(o, n) {
        let i, j, b;
        let m = gf(), t = gf();
        for (i = 0; i < 16; i++)
            t[i] = n[i];
        car25519(t);
        car25519(t);
        car25519(t);
        for (j = 0; j < 2; j++) {
            m[0] = t[0] - 0xffed;
            for (i = 1; i < 15; i++) {
                m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
                m[i - 1] &= 0xffff;
            }
            m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
            b = (m[15] >> 16) & 1;
            m[14] &= 0xffff;
            sel25519(t, m, 1 - b);
        }
        for (i = 0; i < 16; i++) {
            o[2 * i] = t[i] & 0xff;
            o[2 * i + 1] = t[i] >> 8;
        }
    }
    function neq25519(a, b) {
        let c = new Uint8Array(32), d = new Uint8Array(32);
        pack25519(c, a);
        pack25519(d, b);
        return crypto_verify_32(c, 0, d, 0);
    }
    function par25519(a) {
        let d = new Uint8Array(32);
        pack25519(d, a);
        return d[0] & 1;
    }
    function unpack25519(o, n) {
        let i;
        for (i = 0; i < 16; i++)
            o[i] = n[2 * i] + (n[2 * i + 1] << 8);
        o[15] &= 0x7fff;
    }
    function A(o, a, b) {
        for (let i = 0; i < 16; i++)
            o[i] = a[i] + b[i];
    }
    function Z(o, a, b) {
        for (let i = 0; i < 16; i++)
            o[i] = a[i] - b[i];
    }
    function M(o, a, b) {
        let v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
        v = a[0];
        t0 += v * b0;
        t1 += v * b1;
        t2 += v * b2;
        t3 += v * b3;
        t4 += v * b4;
        t5 += v * b5;
        t6 += v * b6;
        t7 += v * b7;
        t8 += v * b8;
        t9 += v * b9;
        t10 += v * b10;
        t11 += v * b11;
        t12 += v * b12;
        t13 += v * b13;
        t14 += v * b14;
        t15 += v * b15;
        v = a[1];
        t1 += v * b0;
        t2 += v * b1;
        t3 += v * b2;
        t4 += v * b3;
        t5 += v * b4;
        t6 += v * b5;
        t7 += v * b6;
        t8 += v * b7;
        t9 += v * b8;
        t10 += v * b9;
        t11 += v * b10;
        t12 += v * b11;
        t13 += v * b12;
        t14 += v * b13;
        t15 += v * b14;
        t16 += v * b15;
        v = a[2];
        t2 += v * b0;
        t3 += v * b1;
        t4 += v * b2;
        t5 += v * b3;
        t6 += v * b4;
        t7 += v * b5;
        t8 += v * b6;
        t9 += v * b7;
        t10 += v * b8;
        t11 += v * b9;
        t12 += v * b10;
        t13 += v * b11;
        t14 += v * b12;
        t15 += v * b13;
        t16 += v * b14;
        t17 += v * b15;
        v = a[3];
        t3 += v * b0;
        t4 += v * b1;
        t5 += v * b2;
        t6 += v * b3;
        t7 += v * b4;
        t8 += v * b5;
        t9 += v * b6;
        t10 += v * b7;
        t11 += v * b8;
        t12 += v * b9;
        t13 += v * b10;
        t14 += v * b11;
        t15 += v * b12;
        t16 += v * b13;
        t17 += v * b14;
        t18 += v * b15;
        v = a[4];
        t4 += v * b0;
        t5 += v * b1;
        t6 += v * b2;
        t7 += v * b3;
        t8 += v * b4;
        t9 += v * b5;
        t10 += v * b6;
        t11 += v * b7;
        t12 += v * b8;
        t13 += v * b9;
        t14 += v * b10;
        t15 += v * b11;
        t16 += v * b12;
        t17 += v * b13;
        t18 += v * b14;
        t19 += v * b15;
        v = a[5];
        t5 += v * b0;
        t6 += v * b1;
        t7 += v * b2;
        t8 += v * b3;
        t9 += v * b4;
        t10 += v * b5;
        t11 += v * b6;
        t12 += v * b7;
        t13 += v * b8;
        t14 += v * b9;
        t15 += v * b10;
        t16 += v * b11;
        t17 += v * b12;
        t18 += v * b13;
        t19 += v * b14;
        t20 += v * b15;
        v = a[6];
        t6 += v * b0;
        t7 += v * b1;
        t8 += v * b2;
        t9 += v * b3;
        t10 += v * b4;
        t11 += v * b5;
        t12 += v * b6;
        t13 += v * b7;
        t14 += v * b8;
        t15 += v * b9;
        t16 += v * b10;
        t17 += v * b11;
        t18 += v * b12;
        t19 += v * b13;
        t20 += v * b14;
        t21 += v * b15;
        v = a[7];
        t7 += v * b0;
        t8 += v * b1;
        t9 += v * b2;
        t10 += v * b3;
        t11 += v * b4;
        t12 += v * b5;
        t13 += v * b6;
        t14 += v * b7;
        t15 += v * b8;
        t16 += v * b9;
        t17 += v * b10;
        t18 += v * b11;
        t19 += v * b12;
        t20 += v * b13;
        t21 += v * b14;
        t22 += v * b15;
        v = a[8];
        t8 += v * b0;
        t9 += v * b1;
        t10 += v * b2;
        t11 += v * b3;
        t12 += v * b4;
        t13 += v * b5;
        t14 += v * b6;
        t15 += v * b7;
        t16 += v * b8;
        t17 += v * b9;
        t18 += v * b10;
        t19 += v * b11;
        t20 += v * b12;
        t21 += v * b13;
        t22 += v * b14;
        t23 += v * b15;
        v = a[9];
        t9 += v * b0;
        t10 += v * b1;
        t11 += v * b2;
        t12 += v * b3;
        t13 += v * b4;
        t14 += v * b5;
        t15 += v * b6;
        t16 += v * b7;
        t17 += v * b8;
        t18 += v * b9;
        t19 += v * b10;
        t20 += v * b11;
        t21 += v * b12;
        t22 += v * b13;
        t23 += v * b14;
        t24 += v * b15;
        v = a[10];
        t10 += v * b0;
        t11 += v * b1;
        t12 += v * b2;
        t13 += v * b3;
        t14 += v * b4;
        t15 += v * b5;
        t16 += v * b6;
        t17 += v * b7;
        t18 += v * b8;
        t19 += v * b9;
        t20 += v * b10;
        t21 += v * b11;
        t22 += v * b12;
        t23 += v * b13;
        t24 += v * b14;
        t25 += v * b15;
        v = a[11];
        t11 += v * b0;
        t12 += v * b1;
        t13 += v * b2;
        t14 += v * b3;
        t15 += v * b4;
        t16 += v * b5;
        t17 += v * b6;
        t18 += v * b7;
        t19 += v * b8;
        t20 += v * b9;
        t21 += v * b10;
        t22 += v * b11;
        t23 += v * b12;
        t24 += v * b13;
        t25 += v * b14;
        t26 += v * b15;
        v = a[12];
        t12 += v * b0;
        t13 += v * b1;
        t14 += v * b2;
        t15 += v * b3;
        t16 += v * b4;
        t17 += v * b5;
        t18 += v * b6;
        t19 += v * b7;
        t20 += v * b8;
        t21 += v * b9;
        t22 += v * b10;
        t23 += v * b11;
        t24 += v * b12;
        t25 += v * b13;
        t26 += v * b14;
        t27 += v * b15;
        v = a[13];
        t13 += v * b0;
        t14 += v * b1;
        t15 += v * b2;
        t16 += v * b3;
        t17 += v * b4;
        t18 += v * b5;
        t19 += v * b6;
        t20 += v * b7;
        t21 += v * b8;
        t22 += v * b9;
        t23 += v * b10;
        t24 += v * b11;
        t25 += v * b12;
        t26 += v * b13;
        t27 += v * b14;
        t28 += v * b15;
        v = a[14];
        t14 += v * b0;
        t15 += v * b1;
        t16 += v * b2;
        t17 += v * b3;
        t18 += v * b4;
        t19 += v * b5;
        t20 += v * b6;
        t21 += v * b7;
        t22 += v * b8;
        t23 += v * b9;
        t24 += v * b10;
        t25 += v * b11;
        t26 += v * b12;
        t27 += v * b13;
        t28 += v * b14;
        t29 += v * b15;
        v = a[15];
        t15 += v * b0;
        t16 += v * b1;
        t17 += v * b2;
        t18 += v * b3;
        t19 += v * b4;
        t20 += v * b5;
        t21 += v * b6;
        t22 += v * b7;
        t23 += v * b8;
        t24 += v * b9;
        t25 += v * b10;
        t26 += v * b11;
        t27 += v * b12;
        t28 += v * b13;
        t29 += v * b14;
        t30 += v * b15;
        t0 += 38 * t16;
        t1 += 38 * t17;
        t2 += 38 * t18;
        t3 += 38 * t19;
        t4 += 38 * t20;
        t5 += 38 * t21;
        t6 += 38 * t22;
        t7 += 38 * t23;
        t8 += 38 * t24;
        t9 += 38 * t25;
        t10 += 38 * t26;
        t11 += 38 * t27;
        t12 += 38 * t28;
        t13 += 38 * t29;
        t14 += 38 * t30;
        // t15 left as is
        // first car
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        // second car
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        o[0] = t0;
        o[1] = t1;
        o[2] = t2;
        o[3] = t3;
        o[4] = t4;
        o[5] = t5;
        o[6] = t6;
        o[7] = t7;
        o[8] = t8;
        o[9] = t9;
        o[10] = t10;
        o[11] = t11;
        o[12] = t12;
        o[13] = t13;
        o[14] = t14;
        o[15] = t15;
    }
    function S(o, a) {
        M(o, a, a);
    }
    function inv25519(o, i) {
        let c = gf();
        let a;
        for (a = 0; a < 16; a++)
            c[a] = i[a];
        for (a = 253; a >= 0; a--) {
            S(c, c);
            if (a !== 2 && a !== 4)
                M(c, c, i);
        }
        for (a = 0; a < 16; a++)
            o[a] = c[a];
    }
    function pow2523(o, i) {
        let c = gf();
        let a;
        for (a = 0; a < 16; a++)
            c[a] = i[a];
        for (a = 250; a >= 0; a--) {
            S(c, c);
            if (a !== 1)
                M(c, c, i);
        }
        for (a = 0; a < 16; a++)
            o[a] = c[a];
    }
    function add(p, q) {
        let a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
        Z(a, p[1], p[0]);
        Z(t, q[1], q[0]);
        M(a, a, t);
        A(b, p[0], p[1]);
        A(t, q[0], q[1]);
        M(b, b, t);
        M(c, p[3], q[3]);
        M(c, c, D2);
        M(d, p[2], q[2]);
        A(d, d, d);
        Z(e, b, a);
        Z(f, d, c);
        A(g, d, c);
        A(h, b, a);
        M(p[0], e, f);
        M(p[1], h, g);
        M(p[2], g, f);
        M(p[3], e, h);
    }
    function cswap(p, q, b) {
        let i;
        for (i = 0; i < 4; i++) {
            sel25519(p[i], q[i], b);
        }
    }
    function pack(r, p) {
        let tx = gf(), ty = gf(), zi = gf();
        inv25519(zi, p[2]);
        M(tx, p[0], zi);
        M(ty, p[1], zi);
        pack25519(r, ty);
        r[31] ^= par25519(tx) << 7;
    }
    function scalarmult(p, q, s) {
        let b, i;
        set25519(p[0], gf0);
        set25519(p[1], gf1);
        set25519(p[2], gf1);
        set25519(p[3], gf0);
        for (i = 255; i >= 0; --i) {
            b = (s[(i / 8) | 0] >> (i & 7)) & 1;
            cswap(p, q, b);
            add(q, p);
            add(p, p);
            cswap(p, q, b);
        }
    }
    function scalarbase(p, s) {
        let q = [gf(), gf(), gf(), gf()];
        set25519(q[0], X);
        set25519(q[1], Y);
        set25519(q[2], gf1);
        M(q[3], X, Y);
        scalarmult(p, q, s);
    }
    let L = new Float64Array([
        0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0x10,
    ]);
    function modL(r, x) {
        let carry, i, j, k;
        for (i = 63; i >= 32; --i) {
            carry = 0;
            for (j = i - 32, k = i - 12; j < k; ++j) {
                x[j] += carry - 16 * x[i] * L[j - (i - 32)];
                carry = Math.floor((x[j] + 128) / 256);
                x[j] -= carry * 256;
            }
            x[j] += carry;
            x[i] = 0;
        }
        carry = 0;
        for (j = 0; j < 32; j++) {
            x[j] += carry - (x[31] >> 4) * L[j];
            carry = x[j] >> 8;
            x[j] &= 255;
        }
        for (j = 0; j < 32; j++)
            x[j] -= carry * L[j];
        for (i = 0; i < 32; i++) {
            x[i + 1] += x[i] >> 8;
            r[i] = x[i] & 255;
        }
    }
    function unpackneg(r, p) {
        let t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
        set25519(r[2], gf1);
        unpack25519(r[1], p);
        S(num, r[1]);
        M(den, num, D);
        Z(num, num, r[2]);
        A(den, r[2], den);
        S(den2, den);
        S(den4, den2);
        M(den6, den4, den2);
        M(t, den6, num);
        M(t, t, den);
        pow2523(t, t);
        M(t, t, num);
        M(t, t, den);
        M(t, t, den);
        M(r[0], t, den);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num))
            M(r[0], r[0], I);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num))
            return -1;
        if (par25519(r[0]) === p[31] >> 7)
            Z(r[0], gf0, r[0]);
        M(r[3], r[0], r[1]);
        return 0;
    }
    function reduce(r) {
        let x = new Float64Array(64), i;
        for (i = 0; i < 64; i++)
            x[i] = r[i];
        for (i = 0; i < 64; i++)
            r[i] = 0;
        modL(r, x);
    }
    function crypto_sign_keypair(pk, sk) {
        let d = new Uint8Array(64);
        let p = [gf(), gf(), gf(), gf()];
        let i;
        sha512internal(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        scalarbase(p, d);
        pack(pk, p);
        for (i = 0; i < 32; i++)
            sk[i + 32] = pk[i];
        return 0;
    }
    function crypto_sign_open(m, sm, n, pk) {
        let i;
        let t = new Uint8Array(32), h = new Uint8Array(64);
        let p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
        if (n < 64)
            return -1;
        if (unpackneg(q, pk))
            return -1;
        for (i = 0; i < n; i++)
            m[i] = sm[i];
        for (i = 0; i < 32; i++)
            m[i + 32] = pk[i];
        sha512internal(h, m, n);
        reduce(h);
        scalarmult(p, q, h);
        scalarbase(q, sm.subarray(32));
        add(p, q);
        pack(t, p);
        n -= 64;
        if (crypto_verify_32(sm, 0, t, 0)) {
            for (i = 0; i < n; i++)
                m[i] = 0;
            return -1;
        }
        for (i = 0; i < n; i++)
            m[i] = sm[i + 64];
        return n;
    }
    // Note: difference from C - smlen returned, not passed as argument.
    function crypto_sign(sm, m, n, sk) {
        let d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
        let i, j, x = new Float64Array(64);
        let p = [gf(), gf(), gf(), gf()];
        sha512internal(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        let smlen = n + 64;
        for (i = 0; i < n; i++)
            sm[64 + i] = m[i];
        for (i = 0; i < 32; i++)
            sm[32 + i] = d[32 + i];
        sha512internal(r, sm.subarray(32), n + 32);
        reduce(r);
        scalarbase(p, r);
        pack(sm, p);
        for (i = 32; i < 64; i++)
            sm[i] = sk[i];
        sha512internal(h, sm, n + 64);
        reduce(h);
        for (i = 0; i < 64; i++)
            x[i] = 0;
        for (i = 0; i < 32; i++)
            x[i] = r[i];
        for (i = 0; i < 32; i++) {
            for (j = 0; j < 32; j++) {
                x[i + j] += h[i] * d[j];
            }
        }
        modL(sm.subarray(32), x);
        return smlen;
    }
    // Zero types to make error returns more convenient.
    const nu8$2 = new Uint8Array(0);
    const nkp$1 = { publicKey: nu8$2, secretKey: nu8$2 };
    // checkAllUint8Array is a helper function to perform input checking on the
    // crypto API functions. Because the kernel is often hot-loading untrusted
    // code, we cannot depend on typescript to provide type safety.
    function checkAllUint8Array(...args) {
        for (let i = 0; i < args.length; i++) {
            if (!(args[i] instanceof Uint8Array)) {
                return "unexpected type, use Uint8Array";
            }
        }
        return null;
    }
    // ed25519KeypairFromEntropy is a function that generates an ed25519 keypair
    // from the provided entropy.
    function ed25519KeypairFromEntropy(seed) {
        // Input checking.
        let errU8 = checkAllUint8Array(seed);
        if (errU8 !== null) {
            return [nkp$1, addContextToErr(errU8, "seed is invalid")];
        }
        if (seed.length !== crypto_sign_SEEDBYTES) {
            return [nkp$1, "bad seed size"];
        }
        // Build the keypair.
        let pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        let sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        for (let i = 0; i < 32; i++) {
            sk[i] = seed[i];
        }
        crypto_sign_keypair(pk, sk);
        return [
            {
                publicKey: pk,
                secretKey: sk,
            },
            null,
        ];
    }
    // ed25519Sign will produce an ed25519 signature of a given input.
    function ed25519Sign(msg, secretKey) {
        // Input checking.
        let errU8 = checkAllUint8Array(msg, secretKey);
        if (errU8 !== null) {
            return [nu8$2, addContextToErr(errU8, "inputs are invalid")];
        }
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES) {
            return [nu8$2, "bad secret key size"];
        }
        // Build the signature.
        let signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
        crypto_sign(signedMsg, msg, msg.length, secretKey);
        let sig = new Uint8Array(crypto_sign_BYTES);
        for (let i = 0; i < sig.length; i++) {
            sig[i] = signedMsg[i];
        }
        return [sig, null];
    }
    // ed25519Verify will check whether a signature is valid against the given
    // publicKey and message.
    function ed25519Verify(msg, sig, publicKey) {
        let errU8 = checkAllUint8Array(msg, sig, publicKey);
        if (errU8 !== null) {
            return false;
        }
        if (sig.length !== crypto_sign_BYTES) {
            return false;
        }
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES) {
            return false;
        }
        let sm = new Uint8Array(crypto_sign_BYTES + msg.length);
        let m = new Uint8Array(crypto_sign_BYTES + msg.length);
        let i;
        for (i = 0; i < crypto_sign_BYTES; i++) {
            sm[i] = sig[i];
        }
        for (i = 0; i < msg.length; i++) {
            sm[i + crypto_sign_BYTES] = msg[i];
        }
        return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
    }

    // Define the number of entropy words used when generating the seed.
    const SEED_ENTROPY_WORDS = 13;
    const SEED_BYTES = 16;
    // deriveChildSeed is a helper function to derive a child seed from a parent
    // seed using a string as the path.
    function deriveChildSeed(parentSeed, derivationTag) {
        let tagU8 = new TextEncoder().encode(" - " + derivationTag);
        let preimage = new Uint8Array(parentSeed.length + tagU8.length);
        preimage.set(parentSeed, 0);
        preimage.set(tagU8, parentSeed.length);
        let hash = sha512(preimage);
        return hash.slice(0, SEED_BYTES);
    }
    // deriveMyskyRoot is a helper function to derive the root mysky seed of the
    // provided user seed.
    //
    // NOTE: This is code is to provide legacy compatibility with the MySky
    // ecosystem. Compatibility cannot be broken here.
    function deriveMyskyRootKeypair(userSeed) {
        let saltBytes = new TextEncoder().encode("root discoverable key");
        let saltHash = sha512(saltBytes);
        let userSeedHash = sha512(userSeed);
        let mergedHash = sha512(new Uint8Array([...saltHash, ...userSeedHash]));
        let keyEntropy = mergedHash.slice(0, 32);
        // Error is ignored because it should not be possible with the provided
        // inputs.
        let [keypair] = ed25519KeypairFromEntropy(keyEntropy);
        return keypair;
    }
    // generateSeedPhraseDeterministic will generate and verify a seed phrase for
    // the user.
    function generateSeedPhraseDeterministic(password) {
        let u8 = new TextEncoder().encode(password);
        let buf = sha512(u8);
        let randNums = Uint16Array.from(buf);
        // Generate the seed phrase from the randNums.
        let seedWords = [];
        for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
            let wordIndex = randNums[i] % dictionary.length;
            if (i == SEED_ENTROPY_WORDS - 1) {
                wordIndex = randNums[i] % (dictionary.length / 4);
            }
            seedWords.push(dictionary[wordIndex]);
        }
        // Convert the seedWords to a seed.
        let [seed, err1] = seedWordsToSeed(seedWords);
        if (err1 !== null) {
            return ["", err1];
        }
        // Compute the checksum.
        let [checksumOne, checksumTwo, err2] = seedToChecksumWords(seed);
        if (err2 !== null) {
            return ["", err2];
        }
        // Assemble the final seed phrase and set the text field.
        let allWords = [...seedWords, checksumOne, checksumTwo];
        let seedPhrase = allWords.join(" ");
        return [seedPhrase, null];
    }
    // seedToChecksumWords will compute the two checksum words for the provided
    // seed. The two return values are the two checksum words.
    function seedToChecksumWords(seed) {
        // Input validation.
        if (seed.length !== SEED_BYTES) {
            return ["", "", `seed has the wrong length: ${seed.length}`];
        }
        // Get the hash.
        let h = sha512(seed);
        // Turn the hash into two words.
        let word1 = h[0] << 8;
        word1 += h[1];
        word1 >>= 6;
        let word2 = h[1] << 10;
        word2 &= 0xffff;
        word2 += h[2] << 2;
        word2 >>= 6;
        return [dictionary[word1], dictionary[word2], null];
    }
    // validSeedPhrase checks whether the provided seed phrase is valid, returning
    // an error if not. If the seed phrase is valid, the full seed will be returned
    // as a Uint8Array.
    function validSeedPhrase(seedPhrase) {
        // Create a helper function to make the below code more readable.
        let prefix = function (s) {
            return s.slice(0, DICTIONARY_UNIQUE_PREFIX);
        };
        // Pull the seed into its respective parts.
        let seedWordsAndChecksum = seedPhrase.split(" ");
        let seedWords = seedWordsAndChecksum.slice(0, SEED_ENTROPY_WORDS);
        let checksumOne = seedWordsAndChecksum[SEED_ENTROPY_WORDS];
        let checksumTwo = seedWordsAndChecksum[SEED_ENTROPY_WORDS + 1];
        // Convert the seedWords to a seed.
        let [seed, err1] = seedWordsToSeed(seedWords);
        if (err1 !== null) {
            return [new Uint8Array(0), addContextToErr(err1, "unable to parse seed phrase")];
        }
        let [checksumOneVerify, checksumTwoVerify, err2] = seedToChecksumWords(seed);
        if (err2 !== null) {
            return [new Uint8Array(0), addContextToErr(err2, "could not compute checksum words")];
        }
        if (prefix(checksumOne) !== prefix(checksumOneVerify)) {
            return [new Uint8Array(0), "first checksum word is invalid"];
        }
        if (prefix(checksumTwo) !== prefix(checksumTwoVerify)) {
            return [new Uint8Array(0), "second checksum word is invalid"];
        }
        return [seed, null];
    }
    // seedWordsToSeed will convert a provided seed phrase to to a Uint8Array that
    // represents the cryptographic seed in bytes.
    function seedWordsToSeed(seedWords) {
        // Input checking.
        if (seedWords.length !== SEED_ENTROPY_WORDS) {
            return [new Uint8Array(0), `Seed words should have length ${SEED_ENTROPY_WORDS} but has length ${seedWords.length}`];
        }
        // We are getting 16 bytes of entropy.
        let bytes = new Uint8Array(SEED_BYTES);
        let curByte = 0;
        let curBit = 0;
        for (let i = 0; i < SEED_ENTROPY_WORDS; i++) {
            // Determine which number corresponds to the next word.
            let word = -1;
            for (let j = 0; j < dictionary.length; j++) {
                if (seedWords[i].slice(0, DICTIONARY_UNIQUE_PREFIX) === dictionary[j].slice(0, DICTIONARY_UNIQUE_PREFIX)) {
                    word = j;
                    break;
                }
            }
            if (word === -1) {
                return [new Uint8Array(0), `word '${seedWords[i]}' at index ${i} not found in dictionary`];
            }
            let wordBits = 10;
            if (i === SEED_ENTROPY_WORDS - 1) {
                wordBits = 8;
            }
            // Iterate over the bits of the 10- or 8-bit word.
            for (let j = 0; j < wordBits; j++) {
                let bitSet = (word & (1 << (wordBits - j - 1))) > 0;
                if (bitSet) {
                    bytes[curByte] |= 1 << (8 - curBit - 1);
                }
                curBit += 1;
                if (curBit >= 8) {
                    // Current byte has 8 bits, go to the next byte.
                    curByte += 1;
                    curBit = 0;
                }
            }
        }
        return [bytes, null];
    }
    // seedPhraseToSeed will take a seed phrase and return the corresponding seed,
    // providing an error if the seed phrase is invalid. This is an alias of
    // validSeedPhrase.
    function seedPhraseToSeed(seedPhrase) {
        return validSeedPhrase(seedPhrase);
    }

    // Define some empty values to make our return statements more concise.
    const nu8$1 = new Uint8Array(0);
    const nkp = { publicKey: nu8$1, secretKey: nu8$1 };
    // computeRegistrySignature will take a secret key and the required fields of a
    // registry entry and use them to compute a registry signature, returning both
    // the signature and the encoded data for the registry entry.
    function computeRegistrySignature(secretKey, dataKey, data, revision) {
        // Check that the data is the right size.
        if (data.length > 86) {
            return [nu8$1, "registry data must be at most 86 bytes"];
        }
        // Build the encoded data.
        let [encodedData, errEPB] = encodePrefixedBytes(data);
        if (errEPB !== null) {
            return [nu8$1, addContextToErr(errEPB, "unable to encode provided registry data")];
        }
        let [encodedRevision, errEU64] = encodeU64(revision);
        if (errEU64 !== null) {
            return [nu8$1, addContextToErr(errEU64, "unable to encode the revision number")];
        }
        // Build the signing data.
        let dataToSign = new Uint8Array(32 + 8 + data.length + 8);
        dataToSign.set(dataKey, 0);
        dataToSign.set(encodedData, 32);
        dataToSign.set(encodedRevision, 32 + 8 + data.length);
        let sigHash = blake2b(dataToSign);
        // Sign the data.
        let [sig, errS] = ed25519Sign(sigHash, secretKey);
        if (errS !== null) {
            return [nu8$1, addContextToErr(errS, "unable to sign registry entry")];
        }
        return [sig, null];
    }
    // deriveRegistryEntryID derives a registry entry ID from a provided pubkey and
    // datakey.
    function deriveRegistryEntryID(pubkey, datakey) {
        // Check the lengths of the inputs.
        if (pubkey.length !== 32) {
            return [nu8$1, "pubkey is invalid, length is wrong"];
        }
        if (datakey.length !== 32) {
            return [nu8$1, "datakey is not a valid hash, length is wrong"];
        }
        // Establish the encoding. First 16 bytes is a specifier, second 8
        // bytes declares the length of the pubkey, the next 32 bytes is the
        // pubkey and the final 32 bytes is the datakey. This encoding is
        // determined by the Sia protocol.
        let encoding = new Uint8Array(16 + 8 + 32 + 32);
        // Set the specifier.
        encoding[0] = "e".charCodeAt(0);
        encoding[1] = "d".charCodeAt(0);
        encoding[2] = "2".charCodeAt(0);
        encoding[3] = "5".charCodeAt(0);
        encoding[4] = "5".charCodeAt(0);
        encoding[5] = "1".charCodeAt(0);
        encoding[6] = "9".charCodeAt(0);
        // Set the pubkey.
        let [encodedLen, errU64] = encodeU64(32n);
        if (errU64 !== null) {
            return [nu8$1, addContextToErr(errU64, "unable to encode pubkey length")];
        }
        encoding.set(encodedLen, 16);
        encoding.set(pubkey, 16 + 8);
        encoding.set(datakey, 16 + 8 + 32);
        // Get the final ID by hashing the encoded data.
        let id = blake2b(encoding);
        return [id, null];
    }
    // entryIDToSkylink converts a registry entry id to a resolver skylink.
    function entryIDToSkylink(entryID) {
        let v2Skylink = new Uint8Array(34);
        v2Skylink.set(entryID, 2);
        v2Skylink[0] = 1;
        return bufToB64(v2Skylink);
    }
    // resolverLink will take a registryEntryID and return the corresponding
    // resolver link.
    function resolverLink(entryID) {
        if (entryID.length !== 32) {
            return ["", "provided entry ID has the wrong length"];
        }
        let v2Skylink = new Uint8Array(34);
        v2Skylink.set(entryID, 2);
        v2Skylink[0] = 1;
        let skylink = bufToB64(v2Skylink);
        return [skylink, null];
    }
    // registryEntryKeys will use the user's seed to derive a keypair and a datakey
    // using the provided seed and tags. The keypairTag is a tag which salts the
    // keypair. If you change the input keypairTag, the resulting public key and
    // secret key will be different. The dataKey tag is the salt for the datakey,
    // if you provide a different datakey tag, the resulting datakey will be
    // different.
    //
    // Note that changing the keypair tag will also change the resulting datakey.
    // The purpose of the keypair tag is to obfuscate the fact that two registry
    // entries are owned by the same identity. This obfuscation would break if two
    // different public keys were using the same datakey. Changing the datakey does
    // not change the public key.
    function taggedRegistryEntryKeys(seed, keypairTagStr, datakeyTagStr) {
        if (seed.length !== SEED_BYTES) {
            return [nkp, nu8$1, "seed has the wrong length"];
        }
        if (keypairTagStr.length > 255) {
            return [nkp, nu8$1, "keypairTag must be less than 256 characters"];
        }
        // If no datakey tag was provided, use the empty string.
        if (datakeyTagStr === undefined) {
            datakeyTagStr = "";
        }
        // Generate a unique set of entropy using the seed and keypairTag.
        let keypairTag = new TextEncoder().encode(keypairTagStr);
        let entropyInput = new Uint8Array(keypairTag.length + seed.length);
        entropyInput.set(seed, 0);
        entropyInput.set(keypairTag, seed.length);
        let keypairEntropy = sha512(entropyInput);
        // Use the seed to dervie the datakey for the registry entry. We use
        // a different tag to ensure that the datakey is independently random, such
        // that the registry entry looks like it could be any other registry entry.
        //
        // We don't want it to be possible for two different combinations of
        // tags to end up with the same datakey. If you don't use a length
        // prefix, for example the tags ["123", "456"] and ["12", "3456"] would
        // have the same datakey. You have to add the length prefix to the
        // first tag otherwise you can get pairs like ["6", "4321"] and ["65",
        // "321"] which could end up with the same datakey.
        let datakeyTag = new TextEncoder().encode(datakeyTagStr);
        let datakeyInput = new Uint8Array(seed.length + 1 + keypairTag.length + datakeyTag.length);
        let keypairLen = new Uint8Array(1);
        keypairLen[0] = keypairTag.length;
        datakeyInput.set(seed);
        datakeyInput.set(keypairLen, seed.length);
        datakeyInput.set(keypairTag, seed.length + 1);
        datakeyInput.set(datakeyTag, seed.length + 1 + keypairTag.length);
        let datakeyEntropy = sha512(datakeyInput);
        // Create the private key for the registry entry.
        let [keypair, errKPFE] = ed25519KeypairFromEntropy(keypairEntropy.slice(0, 32));
        if (errKPFE !== null) {
            return [nkp, nu8$1, addContextToErr(errKPFE, "unable to derive keypair")];
        }
        let datakey = datakeyEntropy.slice(0, 32);
        return [keypair, datakey, null];
    }
    // verifyRegistrySignature will verify the signature of a registry entry.
    function verifyRegistrySignature(pubkey, datakey, data, revision, sig) {
        let [encodedData, errEPB] = encodePrefixedBytes(data);
        if (errEPB !== null) {
            return false;
        }
        let [encodedRevision, errU64] = encodeU64(revision);
        if (errU64 !== null) {
            return false;
        }
        let dataToVerify = new Uint8Array(32 + 8 + data.length + 8);
        dataToVerify.set(datakey, 0);
        dataToVerify.set(encodedData, 32);
        dataToVerify.set(encodedRevision, 32 + 8 + data.length);
        let sigHash = blake2b(dataToVerify);
        return ed25519Verify(sigHash, sig, pubkey);
    }

    // validateSkyfilePath checks whether the provided path is a valid path for a
    // file in a skylink.
    function validateSkyfilePath(path) {
        if (path === "") {
            return "path cannot be blank";
        }
        if (path === "..") {
            return "path cannot be ..";
        }
        if (path === ".") {
            return "path cannot be .";
        }
        if (path.startsWith("/")) {
            return "metdata.Filename cannot start with /";
        }
        if (path.startsWith("../")) {
            return "metdata.Filename cannot start with ../";
        }
        if (path.startsWith("./")) {
            return "metdata.Filename cannot start with ./";
        }
        let pathElems = path.split("/");
        for (let i = 0; i < pathElems.length; i++) {
            if (pathElems[i] === ".") {
                return "path cannot have a . element";
            }
            if (pathElems[i] === "..") {
                return "path cannot have a .. element";
            }
            if (pathElems[i] === "") {
                return "path cannot have an empty element, cannot contain //";
            }
        }
        return null;
    }
    // validateSkyfileMetadata checks whether the provided metadata is valid
    // metadata for a skyfile.
    function validateSkyfileMetadata(metadata) {
        // Check that the filename is valid.
        if (!("Filename" in metadata)) {
            return "metadata.Filename does not exist";
        }
        if (typeof metadata.Filename !== "string") {
            return "metadata.Filename is not a string";
        }
        let errVSP = validateSkyfilePath(metadata.Filename);
        if (errVSP !== null) {
            return addContextToErr(errVSP, "metadata.Filename does not have a valid path");
        }
        // Check that there are no subfiles.
        if ("Subfiles" in metadata) {
            // TODO: Fill this out using code from
            // skymodules.ValidateSkyfileMetadata to support subfiles.
            return "cannot upload files that have subfiles";
        }
        // Check that the default path rules are being respected.
        if ("DisableDefaultPath" in metadata && "DefaultPath" in metadata) {
            return "cannot set both a DefaultPath and also DisableDefaultPath";
        }
        if ("DefaultPath" in metadata) {
            // TODO: Fill this out with code from
            // skymodules.validateDefaultPath to support subfiles and
            // default paths.
            return "cannot set a default path if there are no subfiles";
        }
        if ("TryFiles" in metadata) {
            if (!metadata.TryFiles.IsArray()) {
                return "metadata.TryFiles must be an array";
            }
            if (metadata.TryFiles.length === 0) {
                return "metadata.TryFiles should not be empty";
            }
            if ("DefaultPath" in metadata) {
                return "metadata.TryFiles cannot be used alongside DefaultPath";
            }
            if ("DisableDefaultPath" in metadata) {
                return "metadata.TryFiles cannot be used alongside DisableDefaultPath";
            }
            // TODO: finish the TryFiles checking using skymodules.ValidateTryFiles
            return "TryFiles is not supported at this time";
        }
        if ("ErrorPages" in metadata) {
            // TODO: finish using skymodules.ValidateErrorPages
            return "ErrorPages is not supported at this time";
        }
        return null;
    }
    // validSkylink returns true if the provided Uint8Array is a valid skylink.
    // This is an alias for 'parseSkylinkBitfield', as both perform the same
    // validation.
    function validSkylink(skylink) {
        if (skylink.length !== 34) {
            return false;
        }
        let [, , , errPSB] = parseSkylinkBitfield(skylink);
        if (errPSB !== null) {
            return false;
        }
        return true;
    }

    // Helper consts to make returning empty values alongside errors more
    // convenient.
    const nu8 = new Uint8Array(0);
    // verifyResolverLinkProof will check that the given resolver proof matches the
    // provided skylink. If the proof is correct and the signature matches, the
    // data will be returned. The returned link will be a verified skylink.
    function verifyResolverLinkProof(skylink, proof) {
        // Verify the presented skylink is formatted correctly.
        if (skylink.length !== 34) {
            return [nu8, "skylink is malformed, expecting 34 bytes"];
        }
        // Verify that all of the required fields are present in the proof.
        if (!("data" in proof) ||
            !("datakey" in proof) ||
            !("publickey" in proof) ||
            !("signature" in proof) ||
            !("type" in proof) ||
            !("revision" in proof)) {
            return [nu8, "proof is malformed, fields are missing"];
        }
        if (!("algorithm" in proof.publickey) || !("key" in proof.publickey)) {
            return [nu8, "pubkey is malformed"];
        }
        // Verify the typing of the fields.
        if (typeof proof.data !== "string") {
            return [nu8, "data is malformed"];
        }
        let dataStr = proof.data;
        if (typeof proof.datakey !== "string") {
            return [nu8, "datakey is malformed"];
        }
        let datakeyStr = proof.datakey;
        if (proof.publickey.algorithm !== "ed25519") {
            return [nu8, "pubkey has unrecognized algorithm"];
        }
        if (typeof proof.publickey.key !== "string") {
            return [nu8, "pubkey key is malformed"];
        }
        let pubkeyStr = proof.publickey.key;
        if (typeof proof.signature !== "string") {
            return [nu8, "signature is malformed"];
        }
        if (proof.type !== 1n) {
            return [nu8, "registry entry has unrecognized type: " + tryStringify(proof.type)];
        }
        let sigStr = proof.signature;
        if (typeof proof.revision !== "bigint") {
            return [nu8, "revision is malformed"];
        }
        let revision = proof.revision;
        // Decode all of the fields. They are presented in varied types and
        // encodings.
        let [data, errD] = hexToBuf(dataStr);
        if (errD !== null) {
            return [nu8, addContextToErr(errD, "data is invalid hex")];
        }
        let [datakey, errDK] = hexToBuf(datakeyStr);
        if (errDK !== null) {
            return [nu8, addContextToErr(errDK, "datakey is invalid hex")];
        }
        let [pubkey, errPK] = b64ToBuf(pubkeyStr);
        if (errPK !== null) {
            return [nu8, addContextToErr(errPK, "pubkey key is invalid base64")];
        }
        let [sig, errS] = hexToBuf(sigStr);
        if (errS !== null) {
            return [nu8, addContextToErr(errS, "signature is invalid hex")];
        }
        // Verify that the data is a skylink - this is a proof for a resolver,
        // which means the proof is pointing to a specific skylink.
        if (!validSkylink(data)) {
            return [nu8, "this skylink does not resolve to another skylink"];
        }
        // Verify that the combination of the datakey and the public key match
        // the skylink.
        let [entryID, errREID] = deriveRegistryEntryID(pubkey, datakey);
        if (errREID !== null) {
            return [nu8, addContextToErr(errREID, "proof pubkey is malformed")];
        }
        let linkID = skylink.slice(2, 34);
        for (let i = 0; i < entryID.length; i++) {
            if (entryID[i] !== linkID[i]) {
                return [nu8, "proof pubkey and datakey do not match the skylink root"];
            }
        }
        // Verify the signature.
        if (!verifyRegistrySignature(pubkey, datakey, data, revision, sig)) {
            return [nu8, "signature does not match"];
        }
        return [data, null];
    }
    // verifyResolverLinkProofs will verify a set of resolver link proofs provided
    // by a portal after performing a resolver link lookup. Each proof corresponds
    // to one level of resolution. The final value returned will be the V1 skylink
    // at the end of the chain.
    //
    // This function treats the proof as untrusted data and will verify all of the
    // fields that are provided.
    function verifyResolverLinkProofs(skylink, proof) {
        // Check that the proof is an array.
        if (!Array.isArray(proof)) {
            return [nu8, "provided proof is not an array: " + tryStringify(proof)];
        }
        if (proof.length === 0) {
            return [nu8, "proof array is empty"];
        }
        // Check each proof in the chain, returning the final skylink.
        for (let i = 0; i < proof.length; i++) {
            let errVRLP;
            [skylink, errVRLP] = verifyResolverLinkProof(skylink, proof[i]);
            if (errVRLP !== null) {
                return [nu8, addContextToErr(errVRLP, "one of the resolution proofs is invalid")];
            }
        }
        // Though it says 'skylink', the verifier is actually just returning
        // whatever the registry data is. We need to check that the final value
        // is a V1 skylink.
        if (skylink.length !== 34) {
            return [nu8, "final value returned by the resolver link is not a skylink"];
        }
        let [version, , , errPSB] = parseSkylinkBitfield(skylink);
        if (errPSB !== null) {
            return [nu8, addContextToErr(errPSB, "final value returned by resolver link is not a valid skylink")];
        }
        if (version !== 1n) {
            return [nu8, "final value returned by resolver link is not a v1 skylink"];
        }
        return [skylink, null];
    }

    // Establish the function that verifies the result is correct.
    //
    // The fileDataPtr input is an empty object that verifyDownloadResponse will
    // fill with the fileData. It basically allows the verify function to
    // communicate back to the caller. Note that the verify function might be
    // called multiple times in a row if early portals fail to retrieve the data,
    // but the verify function doesn't write to the fileDataPtr until it knows that
    // the download is final.
    function verifyDownloadResponse(response, u8Link, fileDataPtr) {
        return new Promise((resolve) => {
            // Currently the only valid successful response for a download is a
            // 200. Anything else is unexpected and counts as an error.
            if (response.status !== 200) {
                resolve("unrecognized response status " + tryStringify(response.status) + ", expecting 200");
                return;
            }
            // Break the input link into its components.
            let [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
            if (errBF !== null) {
                resolve(addContextToErr(errBF, "skylink bitfield could not be parsed"));
                return;
            }
            // If this is a resolver skylink, we need to verify the resolver
            // proofs. This conditional will update the value of 'u8Link' to be the
            // value of the fully resolved link.
            if (version === 2n) {
                // Verify the resolver proofs and update the link to the correct
                // link.
                let proofJSON = response.headers.get("skynet-proof");
                if (proofJSON === null || proofJSON === undefined) {
                    resolve("response did not include resolver proofs");
                    return;
                }
                let [proof, errPJ] = parseJSON(proofJSON);
                if (errPJ !== null) {
                    resolve(addContextToErr(errPJ, "unable to parse resolver link proofs"));
                    return;
                }
                // We need to update the u8Link in-place so that the rest of the
                // function doesn't need special handling.
                let errVRLP;
                [u8Link, errVRLP] = verifyResolverLinkProofs(u8Link, proof);
                if (errVRLP !== null) {
                    resolve(addContextToErr(errVRLP, "unable to verify resolver link proofs"));
                    return;
                }
                // We also need to update the parsed bitfield, because the link has
                // changed.
                [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
                if (errBF !== null) {
                    resolve(addContextToErr(errBF, "fully resolved link has invalid bitfield"));
                    return;
                }
                if (version !== 1n) {
                    resolve("fully resolved link does not have version 1");
                    return;
                }
            }
            response
                .arrayBuffer()
                .then((buf) => {
                let [fileData, portalAtFault, errVD] = verifyDownload(u8Link.slice(2, 34), offset, fetchSize, buf);
                if (errVD !== null && portalAtFault) {
                    resolve("received invalid download from portal");
                    return;
                }
                if (errVD !== null) {
                    fileDataPtr.fileData = new Uint8Array(0);
                    fileDataPtr.err = addContextToErr(errVD, "file is corrupt");
                }
                else {
                    fileDataPtr.fileData = fileData;
                    fileDataPtr.err = null;
                }
                // If the portal is not at fault, we tell progressiveFetch that
                // the download was a success. The caller will have to check
                // the fileDataPtr
                resolve(null);
            })
                .catch((err) => {
                resolve(addContextToErr(err, "unable to read response body"));
            });
        });
    }

    // progressiveFetchHelper is the full progressiveFetch function, split out into
    // a helper because the inptus/api is more complicated but only necessary for
    // internal use.
    function progressiveFetchHelper(pfm, resolve, verifyFunction) {
        // If we run out of portals, return an error.
        if (pfm.remainingPortals.length === 0) {
            let newLog = "query failed because all portals have been tried";
            pfm.logs.push(newLog);
            resolve({
                success: false,
                portal: null,
                response: null,
                portalsFailed: pfm.portalsFailed,
                responsesFailed: pfm.responsesFailed,
                messagesFailed: pfm.messagesFailed,
                remainingPortals: null,
                logs: pfm.logs,
            });
            return;
        }
        // Grab the portal and query.
        let portal = pfm.remainingPortals.shift();
        let query = portal + pfm.endpoint;
        // Create a helper function for trying the next portal.
        let nextPortal = function (response, log) {
            if (response !== null) {
                response
                    .clone()
                    .text()
                    .then((t) => {
                    pfm.logs.push(log);
                    pfm.portalsFailed.push(portal);
                    pfm.responsesFailed.push(response);
                    pfm.messagesFailed.push(t);
                    progressiveFetchHelper(pfm, resolve, verifyFunction);
                });
            }
            else {
                pfm.logs.push(log);
                pfm.portalsFailed.push(portal);
                pfm.responsesFailed.push(response);
                pfm.messagesFailed.push("");
                progressiveFetchHelper(pfm, resolve, verifyFunction);
            }
        };
        // Try sending the query to the portal.
        fetch(query, pfm.fetchOpts)
            .then((response) => {
            // Check for a 5XX error.
            if (!("status" in response) || typeof response.status !== "number") {
                nextPortal(response, "portal has returned invalid response\n" + tryStringify({ portal, query }));
                return;
            }
            if (response.status < 200 || response.status >= 300) {
                nextPortal(response, "portal has returned error status\n" + tryStringify({ portal, query }));
                return;
            }
            // Check the result against the verify function.
            verifyFunction(response.clone()).then((errVF) => {
                if (errVF !== null) {
                    nextPortal(response, "verify function has returned an error from portal " + portal + " - " + errVF);
                    return;
                }
                // Success! Return the response.
                resolve({
                    success: true,
                    portal,
                    response,
                    portalsFailed: pfm.portalsFailed,
                    responsesFailed: pfm.responsesFailed,
                    remainingPortals: pfm.remainingPortals,
                    messagesFailed: pfm.messagesFailed,
                    logs: pfm.logs,
                });
            });
        })
            .catch((err) => {
            // This portal failed, try again with the next portal.
            nextPortal(null, "fetch returned an error\n" + tryStringify(err) + tryStringify(pfm.fetchOpts));
            return;
        });
    }
    // progressiveFetch will query multiple portals until one returns with a
    // non-error response. In the event of a 4XX response, progressiveFetch will
    // keep querying additional portals to try and find a working 2XX response. In
    // the event that no working 2XX response is found, the first 4XX response will
    // be returned.
    //
    // If progressiveFetch returns a 2XX response, it merely means that the portal
    // returned a 2XX response. progressiveFetch cannot be confident that the
    // portal has returned a correct/honest message, the verification has to be
    // handled by the caller. The response (progressiveFetchResult) contains the
    // list of portals that progressiveFetch hasn't tried yet. In the event that
    // the 2XX response is not correct, the progressiveFetchResult contains the
    // list of failover portals that have not been used yet, allowing
    // progressiveFetch to be called again.
    //
    // This progressive method of querying portals helps prevent queries from
    // failing, but if the first portal is not a good portal it introduces
    // substantial latency. progressiveFetch does not do anything to make sure the
    // portals are the best portals, it just queries them in order. The caller
    // should make a best attempt to always have the best, most reliable and
    // fastest portal as the first portal in the list.
    //
    // The reason that we don't blindly accept a 4XX response from a portal is that
    // we have no way of verifying that the 4XX is legitimate. We don't trust the
    // portal, and we can't give a rogue portal the opportunity to interrupt our
    // user experience simply by returning a dishonest 404. So we need to keep
    // querying more portals and gain confidence that the 404 a truthful response.
    function progressiveFetch(endpoint, fetchOpts, portals, verifyFunction) {
        let portalsCopy = [...portals];
        return new Promise((resolve) => {
            let pfm = {
                endpoint,
                fetchOpts,
                remainingPortals: portalsCopy,
                portalsFailed: [],
                responsesFailed: [],
                messagesFailed: [],
                logs: [],
            };
            progressiveFetchHelper(pfm, resolve, verifyFunction);
        });
    }

    // downloadSkylink will download the provided skylink.
    function downloadSkylink(skylink) {
        return new Promise((resolve) => {
            // Get the Uint8Array of the input skylink.
            let [u8Link, errBTB] = b64ToBuf(skylink);
            if (errBTB !== null) {
                resolve([new Uint8Array(0), addContextToErr(errBTB, "unable to decode skylink")]);
                return;
            }
            if (!validSkylink(u8Link)) {
                resolve([new Uint8Array(0), "skylink appears to be invalid"]);
                return;
            }
            // Prepare the download call.
            let endpoint = "/skynet/trustless/basesector/" + skylink;
            let fileDataPtr = { fileData: new Uint8Array(0), err: null };
            let verifyFunction = function (response) {
                return verifyDownloadResponse(response, u8Link, fileDataPtr);
            };
            // Perform the download call.
            progressiveFetch(endpoint, null, defaultPortalList, verifyFunction).then((result) => {
                // Return an error if the call failed.
                if (result.success !== true) {
                    // Check for a 404.
                    for (let i = 0; i < result.responsesFailed.length; i++) {
                        if (result.responsesFailed[i].status === 404) {
                            resolve([new Uint8Array(0), "404"]);
                            return;
                        }
                    }
                    // Error is not a 404, return the logs as the error.
                    let err = tryStringify(result.logs);
                    resolve([new Uint8Array(0), addContextToErr(err, "unable to complete download")]);
                    return;
                }
                // Check if the portal is honest but the download is corrupt.
                if (fileDataPtr.err !== null) {
                    resolve([new Uint8Array(0), addContextToErr(fileDataPtr.err, "download is corrupt")]);
                    return;
                }
                resolve([fileDataPtr.fileData, null]);
            });
        });
    }

    // verifyDecodedResp will verify the decoded response from a portal for a
    // regRead call.
    function verifyDecodedResp(resp, data, pubkey, datakey) {
        // Status is expected to be 200.
        if (resp.status !== 200) {
            return "expected 200 response status, got: " + tryStringify(resp.status);
        }
        // Verify that all required fields were provided.
        if (!("data" in data)) {
            return "expected data field in response";
        }
        if (typeof data.data !== "string") {
            return "expected data field to be a string";
        }
        if (!("revision" in data)) {
            return "expected revision in response";
        }
        if (typeof data.revision !== "bigint") {
            return "expected revision to be a number";
        }
        if (!("signature" in data)) {
            return "expected signature in response";
        }
        if (typeof data.signature !== "string") {
            return "expected signature to be a string";
        }
        // Parse out the fields we need.
        let [entryData, errHTB] = hexToBuf(data.data);
        if (errHTB !== null) {
            return "could not decode registry data from response";
        }
        let [sig, errHTB2] = hexToBuf(data.signature);
        if (errHTB2 !== null) {
            return "could not decode signature from response";
        }
        // Verify the signature.
        if (!verifyRegistrySignature(pubkey, datakey, entryData, data.revision, sig)) {
            return "signature mismatch";
        }
        // TODO: Need to be handling type 2 registry entries here otherwise we will
        // be flagging non malicious portals as malicious.
        return null;
    }
    // verifyRegistryReadResponse will verify that the registry read response from
    // the portal was correct.
    function verifyRegistryReadResponse(resp, pubkey, datakey) {
        return new Promise((resolve) => {
            resp
                .text()
                .then((str) => {
                let [obj, errPJ] = parseJSON(str);
                if (errPJ !== null) {
                    resolve(addContextToErr(errPJ, "unable to parse registry response"));
                    return;
                }
                let errVDR = verifyDecodedResp(resp, obj, pubkey, datakey);
                if (errVDR !== null) {
                    resolve(addContextToErr(errVDR, "regRead response failed verification"));
                    return;
                }
                resolve(null);
            })
                .catch((err) => {
                resolve(addContextToErr(tryStringify(err), "unable to decode response"));
            });
        });
    }
    // verifyRegistryWriteResponse will verify that the response from a
    // registryWrite call is valid. There's not much to verify beyond looking for
    // the right response code, as the portal is not providing us with data, just
    // confirming that a write succeeded.
    function verifyRegistryWriteResponse(resp) {
        return new Promise((resolve) => {
            if (resp.status === 204) {
                resolve(null);
            }
            resolve("expecting 200 status code for registry write, got:" + resp.status.toString());
        });
    }

    // stringifyjson.ts is split into a separate file to avoid a circular
    // dependency. If you merge it with stringifytry.ts you have a circular import
    // where err.js is importing stringify.js and stringify.js is importing err.js.
    // Splitting the functions out resolves this issue.
    // jsonStringify is a replacement for JSON.stringify that returns an error
    // rather than throwing.
    function jsonStringify(obj) {
        try {
            let str = JSON.stringify(obj);
            return [str, null];
        }
        catch (err) {
            return ["", addContextToErr(tryStringify(err), "unable to stringify object")];
        }
    }

    var skynet = /*#__PURE__*/Object.freeze({
        __proto__: null,
        blake2b: blake2b,
        defaultPortalList: defaultPortalList,
        dictionary: dictionary,
        downloadSkylink: downloadSkylink,
        verifyDownload: verifyDownload,
        verifyDownloadResponse: verifyDownloadResponse,
        ed25519Sign: ed25519Sign,
        ed25519Verify: ed25519Verify,
        b64ToBuf: b64ToBuf,
        bufToB64: bufToB64,
        bufToHex: bufToHex,
        bufToStr: bufToStr,
        encodePrefixedBytes: encodePrefixedBytes,
        encodeU64: encodeU64,
        hexToBuf: hexToBuf,
        addContextToErr: addContextToErr,
        composeErr: composeErr,
        blake2bAddLeafBytesToProofStack: blake2bAddLeafBytesToProofStack,
        blake2bMerkleRoot: blake2bMerkleRoot,
        blake2bProofStackRoot: blake2bProofStackRoot,
        parseJSON: parseJSON,
        progressiveFetch: progressiveFetch,
        computeRegistrySignature: computeRegistrySignature,
        deriveRegistryEntryID: deriveRegistryEntryID,
        entryIDToSkylink: entryIDToSkylink,
        resolverLink: resolverLink,
        taggedRegistryEntryKeys: taggedRegistryEntryKeys,
        verifyRegistrySignature: verifyRegistrySignature,
        verifyRegistryReadResponse: verifyRegistryReadResponse,
        verifyRegistryWriteResponse: verifyRegistryWriteResponse,
        deriveChildSeed: deriveChildSeed,
        deriveMyskyRootKeypair: deriveMyskyRootKeypair,
        generateSeedPhraseDeterministic: generateSeedPhraseDeterministic,
        seedPhraseToSeed: seedPhraseToSeed,
        validSeedPhrase: validSeedPhrase,
        sha512: sha512,
        parseSkylinkBitfield: parseSkylinkBitfield,
        skylinkV1Bitfield: skylinkV1Bitfield,
        validateSkyfileMetadata: validateSkyfileMetadata,
        validateSkyfilePath: validateSkyfilePath,
        validSkylink: validSkylink,
        verifyResolverLinkProofs: verifyResolverLinkProofs,
        jsonStringify: jsonStringify,
        tryStringify: tryStringify
    });

    // @ts-ignore
    window.kernel = kernel;
    // @ts-ignore
    window.skynet = skynet;

})();
