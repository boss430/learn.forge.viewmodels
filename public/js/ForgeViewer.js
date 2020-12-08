﻿/////////////////////////////////////////////////////////////////////
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
      extensions: ['Autodesk.Viewing.MarkupsCore', 'Autodesk.Viewing.MarkupsGui', 'Autodesk.AEC.LevelsExtension']
    };
    viewer = new Autodesk.Viewing.GuiViewer3D(document.getElementById('forgeViewer'), config3d);
    viewer.start();
    var documentId = 'urn:' + urn;
    Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
    viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged);
    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => { $("#toolbar-propertiesTool").click() })
    // setupProfile();
  });
}

function onDocumentLoadSuccess(doc) {
  var viewables = doc.getRoot().getDefaultGeometry();
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function onGeoLoaded(_x) {
    viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged);
    loadEdit2D();
  });
  viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, getRemoteLevels);
  viewer.loadExtension('Autodesk.DocumentBrowser')
  viewer.loadExtension('Autodesk.LayerManager')
  viewer.loadExtension('Autodesk.GoHome')
  viewer.loadDocumentNode(doc, viewables).then(i => {
    // documented loaded, any action?
    // console.log(viewables)
    viewer.loadExtension('IconMarkupExtension', {
      button: {
        icon: 'fa-thermometer-half',
        tooltip: 'Show Temperature'
      },
      icons: [
        { dbId: 4515, label: 'CAR', css: 'temperatureBorder temperatureHigh fas fa-thermometer-full' },
        { dbId: 2215, label: 'Roof', css: 'temperatureBorder temperatureHigh fas fa-thermometer-full' },
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
  Autodesk.Viewing.Document.getAecModelData(doc.getRoot());
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
      console.log(`Actual name: ${data.name}\nExternal id: ${extId}\ndbId: ${data.dbId}`);
      updateSelection(data.dbId);
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
      url: 'api/pestimate/report/elevation',
      contentType: 'application/json',
      data: JSON.stringify({ 'urn': gUrn, 'elevation': levels }),
      success: function (res) {
        console.log(res)
      },
      error: function (err) {
        // console.log(err);
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
  if (id !== '' || !!id) {
    id = parseInt(id)
    viewer.select(parseInt(id));
    viewer.isolate([parseInt(id)])
    viewer.fitToView([id]);
  } else {
    console.log('Home')
    viewer.getExtension('Autodesk.GoHome').activate();
    viewer.showAll();
    viewer.clearSelection();
  }
}

function setupProfile() {
  const customProfileSettings = {
    settings: {
      reverseMouseZoomDir: true, // override existing
    }
  };
  const customProfile = new Autodesk.Viewing.Profile(customProfileSettings);
  // Updates viewer settings encapsulated witihn a Profile.
  // This method will also load and unload extensions referenced by the Profile.
  viewer.setProfile(customProfile);
}

function printFile() {
  viewer.getScreenShot(
    undefined
    , undefined
    , img => createPDF(img))
}

function createPDF(imgData) {
  var doc = new jspdf.jsPDF({
    orientation: 'landscape'
  })
  doc.setFontSize(40)
  doc.text(35, 25, 'ForgeViewer PDF report');
  doc.addImage(imgData, 'JPEG', 10, 40);
  doc.save('report-floor1.pdf')
}