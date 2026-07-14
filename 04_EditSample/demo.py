import asyncio
from ceplugin import client

async def main():
    await client.waitForRegistration()
    await client.waitForNormalPermission()
    await client.waitForEditPermission()
    await client.editBegin()
    modelUID = await client.getCurrentModelUID()

    response = await client.sendAndWait(
        "EditParameterGroup", {
            "ModelUID": modelUID,
            "Id": "ParamGroupFace",
            "Name": "Edited Face Group"
        }
    )
    print(f"{response=}")
    await client.editEnd()

if __name__ == "__main__":
    asyncio.run(main())