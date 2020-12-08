var g_typename = 'F1';
var g_layer = 'FOOTING';
var g_color = '#FF0000';
var G_PtLocation = { x: 0, y: 0 }; // use in click and get postion to do next

function setPESCount(tp, gl, gc) {
    g_typename = tp;
    g_layer = gl;
    g_color = gc;
}
function dblclickEvent(e) {
    console.log(e);
    var pt = changeClientPos2World(e.clientX, e.clientY);
    console.log(pt);
    createPesTextMark(g_typename, g_layer, g_color, pt.x, pt.y);
}
function addDblClickMark() {
    // snap will translate to coordinate
    viewer.canvas.addEventListener('dblclick', dblclickEvent);
    //do stuff here
}
// about snap 
function changeClientPos2World(x, y) {
    var nw = viewer.clientToWorld(x, y, false, false)
    return nw.point;
}
function createPesTextMark(typename, layer, color, co_x, co_y, data) {
    var markup = viewer.getExtension("Autodesk.Viewing.MarkupsCore");
    let MarkupsCore = Autodesk.Viewing.Extensions.Markups.Core;
    /*if (markup.activeLayer != '') { // will recursive create
      createLayer(layer);
      markup.enterEditMode(layer);
    } else {
      markup.enterEditMode();
    }*/

    let text = new MarkupsCore.MarkupText(markup.nextId, markup, 3);
    markup.addMarkup(text);
    text.setSize({ x: co_x, y: co_y }, 3, 2);
    text.setText(typename);
    text.style['font-size'] = 0.2;
    text.style['stroke-color'] = color;
    text.updateStyle(true);
    text.pesData = data;
    text.layer = layer;
    // markup.leaveEditMode()
}