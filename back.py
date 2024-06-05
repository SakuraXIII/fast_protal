#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import socket
from pathlib import Path
import shutil
import mimetypes
import subprocess
import sys
from flask import (
    Flask,
    request,
    render_template,
    redirect,
    url_for,
    session,
    send_file,
)
from urllib.parse import unquote
import logging

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_PATH"] = 1024 * 1024 * 1024 * 5  # 指定最大文件大小，单位为字节
# Flask 的 Session 是通过加密后放到 Cookie 中的，
# 所以在使用 Session 模块时就一定要配置 SECRET_KEY 全局宏用于加密。
app.config["SECRET_KEY"] = "123456"
log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)

base_path = "F:\\fast_protal"

filter_files = ["desktop.ini"]


@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r


@app.route("/")
def index():
    try:
        name = request.args.get("name","")
        name = unquote(name)
        if name == "../":
            path = Path(session["current_path"]).parent
        elif name == ".":
            path = Path(base_path)
        else:
            path = Path(name)
        print(path)

        if not path.exists() or not (len(str(path)) >= len(base_path)):
            raise KeyError()
    except KeyError:
        name = ""
        session["current_path"] = base_path
        path = base_path
        return redirect(url_for("index", name="."), 302)

    session["current_path"] = str(path)

    if Path(path).is_dir():
        files = Path(path).iterdir()
        files = [file for file in files if file.name not in filter_files]
        sorted_file = sorted(files, key=lambda f: f.is_dir(), reverse=True)
        return render_template("index.html", files=sorted_file)
    if Path(path).is_file():
        # 不拼接文件名
        return redirect(url_for("get_file", path=path), 302)


@app.route("/file?<string:path>")
def get_file(path):
    mime_type, _ = mimetypes.guess_type(path)
    return send_file(path, mimetype=mime_type)


@app.route("/del")
def del_file():
    path = request.args.get("path","")
    path = unquote(path)
    path = Path(path)
    if path.exists():
        if path.is_file():
            path.unlink()
        elif path.is_dir():
            shutil.rmtree(path)

    return redirect(url_for("index", name=str(path.parent)), 301)


@app.route("/cmd")
def exec_cmd():
    path = Path(request.args.get("c"))
    print(path)
    result = subprocess.run(
        path, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="gbk"
    )
    if result.returncode == 1:
        return {
            "result": result.stdout,
            "code": result.returncode,
        }, 200
    else:
        return {
            "result": result.stderr,
            "code": result.returncode,
        }, 200


@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        file = request.files["file"]
        file_name = file.filename
        save_path = Path(session["current_path"], file_name)
        file_size = request.form["dztotalfilesize"]  # 文件总大小
        current_chunk = int(request.form["dzchunkindex"])  # 当前分块索引
        total_chunks = int(request.form["dztotalchunkcount"])  # 总块数
        if save_path.exists() and current_chunk == 0:
            return {"result": "已经存在该文件"}, 400
        with open(save_path, "ab") as f:
            f.seek(int(request.form["dzchunkbyteoffset"]))  # 字节偏移量
            f.write(file.stream.read())

        if current_chunk + 1 == total_chunks:  # 传输最后一个块
            if Path(save_path).stat().st_size != int(file_size):
                return {"result": "保存文件大小与实际大小不匹配"}, 500
            else:
                print(f"File {file.filename} has been uploaded successfully")
        else:
            print(f"文件 {file.filename}-{current_chunk + 1}/{total_chunks}")
        return {"result": "上传成功"}, 200

    except KeyError as ke:
        print(ke)
        return {"result": "error"}, 400
    except OSError as oe:
        print(oe)
        save_path.unlink() if save_path.exists() else ...
        return {"result": "文件保存读写错误"}, 400
    except Exception as e:
        print(e)
        save_path.unlink() if save_path.exists() else ...
        return {"result": "error"}, 400


if __name__ == "__main__":
    # 函数 gethostname() 返回当前正在执行 Python 的系统主机名
    cmd_params = sys.argv[1:]
    if len(cmd_params) > 0:
        if (argv_path := Path(cmd_params[0])).exists():
            if argv_path.is_dir():
                base_path = str(argv_path)
            else:
                base_path = str(argv_path.parent)

    ip_list = socket.gethostbyname_ex(socket.gethostname())[
        -1
    ]  # ('hostname', [], [ip list])
    print("http://127.0.0.1:5000/")
    for ip in ip_list:
        print("http://" + ip + ":5000/")

    if Path(base_path).exists():
        print(f"监视目录为: {base_path}")
        app.run(debug=False, host="0.0.0.0")  # 默认端口 port=5000
    else:
        raise FileNotFoundError(f"没有该目录: {base_path}")
