//时间格式转换：
function time_format(s) {
  var t;
  if (s > -1) {
    var hour = Math.floor(s / 3600);
    var min = Math.floor(s / 60) % 60;
    var sec = s % 60;
    var day = parseInt(hour / 24);
    if (day > 0) {
      hour = hour - 24 * day;
      t = day + "day " + hour + ":";
    } else t = hour + ":";
    if (min < 10) {
      t += "0";
    }
    t += min + ":";
    if (sec < 10) {
      t += "0";
    }
    t += sec;
  }
  return t;
}

Dropzone.autoDiscover = false; //取消自动发现
var myDropzone = new Dropzone("#dropfile", {
  url: "/upload",
  method: "post",
  paramName: "file",
  uploadMultiple: false, // uploadMultiple 与 chunking 不能共存
  filesizeBase: 1024, // 1000 还是 1024 作为基数单位
  chunking: true,
  forceChunking: true,
  chunkSize: 1024 * 1024 * 20, // 20MB
  maxFilesize: 1024 * 1024 * 1024 * 10, // 最大10GB文件
  autoProcessQueue: false, // 拖入文件立即自动上传
  parallelUploads: 1,
  dictDefaultMessage: "拖动文件至此或者点击上传",
  //dictMaxFilesExceeded: "您最多只能上传1个文件！",
  dictResponseError: "文件上传失败!",
  //dictInvalidFileType: "文件类型只能是*.jpg,*.gif,*.png,*.jpeg。",
  dictFallbackMessage: "浏览器不受支持",
  dictFileTooBig: "文件过大上传文件最大支持.",
  dictRemoveFile: "删除",
  dictCancelUpload: "取消",
  previewTemplate: `<div class="dz-file-preview" style="margin: 0.5em 2em;">
      <button type="button" class=" btn btn-primary position-relative" data-dz-remove>
          <div class="dz-filename">
              <span data-dz-name></span>
              <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" data-dz-size></span>
          </div>
      </button>
  </div>`,
  previewsContainer: "div.preview-container",
  init: function () {
    var start = 0;
    console.log("init");
    document.querySelector("#submit_file").addEventListener("click", () => {
      if (this.getAcceptedFiles().length !== 0) {
        this.processQueue();
        start = performance.now();
      }
    });
    this.on("addedfile", function (file) {
      document.querySelector("#submit_file").removeAttribute("disabled");
      document.querySelector(".progress-outside").style.opacity = 0;
      document.querySelector(".progress-inner").style.width = 0 + "%";
      document.querySelector(".progress-inner").innerHTML = 0 + "%";
    });
    this.on("removedfile", function (file) {
      // console.log(this.getAcceptedFiles())
      // console.log(this.getRejectedFiles())
      // console.log(this.getQueuedFiles())
      // console.log(this.getUploadingFiles())
      if (this.getAcceptedFiles().length == 0) {
        document.querySelector("#submit_file").setAttribute("disabled", true);
      }
    });
    this.on("uploadprogress", function (file, progress, sentSize) {
      var duration = (performance.now() - start) / 1000; // s
      document.querySelector(".progress-outside").style.opacity = 100;
      document.querySelector(".progress-inner").style.width = progress + "%";
      document.querySelector(".progress-inner").innerHTML = parseInt(progress) + "%";
      var remain;
      var speed;
      var sentKb = sentSize / 1024;
      var totalKb = file.size / 1024;
      var sentMb = sentKb / 1024;
      var totalMb = totalKb / 1024;
      if (sentKb <= 1024) {
        speed = (parseFloat(sentKb) / duration).toFixed(2) + " KB/s";
        remain = (totalKb - sentKb) / parseFloat(speed);
      } else {
        speed = (parseFloat(sentMb) / duration).toFixed(2) + " MB/s";
        remain = (totalMb - sentMb) / parseFloat(speed);
      }
      document.querySelector("span.upload-speed").innerHTML = speed ?? "0 KB/s";
      document.querySelector("span.upload-remain").innerHTML = time_format(parseInt(remain));
      if (progress >= 100) {
        console.log("finished");
        document.querySelector("span.upload-remain").innerHTML = "0:00:00s";
        document.querySelector("span.upload-speed").innerHTML = "0 KB/s";
      }
    });
    this.on("success", function (file, callback) {
      this.removeFile(file);
      if (this.getQueuedFiles().length != 0) {
        this.processQueue();
        start = performance.now();
      }
    });
    this.on("queuecomplete", () => {
      // 队列中的所有文件上传完成时。
      console.log("hh");
      setTimeout(() => {
        location.reload();
      }, 2000);
    });
    this.on("error", function (file, err_obj_or_msg) {
      // 上传失败触发的事件
      console.log(file, err_obj_or_msg);
      if (err_obj_or_msg.code != 111 && err_obj_or_msg.result != "文件已经存在") {
        document.querySelector(".progress-inner").classList.add("bg-danger");
        document.querySelector(".progress-inner").style.width = 100 + "%";
        document.querySelector(".progress-inner").innerHTML = err_obj_or_msg?.result ?? err_obj_or_msg;
        const newElement = document.createElement("div");
        newElement.textContent = file.name + " 上传失败 " + err_obj_or_msg?.result ?? err_obj_or_msg;
        newElement.className = "alert alert-danger";
        document.querySelector("#upload-file").appendChild(newElement);
      }
      this.removeFile(file);
      if (this.getQueuedFiles().length != 0) {
        this.processQueue();
        start = performance.now();
      }
    });
  },
});

window.addEventListener('beforeunload', function (e) {
  e = e || window.event;
  if (e) {
    e.returnValue = '关闭提示';
  }

  // Chrome, Safari, Firefox 4+, Opera 12+ , IE 9+
  return '';

})

document.querySelector("#cmd-btn").addEventListener("click", () => {
  cmd = document.querySelector("#cmd").value;
  if (cmd) {
    fetch("/cmd?c=" + cmd)
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        document.querySelector("#cmd-result").innerHTML = "\n" + data.result;
      })
      .catch((err) => {
        document.querySelector("#cmd-result").innerHTML = "错误 " + err;
      });
  } else {
    document.querySelector("#cmd-result").innerHTML = "";
  }
});
