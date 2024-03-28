console.log("script.js")

const cubismToken = "Cubism Editor Web Plugin Token Parameter Control"
let storageToken = null
if (!location.href.startsWith("file://")) {
    storageToken = localStorage.getItem(cubismToken)
}
const cePlugin = new CEPlugin("Cubism Editor Plugin API", storageToken)

cePlugin.onStateChanged = (state) => {
    switch (state) {
    case CEPlugin.DISCONNECTED:
        document.getElementById("state").textContent = "Disconnected"
        break
    case CEPlugin.CONNECTING:
        document.getElementById("state").textContent = "Connecting"
        break
    case CEPlugin.OPEN:
        document.getElementById("state").textContent = "Open"
        break
    case CEPlugin.CONNECTED:
        document.getElementById("state").textContent = "Connected"
        if (!location.href.startsWith("file://")) {
            localStorage.setItem(cubismToken, cePlugin.token)
        }
        document.getElementById("textarea_errorLog").value = ""
        break
    case CEPlugin.SOCKET_ERROR:
        document.getElementById("state").textContent = "Socket Error"
        document.getElementById("textarea_errorLog").value = cePlugin.errorMessage
        break
    case CEPlugin.API_ERROR:
        document.getElementById("state").textContent = "Api Error"
        document.getElementById("textarea_errorLog").value = cePlugin.errorMessage
        break
    }
}

function connect() {
    console.log("start connect: ", server.value)
    cePlugin.start(server.value)
}

function disconnect() {
    console.log("disconnect.")
    stop()
    cePlugin.stop()
}

const prefixText = "text_"
const prefixSlider = "slider_"
const prefixCubism = "cubism"
const suffixValue = "Value"
const suffixName = "Name"
let modelUID

function start() {
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            setParameters()
            cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": true })
            cePlugin.addEventListener("NotifyChangeEditMode", (message) => {
                console.log("Event NotifyChangeEditMode.")
                setParameters()
            })
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
}

function setParameters() {
    console.log("Set Parameters")
    
    cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
        modelUID = message.Data.ModelUID
        document.getElementById("modelUID").textContent = modelUID
        
        cePlugin.sendMessage("GetParameters", { "ModelUID": modelUID }).then((message) => {
            // Delete current display.
            const cubismPreview = document.getElementById("cubismPreview")
            while (cubismPreview.firstChild) {
                cubismPreview.removeChild(cubismPreview.firstChild)
            }
            
            // Show parameters.
            for (let param of message.Data.Parameters) {
                const tr = document.createElement("tr")
                cubismPreview.appendChild(tr)
                
                // Label creation.
                const td_id = document.createElement("td")
                cubismPreview.appendChild(td_id)
                const text_id = document.createTextNode(param.Id)
                text_id.id = prefixText + prefixCubism + param.Id
                td_id.appendChild(text_id)
                
                // Name creation.
                const td_name = document.createElement("td")
                cubismPreview.appendChild(td_name)
                const text_name = document.createTextNode(param.Name)
                text_name.id = prefixText + prefixCubism + param.Id + suffixName
                td_name.appendChild(text_name)
                
                // Slider creation.
                const td_slider = document.createElement("td")
                cubismPreview.appendChild(td_slider)
                const slider = document.createElement("input")
                td_slider.appendChild(slider)
                slider.type = "range"
                slider.id = prefixSlider + prefixCubism + param.Id
                slider.value = param.Default
                slider.min = param.Min
                slider.max = param.Max
                slider.step = "any"
                slider.addEventListener("input", onChangeParameter)
                
                // Value creation.
                const td_value = document.createElement("td")
                cubismPreview.appendChild(td_value)
                td_value.id = prefixText + prefixCubism + param.Id + suffixValue
                const text_value = document.createTextNode("0")
                td_value.appendChild(text_value)
                text_value.textContent = Math.round(param.Default * 100) / 100
            }
        })
        
        cePlugin.sendMessage("GetParameterValues", { "ModelUID": modelUID }).then((message) => {
            for (let param of message.Data.Parameters) {
                const slider = document.getElementById(prefixSlider + prefixCubism + param.Id)
                const text_value = document.getElementById(prefixText + prefixCubism + param.Id + suffixValue)
                if (slider != null && text_value != null) {
                    const value = Math.round(param.Value * 100) / 100
                    slider.value = value
                    text_value.textContent = value
                }
            }
        })
    })
}

function stop() {
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            modelUID = "Undefined"
            document.getElementById("modelUID").textContent = modelUID
            
            // Delete current display.
            const cubismPreview = document.getElementById("cubismPreview")
            while (cubismPreview.firstChild) {
                cubismPreview.removeChild(cubismPreview.firstChild)
            }
            
            cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": false })
            cePlugin.clearEventListener("NotifyChangeEditMode")
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
}

function onChangeParameter(event) {
    const sliderId = event.target.id
    const id = sliderId.substr(prefixSlider.length + prefixCubism.length)
    const value = Number(event.target.value)
    
    let data = {
        "ModelUID": modelUID,
        "Parameters": [
            {
                "Id": id,
                "Value": value
            }
        ]
    };
    cePlugin.sendMessage("SetParameterValues", data)

    const textValue = document.getElementById(prefixText + prefixCubism + id + suffixValue)
    textValue.textContent = Math.round(value * 100) / 100
}

