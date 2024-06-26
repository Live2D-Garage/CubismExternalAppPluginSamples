console.log("script.js")

const cubismToken = "Cubism Editor Web Plugin Token Parameter Control"
let storageToken = null
if (!location.href.startsWith("file://")) {
    storageToken = localStorage.getItem(cubismToken)
}
const cePlugin = new CEPlugin("Cubism Editor Plugin API", storageToken)

const strClearData = "Empty"
const strStoredData = "Stored"
const parameterComp = "Cubism Editor Web Plugin Parameter Comp No"
const parameterCompMemo = "Cubism Editor Web Plugin Parameter Comp Memo No"
const parameterCompNumMax = 16
let loadFileData = null

window.onload = function() {
    for (let i = 1; i <= parameterCompNumMax; i++) {
        const localStorageData = localStorage.getItem(parameterComp + String(i))
        if (localStorageData != null) {
            document.getElementById("state_" + String(i)).textContent = strStoredData
        } else {
            document.getElementById("state_" + String(i)).textContent = strClearData
        }
        
        const memo = localStorage.getItem(parameterCompMemo + String(i))
        document.getElementById("memo_" + String(i)).value = memo
    }
}

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

function outputFile() {
    const fileName = document.getElementById("saveName").value
    if (fileName == "") {
        window.alert("File name not entered.")
        return
    }
    
    let saveData = {
        "Parameters": []
    };
    for (let i = 1; i <= parameterCompNumMax; i++) {
        const paramData = JSON.parse(localStorage.getItem(parameterComp + String(i)))
        const memo = localStorage.getItem(parameterCompMemo + String(i))
        saveData.Parameters.push({ "No": String(i), "Param": paramData, "Memo": memo })
    }
    
    const json = JSON.stringify(saveData, null, " ")
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const linkTag = document.createElement("a")
    linkTag.href = url
    linkTag.download = fileName + ".json"
    linkTag.click()
    URL.revokeObjectURL(url)
    linkTag.remove()
}

function loadFileChanged(input) {
    loadFileData = input.files[0]
}

function inputFile() {
    if (loadFileData == null) {
        window.alert("File not found.")
        return
    }
    
    let reader = new FileReader()
    reader.readAsText(loadFileData)
    reader.onload = () => {
        const inputData = JSON.parse(reader.result)
        for (let param of inputData.Parameters) {
            const no = param.No
            if (param.Param != null) {
                localStorage.setItem(parameterComp + no, JSON.stringify(param.Param))
                document.getElementById("state_" + no).textContent = strStoredData
            } else {
                document.getElementById("state_" + no).textContent = strClearData
            }
            
            if (param.Memo != null) {
                localStorage.setItem(parameterCompMemo + no, param.Memo)
                document.getElementById("memo_" + no).value = param.Memo
            }
        }
    }
}

const prefixText = "text_"
const prefixCubism = "cubism"
const suffixValue = "Value"
const suffixName = "Name"

function pushParam(compNo) {
    let data = { "Parameters": [] };
    let tmpData = { "Parameters": [] };
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
                const modelUID = message.Data.ModelUID
                document.getElementById("modelUID").textContent = modelUID
                
                cePlugin.sendMessage("GetParameters", { "ModelUID": modelUID }).then((message) => {
                    for (let param of message.Data.Parameters) {
                        tmpData.Parameters.push({ "Id": param.Id, "Name": param.Name })
                    }
                    
                    cePlugin.sendMessage("GetParameterValues", { "ModelUID": modelUID }).then((message) => {
                        for (let param of message.Data.Parameters) {
                            for (let tmpDataParam of tmpData.Parameters) {
                                if (param.Id == tmpDataParam.Id) {
                                    data.Parameters.push({ "Id": param.Id, "Name": tmpDataParam.Name, "Value": param.Value })
                                    break
                                }
                            }
                        }
                        
                        localStorage.setItem(parameterComp + String(compNo), JSON.stringify(data))
                        setParameters(data)
                        document.getElementById("state_" + String(compNo)).textContent = strStoredData
                    })
                })
            })
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
}

function popParam(compNo) {
    const localStorageData = JSON.parse(localStorage.getItem(parameterComp + String(compNo)))
    if (localStorageData != null) {
        setParameters(localStorageData)
        cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
            if (message.Data.Result) {
                cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
                    document.getElementById("modelUID").textContent = message.Data.ModelUID
                    let data = {
                        "ModelUID": message.Data.ModelUID,
                        "Parameters": []
                    };
                    for (let param of localStorageData.Parameters) {
                        data.Parameters.push({ "Id": param.Id, "Value": param.Value })
                    }
                    cePlugin.sendMessage("SetParameterValues", data)
                })
            } else {
                console.log("Cubism Editor is not approved.")
            }
        })
    } else {
        console.log("No data saved.")
    }
}

function clearParam(compNo) {
    localStorage.removeItem(parameterComp + String(compNo))
    document.getElementById("state_" + String(compNo)).textContent = strClearData
    localStorage.removeItem(parameterCompMemo + String(compNo))
    document.getElementById("memo_" + String(compNo)).value = ""
}

function memoTextChanged(compNo) {
    const memo = document.getElementById("memo_" + String(compNo)).value
    localStorage.setItem(parameterCompMemo + String(compNo), memo)
}

function setParameters(data) {
    console.log("Set Parameters")
    
    // Delete current display.
    const cubismPreview = document.getElementById("cubismPreview")
    while (cubismPreview.firstChild) {
        cubismPreview.removeChild(cubismPreview.firstChild)
    }
    
    // Show parameters.
    for (let param of data.Parameters) {
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
        
        // Value creation.
        const td_value = document.createElement("td")
        cubismPreview.appendChild(td_value)
        td_value.id = prefixText + prefixCubism + param.Id + suffixValue
        const text_value = document.createTextNode("0")
        td_value.appendChild(text_value)
        text_value.textContent = Math.round(param.Value * 100) / 100
    }
}
