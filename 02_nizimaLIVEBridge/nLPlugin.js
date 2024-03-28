class NLPlugin {
    static get apiVersion() { return "1.0.0" }
    static get DISCONNECTED() { return 0 }
    static get CONNECTING() { return 1 }
    static get OPEN() { return 2 }
    static get ESTABLISHED() { return 3 }
    static get CONNECTED() { return 4 }
    static get SOCKET_ERROR() { return 5 }
    static get API_ERROR() { return 6 }
    
    get name() { return this.#name }
    get state() { return this.#state }
    developer = ""
    version = ""
    token = ""
    onStateChanged = (state) => { }
    errorMessage = ""

    constructor(name) {
        if (name == null) throw "name is empty!"
        this.#name = name
    }

    start(address) {
        if (this.#socket) {
            this.#socket.onopen = null
            this.#socket.onclose = null
            this.#socket.onmessage = null
            this.#socket.close()
        }
        this.#socket = new WebSocket(address)
        this.#socket.addEventListener("error", (event) => {
            console.log("WebSocket Error : ", event)
            this.errorMessage = "Connection failed. Please check the console log."
            this.#setState(NLPlugin.SOCKET_ERROR)
        })
        this.#setState(NLPlugin.CONNECTING)
        this.#socket.onopen = (event) => {
            this.#setState(NLPlugin.OPEN)
            this.#establishConnection().catch(e => 
                this.#registerPlugin()
            ).catch(e =>
                this.stop()
            )
        }
        this.#socket.onclose = (event) => {
            if (this.state === NLPlugin.CONNECTING) {
                setTimeout(() => { this.start(this.#socket.url) }, 1000)
            } else {
                this.stop()
            }
        }
        this.#socket.onmessage = (event) => {
            const message = JSON.parse(event.data)
            if (message.Id in this.#promises) {
                if (message.Type === "Response") {
                    this.#promises[message.Id].resolve(message)
                } else if (message.Type === "Error") {
                    this.#promises[message.Id].reject(message)
                }
                delete this.#promises[message.RequestId]
            }
            if (message.Type === "Event") {
                if (message.Method === "NotifyEnabledChanged") {
                    if (message.Data.Enabled) {
                        this.#setState(NLPlugin.CONNECTED)
                    } else {
                        this.#setState(NLPlugin.ESTABLISHED)
                    }
                }
                if (message.Method in this.#eventListener) {
                    for (let callback of this.#eventListener[message.Method]) {
                        callback(message)
                    }
                }
            }
        }
    }

    stop() {
        console.log("nLPlugin stop.")
        this.#setState(NLPlugin.DISCONNECTED)
        if (this.#socket) {
            this.#socket.onopen = null
            this.#socket.onclose = null
            this.#socket.onmessage = null
            this.#socket.close()
        }
        this.#socket = null
    }

    addEventListener(event, callback) {
        if (this.#eventListener[event] == null) {
            this.#eventListener[event] = []
        }
        this.#eventListener[event].push(callback)
    }
    
    clearEventListener(event) {
        if (this.#eventListener[event] != null) {
            this.#eventListener[event] = null
        }
    }

    async callMethod(method, data) {
        if (this.state !== NLPlugin.CONNECTED) throw "API not ready!"
        return await this.#sendRequest(method, data)
    }

    // private
    static #requestId = 0
    #name
    #state = NLPlugin.DISCONNECTED
    #socket
    #promises = {}
    #eventListener = {}
    #setState(state) {
        if (this.#state === state) return
        this.#state = state
        this.onStateChanged(state)
    }

    async #sendRequest(method, data) {
        const id = String(NLPlugin.#requestId++)
        this.#socket.send(JSON.stringify({
            "nLPlugin": NLPlugin.apiVersion,
            "Timestamp": Date.now(),
            "Id": id,
            "Type": "Request",
            "Method": method,
            "Data": data
        }))
        return await new Promise((resolve, reject) => {
            this.#promises[id] = {
                resolve: resolve,
                reject: reject
            }
        })
    }

    async #registerPlugin() {
        if (this.state !== NLPlugin.OPEN) return Promise.reject()
        return this.#sendRequest("RegisterPlugin", {
            "Name": this.name,
            "Developer": this.developer,
            "Version": this.version
        }).then(message => {
            if (message.Type === "Error") {
                this.errorMessage = JSON.stringify(message)
                this.#setState(NLPlugin.API_ERROR)
                return Promise.reject()
            } else if (message.Type === "Response") {
                this.token = message.Data.Token
                this.#setState(NLPlugin.ESTABLISHED)
                return Promise.resolve()
            }
        })
    }

    async #establishConnection() {
        if (this.token == null) return Promise.reject()
        if (this.state !== NLPlugin.OPEN) return Promise.reject()
        return this.#sendRequest("EstablishConnection", {
            "Name": this.name,
            "Token": this.token,
            "Version": this.version
        }).then(message => {
            if (message.Type === "Error") {
                this.errorMessage = JSON.stringify(message)
                this.#setState(NLPlugin.API_ERROR)
                return Promise.reject()
            } else if (message.Type === "Response") {
                this.#setState(NLPlugin.ESTABLISHED)
                if (message.Data.Enabled) {
                    this.#setState(NLPlugin.CONNECTED)
                }
                return Promise.resolve()
            }
        })
    }
}
