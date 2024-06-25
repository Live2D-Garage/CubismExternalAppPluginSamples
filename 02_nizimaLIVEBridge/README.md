# 02_nizimaLIVEBridge  
### nizima LIVE Bridge (nizima LIVE -> Cubism Editor)  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_nizimaLIVE_to_CubismEditor.html  
上記のサンプルはnizima LIVEとCubism Editorに接続し、nizima LIVEからCubism Editorへのパラメータの同期を行います。  
nizima LIVEにて表現した表情や動作、カメラキャプチャによる動きを、Cubism Editorのモデルへ反映します。  
  
### nizima LIVE Bridge (Cubism Editor -> nizima LIVE)  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_CubismEditor_to_nizimaLIVE.html  
上記のサンプルはnizima LIVEとCubism Editorに接続し、Cubism Editorからnizima LIVEへのパラメータの同期を行います。  
Cubism Editorにてパラメータを調整し、表現した表情や動作を、nizima LIVEのモデルへ反映します。  
  
#### 注意  
セキュリティの面から、HTMLのサンプルをダウンロードして実行した場合は、HTMLを読み込み（または再読み込み）するごとにエディタで許可を与える必要があります。  
  
### 利用手順  
1. Cubism Editorを起動します。  
2. ファイルメニューから任意のモデルを開きます。  
(nizima LIVEと連携するため、連携するモデルを開いてください。)  
3. ファイルメニューの「外部アプリケーション連携設定」を選択し、ダイアログを開きます。  
4. 外部アプリケーション連携設定ダイアログからポート番号を設定し、トグルスイッチをクリックして外部連携を有効化します。  
![](images/image001.png)  
5. nizima LIVEを起動します。  
6. モデル一覧から任意のモデルを選択します。  
(Cubism Editorと連携するため、連携するモデルを選択してください。)  
7. 設定・その他から「プラグイン」を選択し、ダイアログを開きます。  
8. プラグインマネージャーからポート番号を設定し、トグルスイッチをクリックして外部連携を有効化します。  
![](images/image002.png)  
9. サンプルHTMLを起動します。  
以下はnizima LIVEからCubism Editorへパラメータの同期を行う場合、  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_nizimaLIVE_to_CubismEditor.html  
以下はCubism Editorからnizima LIVEへパラメータの同期を行う場合、  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_CubismEditor_to_nizimaLIVE.html  
10. nizima LIVEとCubism Editorの各「Address」に接続先を設定し、「Connect」をクリックします。  
![](images/image003.png)  
    - 接続に失敗すると、各「Connection Error Log」にメッセージが表示されます。  
(接続先設定が間違っているとき、Cubism Editor側の外部連携を有効化していないとき等)  
![](images/image004.png)  
11. nizima LIVEのプラグインマネージャーに表示された外部連携先のトグルスイッチをクリックして外部連携を許可します。  
![](images/image005.png)  
    - 許可するとHTML側のnizima LIVEの「State」が「Connected」になります。  
![](images/image006.png)  
12. HTML側のCubism Editorの「State」が「Connected」になっていることを確認し、  
Cubism Editorの外部アプリケーション連携設定ダイアログの接続したアプリケーションの「許可」のチェックボックスにチェックを入れます。  
![](images/image007.png)  
13. 12を実施したタイミング「State」が「Connected and Synced」になり、パラメータの同期を開始されます。  
同期を止めるには「Disconnect」をクリックします。クリックすると同期停止とnizima LIVEとCubism Editorとの接続が解除されます。  
![](images/image008.png)  
パラメータの同期を開始すると同期しているパラメータ、同期していないnizima LIVEのパラメータ、同期していないCubism Editorのパラメータの一覧が表示されます。  
![](images/image009.png)  
14. 「Suspend」をクリックすることで、パラメータの同期を一時停止することができます。  
![](images/image010.png)  
15. 一時停止すると「State」が「Suspend」になります。同期を再開するには「Resume」をクリックします。  
![](images/image011.png)  
  
***
### nizima LIVE Bridge (nizima LIVE -> Cubism Editor)  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_nizimaLIVE_to_CubismEditor.html  
The above sample connects nizima LIVE and Cubism Editor and synchronizes parameters from nizima LIVE to Cubism Editor.  
The facial expressions and movements expressed in nizima LIVE, as well as the movements captured by the camera, will be reflected in the Cubism Editor model.  
  
### nizima LIVE Bridge (Cubism Editor -> nizima LIVE)  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_CubismEditor_to_nizimaLIVE.html  
The above sample connects nizima LIVE and Cubism Editor and synchronizes parameters from Cubism Editor to nizima LIVE.  
Adjust the parameters in Cubism Editor and reflect the expressed expressions and movements on the nizima LIVE model.  
  
#### Caution  
For security reasons, if you download and run the HTML sample, you will need to approve in the editor each time you load (or reload) the HTML-page.  
  
### Instructions for use  
1. Start Cubism Editor.  
2. Open any model from the file menu.  
(To link with nizima LIVE, open the model to be linked.)  
3. Select "External Application Integration settings" from the file menu to open the dialog.  
4. Set the port number from the external application linkage settings dialog and click the toggle switch to enable external linkage.  
![](images/image001.png)  
5. Start nizima LIVE.  
6. Select any model from the model list.  
(In order to link with Cubism Editor, select the model to be linked.)  
7. Select "Plug-in" from Settings/Other to open the dialog.  
8. Set the port number from the Plug-in Manager and click the toggle switch to enable external integration.  
![](images/image002-en.png)  
9. Start sample HTML.  
The following is when synchronizing parameters from nizima LIVE to Cubism Editor,  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_nizimaLIVE_to_CubismEditor.html  
The following is when synchronizing parameters from Cubism Editor to nizima LIVE,  
https://live2d-garage.github.io/CubismExternalAppPluginSamples/02_nizimaLIVEBridge/index_from_CubismEditor_to_nizimaLIVE.html  
10. Set the connection destination for each "Address" of nizima LIVE and Cubism Editor and click "Connect".  
![](images/image003.png)  
    - If a connection fails, a message will be displayed in each Connection Error Log.  
(When the connection destination settings are incorrect, when external linkage on the Cubism Editor side is not enabled, etc.)  
![](images/image004.png)  
11. Click the toggle switch for the external link displayed in nizima LIVE's Plug-in Manager to allow external link.  
![](images/image005-en.png)  
    - If you allow it, the "State" of nizima LIVE on the HTML side will become "Connected".  
![](images/image006.png)  
12. Confirm that "State" of Cubism Editor on the HTML side is "Connected",  
Check the "Permission" checkbox for the connected application in the external application linkage settings dialog of Cubism Editor.  
![](images/image007.png)  
13. When step 12 is performed, the “State” changes to “Connected and Synced” and synchronization of parameters starts.  
Click "Disconnect" to stop synchronization. Clicking this will stop synchronization and disconnect the connection between nizima LIVE and Cubism Editor.  
![](images/image008.png)  
When you start synchronizing parameters, a list of synchronized parameters, unsynchronized nizima LIVE parameters, and unsynchronized Cubism Editor parameters will be displayed.  
![](images/image009.png)  
14. Parameter synchronization can be temporarily stopped by clicking "Suspend".  
![](images/image010.png)  
15. When paused, "State" changes to "Suspend". Click "Resume" to restart synchronization.  
![](images/image011.png)  
