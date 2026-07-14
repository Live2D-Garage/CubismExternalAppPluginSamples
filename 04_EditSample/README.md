# 04_EditSample

## 説明

Cubism5.4alpha の編集APIのサンプルです。

**虹色まお** モデルのパラメータグループ(ID:ParamGroupFace)の名前を変更します。

モデルファイルは以下よりダウンロードください。

### Live2D サンプルデータ集
https://www.live2d.com/learn/sample/

https://www.live2d.com/learn/sample/niziiro-mao/

## 使用方法

実行にはPythonが必要です。
あらかじめインストールしてください。

1. CubismEditor起動し、**虹色まお** のモデルファイルを読み込む。
2. 必要なライブラリを`pip`コマンドでインストールする。
```
py -m pip install -r requirements.txt
```
3. Pythonのサンプルコードを起動する。
```
py demo.py
```
4. Pythonは許可待ち状態になります。
5. 外部アプリ連携のダイアログから、許可、編集を有効にする。
6. パラメータグループの名前が`Edited Face Group`に変更される。


---

## Description

This is a sample using the Cubism 5.4 alpha editing API.

It renames the parameter group (ID: ParamGroupFace) for the **Niziiro Mao** model.

Please download the model file from the link below.

### Live2D Sample Data Collection
https://www.live2d.com/en/learn/sample/

https://www.live2d.com/en/learn/sample/niziiro-mao/

## How to use

Python is required to run this script. 
Please install it in advance.

1. Launch Cubism Editor and load the **Niziiro Mao** model file.
2. Install the requirement libraries using the `pip` command.
```
py -m pip install -r requirements.txt
```
3. Run the Python sample code.
```
py demo.py
```
4. The Python script will enter a waiting state for authorization.
5. Grant permission and enable editing via the external application integration dialog.
6. The parameter group name will be changed to `Edited Face Group`.
