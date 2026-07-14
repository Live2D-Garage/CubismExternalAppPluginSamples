import json
from typing import Dict,Coroutine, Optional
from typing import Any

import websockets
import asyncio
import os
import time
from pydantic import BaseModel
import uuid
import nest_asyncio
nest_asyncio.apply()

DEFAULTPORT=22033
URL = "localhost"
TOKEN_FILENAME = "token.txt"

class ConnectionStatus(BaseModel):
    IsConnected: bool
    IsAuthenticated: bool

class CEPluginClient:
    def __init__(self):
        self.websocket:websockets.ClientConnection = None
        if(os.path.isfile(TOKEN_FILENAME)):
            with open(TOKEN_FILENAME, "r") as f:
                self.TOKEN = f.read() 
        else: 
            self.TOKEN = ""
        self.appName = "testPlugin"
        self.responseHandlers:Dict[str,Coroutine[Any, Any, dict]] = {}
        self.eventHandlers:Dict[str,Coroutine[Any, Any, dict]] = {}
        self.errorHandlers:Dict[str,Coroutine[Any, Any, dict]] = {}
        self.connectionLostHandler:Coroutine[Any, Any, None] = self.connectWithRetry
        self.isRegistered = False
        asyncio.ensure_future(self.startListen(),loop=asyncio.get_event_loop())
        asyncio.ensure_future(self.connectWithRetry(),loop=asyncio.get_event_loop())
    
    def uri(self,port:int) -> str:
        return f"ws://{URL}:{port}"
    
    async def startListen(self):
        print("startListen")
        while True:
            if(self.websocket is None):
                await asyncio.sleep(0.1)
            else:
                try:
                    await self.on_receieve(await self.websocket.recv())
                except websockets.ConnectionClosed:
                    print("Connection closed")
                    self.websocket = None
                    if(self.connectionLostHandler):
                        asyncio.ensure_future(self.connectionLostHandler(),loop=asyncio.get_event_loop())

    async def connect(self,port:int = DEFAULTPORT):
        print("start connecting...")
        if(self.websocket is not None):
            await self.websocket.close()
        try:
            self.websocket = await websockets.connect(self.uri(port))
            await self.registerPlugin()

        except Exception as e:
            print(f"Error connecting to websocket: {e}")
            self.websocket = None

    async def connectWithRetry(self,port:int = DEFAULTPORT,retryInterval:int=3):
        self.isRegistered = False
        while True:
            await self.connect(port)
            if(self.websocket is not None):
                break
            print(f"Retrying connection in {retryInterval} seconds...")
            await asyncio.sleep(retryInterval)

    async def sendRaw(self, data: Dict[str, Any]):
        print(f"send: {data}")
        await self.websocket.send(json.dumps(data))

    def connectionStatus(self) -> ConnectionStatus:
        isConnected = self.websocket is not None
        isAuthenticated = False
        if isConnected:
            isAuthenticated = asyncio.get_event_loop().run_until_complete(self.checkIsAuthenticated())
        return ConnectionStatus(
            IsConnected=isConnected,
            IsAuthenticated=isAuthenticated
        )

    async def send(self, method:str, data: dict, responseHandler: Optional[Coroutine[Any, Any, dict]] = None, eventHandler: Optional[Coroutine[Any, Any, dict]] = None, errorHandler: Optional[Coroutine[Any, Any, dict]] = None):
        guid = uuid.uuid4().hex
        if(responseHandler):
            self.responseHandlers[guid] = responseHandler
        if(eventHandler):
            self.eventHandlers[method] = eventHandler
        if(errorHandler):
            self.errorHandlers[guid] = errorHandler
        #Convert timestamp to milliseconds
        await self.sendRaw(
            {
                "Version":"1.1.0",
                "RequestId":guid,
                "Type": "Request",
                "Method": method,
                "Data": data
            }
        )
    
    async def sendAndWait(self, method:str, data:dict, timeout:float = 10) -> dict:
        response: dict = None
        isReceived = False
        async def onReceieve(responseData: dict):
            nonlocal response
            response = responseData
            nonlocal isReceived
            isReceived = True
        
        async def onError(errorData: dict):
            nonlocal response
            response = errorData
            nonlocal isReceived
            isReceived = True
            
        await self.send(method, data, responseHandler=onReceieve, errorHandler=onError)
        startTime = time.monotonic()
        while not isReceived:
            await asyncio.sleep(0.1)
            if timeout > 0 and time.monotonic() - startTime > timeout:
                raise TimeoutError(f"Request timed out after {timeout} seconds")
        return response

    async def registerPlugin(self):
        async def onReceieve(data: dict):
            newToken = data["Token"]
            if(newToken != self.TOKEN):
                self.TOKEN = newToken
                with open(TOKEN_FILENAME, "w") as f:
                    f.write(newToken)
                print("Token updated: " + newToken)
            else:
                print("Token authenticated")
            self.isRegistered = True
        await self.send("RegisterPlugin", {
            "Token": self.TOKEN,
            "Name": self.appName
        }, responseHandler=onReceieve)

    async def checkIsAuthenticated(self) -> bool:
        if(self.websocket is None):
            print("Websocket is not connected")
            raise Exception("Websocket is not connected")
        isReceieved = False
        isAuthenticated = False
        async def onReceieve(data: dict):
            nonlocal isAuthenticated
            isAuthenticated = data["Result"]
            print("isAuthenticated: " + str(isAuthenticated))
            nonlocal isReceieved
            isReceieved = True
        async def onError(data: dict):
            nonlocal isReceieved
            isReceieved = True
            print("isAuthenticated error")
        await self.send("GetIsApproval",{}, responseHandler=onReceieve, errorHandler=onError)
        while not isReceieved:
            await asyncio.sleep(0.1)
        return isAuthenticated
    
    async def checkIsEditAuthenticated(self) -> bool:
        if(self.websocket is None):
            print("Websocket is not connected")
            raise Exception("Websocket is not connected")
        isReceieved = False
        isAuthenticated = False
        async def onReceieve(data: dict):
            nonlocal isAuthenticated
            isAuthenticated = data["Result"]
            print("isEditAuthenticated: " + str(isAuthenticated))
            nonlocal isReceieved
            isReceieved = True
        async def onError(data: dict):
            nonlocal isReceieved
            isReceieved = True
            print("isEditAuthenticated error")
        await self.send("GetIsEditApproval",{}, responseHandler=onReceieve, errorHandler=onError)
        while not isReceieved:
            await asyncio.sleep(0.1)
        return isAuthenticated

    async def getCurrentModelUID(self) -> str:
        if(self.websocket is None):
            print("Websocket is not connected")
            return ""
        ret = ""
        receieved = False
        async def onReceieve(data: dict):
            nonlocal receieved
            receieved = True
            try:
                nonlocal ret
                ret = data["ModelUID"]
            except Exception as e: 
                print("getCurrentModelUID failed")
        async def onError(data: dict):
            nonlocal receieved
            receieved = True
            print("getCurrentModelUID error")
        await self.send("GetCurrentModelUID",{}, responseHandler=onReceieve, errorHandler=onError)
        while not receieved:
            await asyncio.sleep(0.1)
        return ret
    
    async def on_receieve(self,message: str):
        print("receieved:" + message)
        jsonData = json.loads(message)
        requestType = jsonData["Type"]
        method = jsonData["Method"]
        if requestType == "Response" or requestType == "Error":
            requestID = jsonData["RequestId"]
            if requestType == "Error":
                if( task:= self.errorHandlers.get(requestID,None)):
                    asyncio.ensure_future(task(jsonData["Data"]))
                else:
                    print("error no handler found")
                self.responseHandlers.pop(requestID, None)
                self.errorHandlers.pop(requestID, None)
            elif requestType == "Response":
                if( task:= self.responseHandlers.get(requestID,None)):
                    asyncio.ensure_future(task(jsonData["Data"]))
                else:
                    print("response no handler found")
                self.responseHandlers.pop(requestID, None)
                self.errorHandlers.pop(requestID, None)
        elif requestType == "Event":
            if( task:= self.eventHandlers.get(method,None)):
                print("start task for event: " + method)
                asyncio.ensure_future(task(jsonData["Data"]))
            else:
                print("event no handler found")

    async def close(self):
        await self.websocket.close()

    async def waitForRegistration(self):
        while not self.isRegistered:
            await asyncio.sleep(0.1)

    async def waitForNormalPermission(self):
        while True:
            isAuthenticated = await self.checkIsAuthenticated()
            if isAuthenticated:
                return
            await asyncio.sleep(1)
    
    async def waitForEditPermission(self):
        while True:
            isAuthenticated = await self.checkIsEditAuthenticated()
            if isAuthenticated:
                return
            await asyncio.sleep(1)

    async def editBegin(self):
        result = await self.sendAndWait("EditBegin",{},0)
        isError = "Error" in result
        if isError:
            print("EditBegin error: " + str(result["Error"]))
            raise Exception("EditBegin failed")
        else:
            #print("EditBegin success")
            pass
            
    async def editEnd(self):
        result = await self.sendAndWait("EditEnd",{},0)
        isError = "Error" in result
        if isError:
            print("EditEnd error: " + str(result["Error"]))
            raise Exception("EditEnd failed")
        else:
            #print("EditEnd success")
            pass

client = CEPluginClient()