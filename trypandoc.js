"use strict";

// reset params to defaults
function resetParams() {
  params.text = '';
  params.to = 'html5';
  params.from = 'markdown';
  params.standalone = false;
  params["embed-resources"] = false;
  params["table-of-contents"] = false;
  params["number-sections"] = false;
  params.citeproc = false;
  params["html-math-method"] = "plain";
  params.wrap = "auto";
  params["highlight-style"] = null;
  params.files = {};
  params.template = null;
};

var params = {};

function clearText() {
  params.text = '';
  document.getElementById("downloadinput").innerHTML = "";
  document.getElementById("text").style.display = "block";
  document.getElementById("text").value = '';
}

const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

function isBase64(s) {
  return (s.length > 0 && base64regex.test(s))
}


const extensions =
  { asciidoc: "adoc",
    asciidoctor: "adoc",
    beamer: "tex",
    biblatex: "bib",
    bibtex: "bib",
    commonmark: "md",
    commonmark_x: "md",
    context: "ctx",
    csljson: "json",
    docbook: "xml",
    docbook4: "xml",
    docbook5: "xml",
    docx: "docx",
    dokuwiki: "wiki",
    dzslides: "html",
    epub: "epub",
    epub2: "epub",
    epub3: "epub",
    fb2: "fb2",
    gfm: "md",
    haddock: "hs",
    html: "html",
    html4: "html",
    html5: "html",
    icml: "icml",
    ipynb: "ipynb",
    jats: "xml",
    jats_archiving: "xml",
    jats_articleauthoring: "xml",
    jats_publishing: "xml",
    jira: "xml",
    json: "json",
    latex: "tex",
    man: "1",
    markdown: "md",
    markdown_github: "md",
    markdown_mmd: "md",
    markdown_phpextra: "md",
    markdown_strict: "md",
    markua: "md",
    mediawiki: "wiki",
    ms: "ms",
    muse: "muse",
    native: "native",
    odt: "odt",
    opendocument: "xml",
    opml: "opml",
    org: "org",
    plain: "txt",
    pptx: "pptx",
    revealjs: "html",
    rst: "rst",
    rtf: "rtf",
    s5: "html",
    slideous: "html",
    slidy: "html",
    tei: "xml",
    texinfo: "texi",
    textile: "txt",
    xwiki: "wiki",
    zimwiki: "wiki"
  }

function downloadLink(name, contents) {
  let downloadlink = document.createElement("a");
  downloadlink.setAttribute("download", name);
  downloadlink.setAttribute("class", "download-link");
  downloadlink.setAttribute("href", 'data:application/octet-stream;base64,' + contents);
  downloadlink.textContent = 'download ' + name;
  return downloadlink;
}

function addFile(name, contents, isbase64) {
  params.files[name] = contents;
  let filesDiv = document.getElementById("files");
  let fileDiv = document.createElement("div");
  fileDiv.classList.add("file");
  let title = document.createElement("div");
  title.classList.add("title");
  let removeButton = document.createElement("button");
  removeButton.textContent = "Remove";
  removeButton.onclick = (e) => {
    delete params.files[name];
    e.target.parentElement.parentElement.remove();
  }
  let filename = document.createElement("span");
  filename.classList.add("filename");
  filename.textContent = name;
  title.appendChild(filename);
  title.appendChild(removeButton);
  fileDiv.appendChild(title);
  if (isbase64) {
    fileDiv.appendChild(downloadLink(name, contents));
  } else {
    let textarea = document.createElement("textarea");
    textarea.onchange = (e) => {
      params.files[name] = e.target.value;
    }
    textarea.textContent = contents;
    fileDiv.appendChild(textarea);
  }
  filesDiv.appendChild(fileDiv);
}

function updateLinks(jsonparams) {
  let href = window.location.href;
  const URLparams = new URLSearchParams([["params", jsonparams]]);
  let permalink = href.replace(/([?].*)?$/,"?" + URLparams);
  document.getElementById("permalink").href = permalink;
  document.getElementById("params-as-json").href = "data:application/json;charset=UTF-8," + encodeURIComponent(jsonparams);
}

function paramsFromURL() {
  if (window.location.search.length > 0) {
    const query = new URLSearchParams(window.location.search);
    const rawparams = query.get("params");
    params = JSON.parse(rawparams);
  }
}

function handleErrors(response) {
    let errs = document.getElementById("errors");
    if (!response.ok) {
      errs.textContent = "Conversion failed, status = " + response.status;
      errs.style.display = "block";
    }
    if (response.status == 503) {
      errs.textContent += "  Timed out.";
    }
    return response;
}

function addMessage(msg) {
  let msgdiv = document.createElement("div");
  msgdiv.setAttribute("class", "message " + msg.verbosity);
  msgdiv.textContent = msg.message;
  document.getElementById("messages").appendChild(msgdiv);
}

