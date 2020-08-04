function NewExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

NewExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
NewExtension.prototype.constructor = NewExtension;

NewExtension.prototype.load = function () {
    if (this.viewer.toolbar) {
        // Toolbar is already available, create the UI
        this.onToolbarCreated();
    } else {
        // Toolbar hasn't been created yet, wait until we get notification of its creation
        this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreated.bind(this));
    }
    // Set background environment to "Infinity Pool"
    // and make sure the environment background texture is visible
    this.viewer.setLightPreset(6);
    this.viewer.setEnvMapBackground(true);

    // Ensure the model is centered
    // this.viewer.fitToView();

    return true;
};

NewExtension.prototype.onToolbarCreated = function (toolbar) {
    this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, this.onToolbarCreated.bind(this));

    var viewer = this.viewer;

    // Button 1
    var button1 = new Autodesk.Viewing.UI.Button('show-env-bg-button');
    button1.onClick = function (e) {
        viewer.setEnvMapBackground(true);
    };
    button1.addClass('show-env-bg-button');
    button1.setToolTip('Show Environment');

    // Button 2
    var button2 = new Autodesk.Viewing.UI.Button('hide-env-bg-button');
    button2.onClick = function (e) {
        viewer.setEnvMapBackground(false);
    };
    button2.addClass('hide-env-bg-button');
    button2.setToolTip('Hide Environment');

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('my-custom-toolbar');
    this.subToolbar.addControl(button1);
    this.subToolbar.addControl(button2);

    viewer.toolbar.addControl(this.subToolbar);
};


NewExtension.prototype.unload = function () {
    // nothing yet
    if (this.subToolbar) {
        this.viewer.toolbar.removeControl(this.subToolbar);
        this.subToolbar = null;
    }
};

Autodesk.Viewing.theExtensionManager.registerExtension('NewExtension', NewExtension);