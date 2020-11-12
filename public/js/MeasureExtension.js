function MeasureExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

MeasureExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
MeasureExtension.prototype.constructor = MeasureExtension;



Autodesk.Viewing.theExtensionManager.registerExtension('MeasureExtension', MeasureExtension);