function convert() {
    document.getElementById("results").innerHTML = "";
    document.getElementById("errors").innerHTML = "";
    document.getElementById("messages").innerHTML = "";
    document.getElementById("downloadresult").replaceChildren();
    console.log(params);

    let mm = params["html-math-method"];
    let mathopts = mm == "plain" ? "" : (" --" + mm)
    let commandString = "pandoc"
      + " --from " + params.from + " --to " + params.to
      + (params.standalone ? " --standalone" : "")
      + (params["embed-resources"] ? " --embed-resources" : "")
      + (params["table-of-contents"] ? " --toc" : "")
      + (params["number-sections"] ? " --number-sections" : "")
      + (params.template ? " --template=custom.tpl" : "")
      + (params.citeproc ? " --citeproc" : "")
      + (params.wrap == "auto" ? "" : (" --wrap=" +  params.wrap))
      + (params["highlight-style"] == null ? " --no-highlight" :
              (params["highlight-style"] == "pygments" ? "" :
                 " --highlight-style=" +  params["highlight-style"]))
      + mathopts ;
    document.getElementById("command").textContent = commandString;
    let body = JSON.stringify(params);
    updateLinks(body);
    fetch("/cgi-bin/pandoc-server.cgi", {
      method: "POST",
      headers: {"Content-Type": "application/json",
                "Accept": "application/json"},
      body: body
     })
    .then(handleErrors)
    .then(response => response.json())
    .then(result => {
       if (result.error) {
         let errs = document.getElementById("errors");
         let err = document.createElement("div");
         err.setAttribute("class", "error");
         err.textContent = result.error;
         errs.appendChild(err);

       } else { // success
         if (result.base64) {
           document.getElementById("downloadresult").replaceChildren(
              downloadLink("trypandoc." + extensions[params.to], result.output));
         } else {
           document.getElementById("results").textContent += result.output;
           if (params.standalone) {
             let dlink = document.createElement("a");
             let name = "trypandoc." + extensions[params.to];
             dlink.setAttribute("download", name);
             dlink.setAttribute("class", "download-link");
             dlink.setAttribute("href", 'data:text/plain;charset=UTF-8,' + encodeURIComponent(result.output));
             dlink.textContent = 'download ' + name;
             document.getElementById("downloadresult").replaceChildren(dlink);
           }
         }
         result.messages.forEach(addMessage);
       }

    });
}

function setFormFromParams() {
    let inputtext = document.getElementById("text");
    let downloadinput = document.getElementById("downloadinput");
    let isbinary = isBase64(params.text);
    if (isbinary) {
      inputtext.style.display = "none";
      downloadinput.replaceChildren(downloadLink("input." + params.from, params.text));
    } else {
      inputtext.value = params.text;
      inputtext.style.display = "block";
      downloadinput.innerHTML = "";
    }
    if (params.template) {
      document.getElementById("templatetext").value = params.template;
      document.getElementById("template").value = "custom";
      document.getElementById("customtemplate").style.display = "block";
    } else {
      document.getElementById("templatetext").value = "";
      document.getElementById("template").value = "default";
      document.getElementById("customtemplate").style.display = "none";
    }
    document.getElementById("from").value = params.from;
    document.getElementById("to").value = params.to;
    document.getElementById("standalone").checked = params.standalone;
    document.getElementById("embed-resources").checked = params["embed-resources"];
    document.getElementById("table-of-contents").checked = params["table-of-contents"];
    document.getElementById("number-sections").checked = params["number-sections"];
    document.getElementById("citeproc").checked = params.citeproc;
    document.getElementById("html-math-method").value = params["html-math-method"];
    document.getElementById("wrap").value = params.wrap;
    document.getElementById("highlight-style").value = params["highlight-style"] || "";

    // update disabled status of other buttons that depend on 'to':
    document.getElementById("to").dispatchEvent(new Event("change"));

    const files = document.querySelectorAll(".file");
    files.forEach(file => {
      file.remove();
    });
    for (const filename in params.files) {
      addFile(filename, params.files[filename], isBase64(params.files[filename]));
    }
}

// callback takes two arguments:  the string text and a boolean
// which is true if the string is base64-encoded binary data
function readFile(file, callback) {
    if (file.size > 200000) {
      alert("File exceeds 200KB size limit: " + file.name);
      throw("File exceeds 200KB size limit: " + file.name);
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      let result = reader.result;
      // check for valid UTF-8
      let invalidUtf8 = result.match(/[\uFFFD]/);
      if (invalidUtf8) {
        // if not valid UTF-8, treat as binary and base64 encode it
        const base64reader = new FileReader();
        base64reader.onloadend = () => {
          const base64string = base64reader.result
           .replace('data:', '')
           .replace(/^.+,/, '');
          callback(base64string, true);
        }
        base64reader.readAsDataURL(file);
      } else {
        callback(result, false);
      }
    }
    reader.readAsText(file);
}

