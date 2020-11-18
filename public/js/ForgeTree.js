/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

$(document).ready(function () {
  prepareAppBucketTree();
  $('#refreshBuckets').click(function () {
    $('#appBuckets').jstree(true).refresh();
  });

  $('#createNewBucket').click(function () {
    createNewBucket();
  });

  $('#createBucketModal').on('shown.bs.modal', function () {
    $("#newBucketKey").focus();
  })

  $('#hiddenUploadField').change(function () {
    var node = $('#appBuckets').jstree(true).get_selected(true)[0];
    var _this = this;
    if (_this.files.length == 0) return;
    var file = _this.files[0];
    switch (node.type) {
      case 'bucket':
        var formData = new FormData();
        formData.append('fileToUpload', file);
        formData.append('bucketKey', node.id);

        $.ajax({
          url: window.location.protocol + '//' + window.location.hostname + ':3300/forge/oss/objects',
          data: formData,
          processData: false,
          contentType: false,
          type: 'POST',
          success: function (data) {
            $('#appBuckets').jstree(true).refresh_node(node);
            _this.value = '';
          }
        });
        break;
    }
  });
});

function createNewBucket() {
  var bucketKey = $('#newBucketKey').val();
  var policyKey = $('#newBucketPolicyKey').val();
  if (!RegExp('([A-Z])').test(bucketKey)) {
    jQuery.post({
      url: 'api/forge/oss/buckets',
      contentType: 'application/json',
      data: JSON.stringify({ 'bucketKey': bucketKey, 'policyKey': policyKey }),
      success: function (res) {
        $('#appBuckets').jstree(true).refresh();
        $('#createBucketModal').modal('toggle');
      },
      error: function (err) {
        if (err.status == 409)
          alert('Bucket already exists - 409: Duplicated')
        console.log(err);
      }
    });
  } else {
    alert('Uppercase is prohibit!!');
  }
}

function prepareAppBucketTree() {
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('user');
  $('#appBuckets').jstree({
    'core': {
      'themes': { "icons": true },
      'data': {
        "url": `/api/forge/oss/buckets`,
        "dataType": "json",
        'multiple': false,
        "data": (node) => {
          return { "id": node.id, "user": user };
        }
      }
    },
    'types': {
      'default': {
        'icon': 'glyphicon glyphicon-question-sign'
      },
      '#': {
        'icon': 'glyphicon glyphicon-cloud'
      },
      'bucket': {
        'icon': 'glyphicon glyphicon-folder-open'
      },
      'object': {
        'icon': 'glyphicon glyphicon-file'
      }
    },
    "plugins": ["types", "state", "sort", "contextmenu"],
    contextmenu: { items: autodeskCustomMenu }
  }).on('loaded.jstree', function () {
    $('#appBuckets').jstree('open_all');
  }).bind("activate_node.jstree",
    debounce(function (evt, data) {
      if (data != null && data.node != null && data.node.type == 'object') {
        viewModel(data.node.id);
      }
    }, 1000)
  );
}

const debounce = (func, delay) => {
  let inDebounce
  return function () {
    const context = this
    const args = arguments
    clearTimeout(inDebounce)
    inDebounce = setTimeout(() => func.apply(context, args), delay)
  }
}

function viewModel(urn) {
  $("#forgeViewer").empty();
  getForgeToken(function (access_token) {
    jQuery.ajax({
      url: 'https://developer.api.autodesk.com/modelderivative/v2/designdata/' + urn + '/manifest',
      headers: { 'Authorization': 'Bearer ' + access_token },
      success: function (res) {
        if (res.progress === 'success' || res.progress === 'complete') launchViewer(urn);
        else $("#forgeViewer").html(`The translation job still running: ${res.progress}. Please try again in a moment.
                                    <button class="btn btn-xs btn-info" onclick="viewModel('${urn}')">Refresh</button>`);
      },
      error: function (err) {
        var msgButton = 'This file is not translated yet! ' +
          '<button class="btn btn-xs btn-info" onclick="translateObject()">Start translation</button>' + ' Or ' +
          '<button class="btn btn-xs btn-info" onclick="translateObjectAsZip()">Start translation as zip</button>';
        $("#forgeViewer").html(msgButton);
      }
    });
  })
}

