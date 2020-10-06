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

var viewer;
var gUrn;

function launchViewer(urn) {
  var options = {
    env: 'AutodeskProduction',
    getAccessToken: getForgeToken
  };
  gUrn = urn;

  Autodesk.Viewing.Initializer(options, () => {
    var config3d = {
      extensions: ['Autodesk.Viewing.MarkupsCore', 'Autodesk.Viewing.MarkupsGui', 'ToolbarExtension']
    };
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'), config3d);
    viewer.start();
    var documentId = 'urn:' + urn;
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
    replaceSpinner();
  });
}

function onDocumentLoadSuccess(doc) {
  var viewables = doc.getRoot().getDefaultGeometry();
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function onGeoLoaded(_x) {
    viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged);
  });
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, getRemoteLevels);
  viewer.loadExtension('Autodesk.DocumentBrowser')
  viewer.loadExtension('Autodesk.LayerManager')
  viewer.loadDocumentNode(doc, viewables).then(i => {
    // documented loaded, any action?
  });
}

function onDocumentLoadFailure(viewerErrorCode) {
  console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
}

function getForgeToken(callback) {
  fetch('/api/forge/oauth/token').then(res => {
    res.json().then(data => {
      callback(data.access_token, data.expires_in);
    });
  });
}

function onSelectionChanged(event) {
  if (event.dbIdArray.length === 1) {
    viewer.getProperties(event.dbIdArray[0], function (data) {
      const extId = data.name.match(/\[(.*?)\]/g)[0].slice(1, -1);
      console.log(data.name, extId);
    })
  }
}

async function getRemoteLevels() {
  try {
    const aecData = await Autodesk.Viewing.Document.getAecModelData(viewer.model.getDocumentNode());
    if (!aecData.levels) return null;

    const levels = aecData.levels;
    levels.sort((a, b) => b.elevation - a.elevation);
    jQuery.post({
      url: window.location.protocol + '//' + window.location.hostname + ':3300/pestimate/report/elevation',
      contentType: 'application/json',
      data: JSON.stringify({ 'urn': gUrn, 'elevation': levels }),
      success: function (res) {
        console.log(res)
      },
      error: function (err) {
        console.log(err);
      }
    });
    return levels;
  } catch (error) {
    console.log(error)
    return 0;
  }
}

function replaceSpinner() {
  var spinners = document.getElementsByClassName("forge-spinner");
  if (spinners.length == 0) return;
  var spinner = spinners[0];
  spinner.classList.remove("forge-spinner");
  spinner.classList.add('lds-heart');
  spinner.innerHTML = '<div></div>';
}

function focusElement(id) {
  if (id !== '' || !id) {
    id = parseInt(id)
    viewer.select(parseInt(id));
    viewer.fitToView([id]);
  } else {
    viewer.fitToView();
  }
}