function enableControlIf(ident, enable) {
  let ctrl = document.getElementById(ident);
  ctrl.disabled = !enable;
  let par = ctrl.parentElement;
  if (par.nodeName == "LABEL") {
    if (enable) {
      par.classList.remove("disabled");
    } else {
      par.classList.add("disabled");
    }
  }
}

(function() {
    resetParams();
    paramsFromURL();
    setFormFromParams();

    document.getElementById("convert").onclick = convert;
    document.getElementById("from").onchange = (e) => {
      params.from = e.target.value;
      convert();
    }
    document.getElementById("to").onchange = (e) => {
      params.to = e.target.value;
      enableControlIf("number-sections", (params.to.match(/html|slidy|slideous|s5|dzslides|reveal|latex|context|docx|ms|epub/) != null));
      enableControlIf("html-math-method", (params.to.match(/html|slidy|slideous|s5|dzslides|reveal|docbook|jats|epub/) != null));
      enableControlIf("highlight-style", (params.to.match(/html|slidy|slideous|s5|dzslides|reveal|docx|latex|ms/) != null));
      convert();
    }
    document.getElementById("text").oninput = (e) => {
      params.text = e.target.value;
    }
    // document.getElementById("text").onblur = (e) => {
    //   convert();
    // }
    document.getElementById("standalone").onchange = (e) => {
      params.standalone = e.target.checked;
      convert();
    }
    document.getElementById("embed-resources").onchange = (e) => {
      params["embed-resources"] = e.target.checked;
      convert();
    }
    document.getElementById("table-of-contents").onchange = (e) => {
      params["table-of-contents"] = e.target.checked;
      convert();
    }
    document.getElementById("number-sections").onchange = (e) => {
      params["number-sections"] = e.target.checked;
      convert();
    }
    document.getElementById("citeproc").onchange = (e) => {
      params.citeproc = e.target.checked;
      convert();
    }
    document.getElementById("html-math-method").onchange = (e) => {
      params["html-math-method"] = e.target.value;
      convert();
    }
    document.getElementById("wrap").onchange = (e) => {
      params.wrap = e.target.value;
      convert();
    }
    document.getElementById("highlight-style").onchange = (e) => {
      if (e.target.value == "") {
        params["highlight-style"] = null;
      } else {
        params["highlight-style"] = e.target.value;
      }
      convert();
    }
    document.getElementById("template").onchange = (e) => {
      if (e.target.value == "custom") {
        document.getElementById("customtemplate").style.display = "block";
        params.template = document.getElementById("templatetext").value;
      } else {
        params.template = null;
        document.getElementById("customtemplate").style.display = "none";
      }
    }
    document.getElementById("templatetext").onchange = (e) => {
      params.template = e.target.value;
    }
    document.getElementById("examples").onchange = (e) => {
      let file = e.target.value;
      let headers = new Headers();
      headers.append('pragma', 'no-cache');
      headers.append('cache-control', 'no-cache');
      fetch("./examples/" + file, { method: 'POST',
                                    headers: headers })
       .then(response => response.json())
       .then(newparams => {
          resetParams();
          for (const key in newparams) {
            params[key] = newparams[key]; // allow defaults
          };
          setFormFromParams();
          convert();
       });
    }

    const fileInput = document.getElementById('loadfile');

    // Listen for the change event so we can capture the file
    fileInput.addEventListener('change', (e) => {
      // Get a reference to the file
      let inputtext = document.getElementById("text");
      let downloadinput = document.getElementById("downloadinput");
      const file = e.target.files[0];
      readFile(file, (s, isbase64) => {
        params.text = s;
        if (isbase64) {
          let binaryfmt = file.name.match(/\.(docx|odt|epub|pptx)$/);
          console.log(binaryfmt);
          if (binaryfmt) {
            params.from = binaryfmt[1];
            document.getElementById("from").value = params.from;
          }
          inputtext.style.display = "none";
          downloadinput.replaceChildren(downloadLink(file.name, s));
        } else {
          inputtext.value = s;
          inputtext.style.display = "block";
          downloadinput.innerHTML = "";
        }
      });
    });

    const addfileButton = document.getElementById("addfile");
    addfileButton.addEventListener('change', (e) => {
      // Get a reference to the file
      const file = e.target.files[0];
      readFile(file, (s, isbase64) => {
        addFile(file.name, s, isbase64);
      });
    });

    window.addEventListener('keydown', function handle_keydown(e) {
      // Submit on Ctrl/Cmd+Enter
      if (e.key === 'Enter' && (navigator.platform === 'MacIntel' ? e.metaKey : e.ctrlKey)) {
        convert();
      }
    });

    fetch("/cgi-bin/pandoc-server.cgi/version")
       .then(handleErrors)
       .then(response => response.text())
       .then(restext =>
           document.getElementById("version").textContent = restext
         );

    convert();

})();