function autodeskCustomMenu(autodeskNode) {
  var items;

  switch (autodeskNode.type) {
    case "bucket":
      items = {
        uploadFile: {
          label: "Upload file",
          action: function () {
            uploadFile();
          },
          icon: 'glyphicon glyphicon-cloud-upload'
        },
        deleteBucket: {
          label: "Delete Bucket",
          action: function () {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            deleteBucket(treeNode);
          },
          icon: 'glyphicon glyphicon-trash'
        }
      };
      break;
    case "object":
      items = {
        translateFile: {
          label: "Translate",
          action: function () {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            translateObject(treeNode);
          },
          icon: 'glyphicon glyphicon-eye-open'
        },
        translateFileAsZip: {
          label: "Translate as Zip",
          action: function () {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            translateObjectAsZip(treeNode);
          },
          icon: 'glyphicon glyphicon-eye-open'
        },
        extractFile: {
          label: "Extract metadata",
          action: () => {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            extractObject(treeNode)
          },
          icon: 'glyphicon glyphicon glyphicon-new-window'
        },
        infoFile: {
          label: "Info",
          action: () => {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            console.log(treeNode.id);
          },
          icon: 'glyphicon glyphicon-info-sign'
        },
        downloadFile: {
          label: "Download",
          action: () => {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            downloadObject(treeNode);
          },
          icon: 'glyphicon glyphicon glyphicon-download-alt'
        },
        deleteFile: {
          label: "Delete",
          action: () => {
            var treeNode = $('#appBuckets').jstree(true).get_selected(true)[0];
            deleteObject(treeNode);
          },
          icon: 'glyphicon glyphicon-trash'
        }
      };
      break;
  }

  return items;
}

function uploadFile() {
  $('#hiddenUploadField').click();
}

function translateObject(node) {
  $("#forgeViewer").empty();
  if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
  var bucketKey = node.parents[0];
  var objectName = node.id;
  jQuery.post({
    url: 'api/forge/derivative/jobs',
    contentType: 'application/json',
    data: JSON.stringify({ 'bucketKey': bucketKey, 'fileName': objectName }),
    success: () => {
      $('#appBuckets').jstree(true).refresh();
    }
  })
}

function translateObjectAsZip(node) {
  $("#forgeViewer").empty();
  if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
  var objectName = node.id;
  var rootFilename = prompt("Please enter your root filename?\n(with file extension!! e.g. Main.dwg, AR.rvt etc.)");
  if (rootFilename !== null) {
    jQuery.post({
      url: 'api/forge/derivative/zipJobs',
      contentType: 'application/json',
      data: JSON.stringify({ 'fileName': objectName, 'rootFilename': rootFilename.trim() }),
      success: () => {
        $('#appBuckets').jstree(true).refresh();
      }
    })
  }
}

function deleteObject(node) {
  if (deletePrompt()) {
    $("#forgeViewer").empty();
    var bucketKey = node.parents[0];
    var objectName = node.text;
    jQuery.post({
      url: 'api/forge/oss/deleteObjects',
      contentType: 'application/json',
      data: JSON.stringify({ 'bucketKey': bucketKey, 'fileName': objectName }),
      success: () => {
        $('#appBuckets').jstree(true).refresh();
      }
    })
  }
}

function deleteBucket(node) {
  if (deletePrompt()) {
    $("#forgeViewer").empty();
    var bucketKey = node.id;
    jQuery.post({
      url: 'api/forge/oss/deleteBuckets',
      contentType: 'application/json',
      data: JSON.stringify({ 'bucketKey': bucketKey }),
      success: () => {
        $('#appBuckets').jstree(true).refresh();
      }
    })
  }
}

function deletePrompt(txt = 'Are you sure?') {
  var answer = confirm(txt);
  return answer
}

function extractObject(node) {
  $("#forgeViewer").empty();
  if (node == null) node = $('#appBuckets').jstree(true).get_selected(true)[0];
  var objectKey = node.id;
  jQuery.post({
    url: 'api/pestimate/report/json',
    contentType: 'application/json',
    data: JSON.stringify({ 'urn': objectKey, 'forceGet': "true" }),
    success: function (res) {
      $("#forgeViewer").html(`
      <div class="alert alert-success alert-dismissible" role="alert" style="margin-left: 325px">
        <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        ${res.status}
      </div>
      `);
    },
    error: function (res) {
      $("#forgeViewer").html(`
      <div class="alert alert-warning alert-dismissible" role="alert" style="margin-left: 325px">
        <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        ${res.status}
      </div>
      `);
    }
  });
}

function downloadObject(node) {
  var objectKey = node.id;
  var link = document.createElement('a');
  link.href = window.location.protocol + '//' + window.location.hostname + `:3300/forge/oss/download?urn=${objectKey}`;
  link.id = 'download'
  link.download = ''
  link.click();
}