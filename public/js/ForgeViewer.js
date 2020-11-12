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

function launchViewer(urn) {
  var options = {
    env: 'AutodeskProduction',
    getAccessToken: getForgeToken
  };

  Autodesk.Viewing.Initializer(options, () => {
    var config3d = {
      extensions: ['Autodesk.Viewing.MarkupsCore', 'Autodesk.Viewing.MarkupsGui']
    };
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'), config3d);
    viewer.start();
    var documentId = 'urn:' + urn;
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
    viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged);
    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => { $("#toolbar-propertiesTool").click() })
  });
}

function onDocumentLoadSuccess(doc) {
  var viewables = doc.getRoot().getDefaultGeometry();
  viewer.loadDocumentNode(doc, viewables).then(i => {
    // documented loaded, any action?
    console.log(viewables)
    viewer.loadExtension('IconMarkupExtension', {
      button: {
        icon: 'fa-thermometer-half',
        tooltip: 'Show Temperature'
      },
      icons: [
        { dbId: 2215, label: '300&#176;C', css: 'temperatureBorder temperatureHigh fas fa-thermometer-full' },
      ],
      onClick: (id) => {
        viewers.select(id);
        viewers.utilities.fitToView();
        switch (id) {
          case 563:
            alert('Sensor offline');
        }
      }
    })
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
      console.log(data.name)
      // if (data.name.startsWith("Solid")) {
      //     var instanceTree = viewer.model.getData().instanceTree;
      //     var parentId = instanceTree.getNodeParentId(event.dbIdArray[0])
      //     viewer.select([parentId]);
      // }
    })
  }
}