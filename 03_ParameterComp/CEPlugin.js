class CEPlugin {
    static get DISCONNECTED() { return 0 }
    static get CONNECTING() { return 1 }
    static get OPEN() { return 2 }
    static get CONNECTED() { return 3 }
    static get SOCKET_ERROR() { return 4 }
    static get API_ERROR() { return 5 }

    get name() { return this.#name }
    get token() { return this.#token }
    get state() { return this.#state }

    // private
    static #requestId = 0
    #name
    #token
    #version = "0.9.1"
    #state = CEPlugin.DISCONNECTED
    #socket
    #promises = {}
    #eventListener = {}
    #setState = function(state) {
        if (this.#state === state) return
        this.#state = state
        this.onStateChanged(state)
    }

    onStateChanged = (state) => { }
    errorMessage = ""

    constructor(name, token) {
        if (name == null) throw "name is empty!"
        this.#name = name
        this.#token = token
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
            this.#setState(CEPlugin.SOCKET_ERROR)
        })
        this.#setState(CEPlugin.CONNECTING)
        
        this.#socket.onopen = (event) => {
            this.#changeStateOpen()
            this.#sendRegisterPlugin().then((message) => {
                if (message.Type === "Error") {
                    this.#changeStateApiError(message)
                } else if (message.Type === "Response") {
                    this.#token = message.Data.Token
                    this.#changeStateConnected()
                }
            })
        }
        
        this.#socket.onclose = (event) => {
            console.log("CEPlugin onclose.")
            if (this.state === CEPlugin.CONNECTING) {
                setTimeout(() => {
                    console.log("CEPlugin restart.")
                    this.start(this.#socket.url)
                }, 1000)
            } else {
                this.stop()
            }
        }
        
        this.#socket.onmessage = (event) => {
            //console.log("CEPlugin onmessage.")
            const message = JSON.parse(event.data)
            if (message.RequestId in this.#promises) {
                this.#promises[message.RequestId].resolve(message)
                delete this.#promises[message.RequestId]
            }
            if (message.Type === "Event") {
                if (message.Method in this.#eventListener) {
                    for (let callback of this.#eventListener[message.Method]) {
                        callback(message)
                    }
                }
            }
        }
    }
    
    stop() {
        console.log("CEPlugin stop.")
        this.#setState(CEPlugin.DISCONNECTED)
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
    
    async sendMessage(method, data) {
        if (this.#isConnected()) {
            const id = String(CEPlugin.#requestId++)
            let str = JSON.stringify({
                "Version": this.#version,
                "Timestamp": Date.now(),
                "RequestId": id,
                "Type": "Request",
                "Method": method,
                "Data": data
            });
            
            this.#socket.send(str)
            
            return await new Promise((resolve, reject) => {
                this.#promises[id] = {
                    resolve: resolve,
                    reject: reject
                }
            })
        }
        return null
    }
    
    async #sendRegisterPlugin() {
        let data = {
            "Name": this.#name,
            "Token": this.#token
        };
        return await this.sendMessage("RegisterPlugin", data)
    }
    
    #isConnected() {
        if (this.#state == CEPlugin.OPEN ||
            this.#state == CEPlugin.CONNECTED) {
            return true
        } else {
            console.log("CEPlugin is not connect.")
            return false
        }
    }
    
    #changeStateOpen() {
        console.log("CEPlugin onopen.")
        this.#setState(CEPlugin.OPEN)
    }
    
    #changeStateConnected() {
        console.log("CEPlugin is connected.")
        this.#setState(CEPlugin.CONNECTED)
    }
    
    #changeStateApiError(errorMessage) {
        console.log("API ERROR : CEPlugin is not connected.")
        this.errorMessage = JSON.stringify(errorMessage)
        this.#setState(CEPlugin.API_ERROR)
    }
}
