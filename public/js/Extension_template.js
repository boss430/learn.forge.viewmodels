//Extension Constructor
function NameOfExtension(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);
}

NameOfExtension.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
NameOfExtension.prototype.constructor = NameOfExtension;
//End of Entension Constructor

//Extension code area

//Extension register
Autodesk.Viewing.theExtensionManager.registerExtension('NameOfExtensionToBeUsed', NameOfExtension);