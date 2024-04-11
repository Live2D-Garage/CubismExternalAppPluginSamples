console.log("script.js")

const ExecMode = Object.freeze({
    stop: "Stop",
    CEtoNL: "Cubism Editor to nizima LIVE",
    suspendCEtoNL: "suspend Cubism Editor to nizima LIVE"
})

let isGetIsApproval_cePlugin = false
let execMode = ExecMode.stop
let prevExecMode = ExecMode.stop
let timerCEtoNL
let suspendStarted = false
let storedParameters = null

window.addEventListener("DOMContentLoaded", () => {
    // Execute when the page display state changes
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState == "hidden") {
            if (execMode != ExecMode.stop) {
                prevExecMode = execMode
                stopSync()
            }
        } else if (document.visibilityState == "visible") {
            if (prevExecMode == ExecMode.CEtoNL ||
                prevExecMode == ExecMode.suspendCEtoNL) {
                startSyncFromCEToNL()
                prevExecMode = ExecMode.stop
            }
        }
    })
})

function connectAndStartSyncFromCEToNL() {
    connect()
    document.getElementById("state").textContent = txtConnecting
    document.getElementById("btn_disconnect").disabled = false
    const polling = usePolling()
    polling.start(judgeConnection, 33).then(() => {
        judgeRecommendVersion()
        startSyncFromCEToNL()
        document.getElementById("btn_connect").disabled = true
        document.getElementById("btn_suspendAndResume").disabled = false
        document.getElementById("state").textContent = txtConnected
    }).catch(() => {
        document.getElementById("state").textContent = txtError
        disconnect()
    })
}

function startSyncFromCEToNL() {
    console.log("Start synchronization from Cubism Editor to nizima LIVE.")
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            stopExec()
            displayNLParameters()
            displayCEParameters()
            timerCEtoNL = setInterval(frameUpdate, 33)
            cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": true })
            document.getElementById("btn_suspendAndResume").textContent = txtSuspend
            document.getElementById("state").textContent = txtConnected
            execMode = ExecMode.CEtoNL
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
}

function stopExec() {
    clearNLParameters()
    clearCEParameters()
    ceModelUID = "Undefined"
    document.getElementById("ce_modelId").textContent = ceModelUID
    if (execMode == ExecMode.CEtoNL ||
        execMode == ExecMode.suspendCEtoNL) {
        clearInterval(timerCEtoNL)
    }
    cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": false })
    
    suspendStarted = false
}

function suspendAndResume() {
    console.log("Suspend and Resume.")
    if (execMode == ExecMode.CEtoNL) {
        suspendStarted = false
        storedParameters = null
        execMode = ExecMode.suspendCEtoNL
        document.getElementById("btn_suspendAndResume").textContent = txtResume
        document.getElementById("state").textContent = txtSuspend
    } else {
        suspendStarted = false
        storedParameters = null
        execMode = ExecMode.CEtoNL
        document.getElementById("btn_suspendAndResume").textContent = txtSuspend
        document.getElementById("state").textContent = txtConnected
    }
}

cePlugin.addEventListener("NotifyChangeEditMode", (message) => {
    ceDisplayParametersReinit = false
    clearCEParameters()
    displayCEParameters()
})

function frameUpdate() {
    if (!nlDisplayParametersReinit) {
        displayNLParameters()
    }
    
    cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
        if (message.Type == "Error") {
            if (ceModelUID != "Undefined") {
                clearCEParameters()
            }
            ceModelUID = "Undefined"
            return
        }
        
        if (ceModelUID != message.Data.ModelUID) {
            ceDisplayParametersReinit = false
            clearCEParameters()
            displayCEParameters()
            return
        }
        
        if (!ceDisplayParametersReinit) {
            return
        }
        
        if (execMode == ExecMode.suspendCEtoNL) {
            pollingSuspendStart()
        } else if (execMode == ExecMode.CEtoNL) {
            pollingParameterSend()
        }
    })
}

function pollingSuspendStart() {
    if (!suspendStarted) {
        cePlugin.sendMessage("GetParameterValues", { ModelUID: ceModelUID }).then((message) => {
            storedParameters = {
                "ModelId": String(nlSelectedModelId),
                "CubismParameterValues": []
            };
            
            for (let param of message.Data.Parameters) {
                const fixValue = Math.round(param.Value * 100) / 100
                storedParameters.CubismParameterValues.push({ "Id": param.Id, "Value": fixValue })
            }
            suspendStarted = true
        })
    }
    if (storedParameters != null) {
        nlPlugin.callMethod("SetCubismParameterValues", storedParameters)
    }
}

function pollingParameterSend() {
    cePlugin.sendMessage("GetParameterValues", { "ModelUID": ceModelUID }).then((message) => {
        let data = {
            "ModelId": String(nlSelectedModelId),
            "CubismParameterValues": []
        };
        
        for (let param of message.Data.Parameters) {
            const fixValue = Math.round(param.Value * 100) / 100
            const sliderCE = document.getElementById(prefixSlider + prefixCE + param.Id)
            const textCEValue = document.getElementById(prefixText + prefixCE + param.Id + suffixValue)
            if (sliderCE != null && textCEValue != null) {
                sliderCE.value = fixValue
                textCEValue.textContent = fixValue
            }
            
            const sliderNL = document.getElementById(prefixSlider + prefixNL + param.Id)
            const textNLValue = document.getElementById(prefixText + prefixNL + param.Id + suffixValue)
            if (sliderNL != null && textNLValue != null) {
                sliderNL.value = fixValue
                textNLValue.textContent = fixValue
                
                data.CubismParameterValues.push({ "Id": param.Id, "Value": fixValue })
            }
        }
        
        nlPlugin.callMethod("SetCubismParameterValues", data)
    })
}
