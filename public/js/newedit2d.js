var edit2dContext = {
  core: undefined,
  layer: undefined,
  gizmolayer: undefined,
  undostack: undefined,
  selection: undefined,
  snapper: undefined
};
var edit2d, edit2dTools;

async function loadEdit2D() {
  const edit2dOption = {
    // If true, PolygonTool will create Paths instead of just Polygons. This allows to change segments to arcs.
    enableArcs: true
  }
  edit2d = await viewer.loadExtension('Autodesk.Edit2D', edit2dOption);
  edit2d.registerDefaultTools();
  const ctx = edit2d.defaultContext;
  edit2dContext = {
    core: ctx,
    layer: ctx.layer,// {EditLayer} Edit layer containing your shapes
    gizmoLayer: ctx.gizmoLayer,// {EditLayer} An additional layer used by tools to display temporary shapes (e.g. dashed lines for snapping etc.)
    undoStack: ctx.undoStack,// {UndoStack} Manages all modifications and tracks undo/redo history
    selection: ctx.selection,// {Selection} Controls selection and hovering highlight
    snapper: ctx.snapper// {Edit2DSnapper} Edit2D snapper
  };
  edit2dTools = edit2d.defaultTools;
  setupProfile();
  setupShapeRule();
  setupTextLabel();
  console.log('Setup Edit2D done!!')
}

function getAllShapes(onlyPoints = false) {
  if (!onlyPoints) return edit2dContext.layer.shapes
  else return (
    edit2dContext.layer.shapes.map((shape) => {
      return shape._loops[0]
    })
  )
}

function startTool(tool) {

  var controller = NOP_VIEWER.toolController;

  // Check if currently active tool is from Edit2D
  var activeTool = controller.getActiveTool();
  var isEdit2D = activeTool && activeTool.getName().startsWith("Edit2");

  // deactivate any previous edit2d tool
  if (isEdit2D) {
    controller.deactivateTool(activeTool.getName());
    activeTool = null;
  }

  // stop editing tools
  if (!tool) {
    return;
  }

  controller.activateTool(tool.getName());
}

const testingPoint = [{ "x": 9.820371627807617, "y": 5.126892566680908 }, { "x": 9.978544235229492, "y": 5.126892566680908 }, { "x": 9.978544235229492, "y": 5.028515338897705 }, { "x": 9.978544235229492, "y": 4.719290733337402 }, { "x": 10.07974624633789, "y": 4.719290733337402 }, { "x": 10.07974624633789, "y": 4.719290733337402 }];

/**
 * Draw a polyline with tag
 * @param {Array(Points)} pts Array of point in x,y coordinate
 * @param {string} tag Text on shape edge
 * @param {number} size Size of tag to display
 * @param {string} layer Layer name use in pestimate
 */
function drawPline(pts, tag, layer, size = "") {
  if (!pts) return;
  const polyline = new Autodesk.Edit2D.Polyline(pts);
  edit2dContext.layer.addShape(polyline);
  updatePline(polyline, tag, layer, size);
}

/**
 * Add tag to polyline
 * @param {Autodesk.Edit2D.Shape} poly Polyline to added tag
 * @param {string} tag Text on shape edge
 * @param {number} size Size of tag to display
 * @param {string} layer Layer name use in pestimate
 */
function updatePline(poly, tag, layer, size = "") {
  let addedLabel = [];
  if (!tag || !poly) return [];
  poly.layer = layer;
  const colorScheme = getLayerColorScheme(layer);
  [...Array(poly.getEdgeCount()).keys()].forEach((i) => {
    let label = new MyEdgeLabel(edit2dContext.layer);
    label.attachToEdge(poly, i);
    label.setText(tag);
    label.setLabelColor(colorScheme.font, colorScheme.background);
    label.setLabelSize(size);
    addedLabel.push(label);
  })
  return addedLabel;
}

const layerInfo = [
  {
    name: "S",
    scheme: { font: "white", background: "orange" }
  },
  {
    name: "F",
    scheme: { font: "black", background: "white" }
  },
  {
    name: "C",
    scheme: { font: "white", background: "red" }
  },
  {
    name: "R",
    scheme: { font: "purple", background: "white" }
  }
]

function getLayerColorScheme(layerName) {
  const layer = layerInfo.find((layer) => (layer.name === layerName));
  return !!layer ? layer.scheme : { font: "", background: "" };
}

function MyEdgeLabel(Edit2DLayer) {
  const label = new Autodesk.Edit2D.EdgeLabel(Edit2DLayer);

  /**
   * set color properties of label
   * @param {CSScolor} fontColor Color of label text
   * @param {CSScolor} backgroundColor Color of label background
   */
  const setLabelColor = (fontColor, backgroundColor) => {
    label.container.style.color = fontColor || "";
    label.container.style.backgroundColor = backgroundColor || "";
  }

  /**
   * Set label size by option 's', 'm', 'l', CSSsize or blank for default
   * @param {option} size Size of label 's' for 'small', 'm' for 'medium', 'l' for 'large' or override by passing size as CSSsize. Leave blank for deault
   */
  const setLabelSize = (size) => {
    switch (size) {
      case "s" || "small":
        label.container.children[0].style.fontSize = "8px"
        break;
      case "m" || "medium":
        label.container.children[0].style.fontSize = "16px"
        break;
      case "l" || "large":
        label.container.children[0].style.fontSize = "24px"
        break;
      default:
        label.container.children[0].style.fontSize = size || "";
        break;
    }
  }

  label.setLabelColor = setLabelColor;
  label.setLabelSize = setLabelSize;

  return (label);
}

function saveMark() {

}

function setupTextLabel(text) {
  let myCircle = createMyCircle(text);
  edit2dTools.insertSymbolTool.symbol = myCircle;
}

function createMyCircle(text) {
  class MyCircle extends Autodesk.Edit2D.Circle {
    constructor(text) {
      super(0, 0, 0.1,
        new Autodesk.Edit2D.Style({
          lineWidth: 0.0000001,
        }));
      this.text = text || "default";
    }

    isPolyline() {
      return false;
    }

    clone() {
      return new MyCircle(text).copy(this);
    }

    copy(from) {
      super.copy(from);
      this.polygon = from.polygon.clone();
      this.centerX = from.centerX;
      this.centerY = from.centerY;
      this.radius = from.radius;
      this.tessSegments = from.tessSegments;
      this.text = from.text
      this.modified();
      return this;
    }

    setRadius(radius) {
      this.radius = radius;
      this.modified();
      this.needsUpdate = true;
      return this;
    }
  }

  return new MyCircle(text);
}

function setupShapeRule() {
  function shapeText(shape) {
    return shape.text;
  }
  class LabelFilter {
    constructor() { }
    accepts(_shape, _text, _layer) { return true }
  }
  class LabelStyleRule {

    constructor() { }

    // Note: Labels may be reused for different shapes. So, make sure that the style parameters are 
    //       not just modified for some subset of shapes, but reset for others.
    apply(label, shape, layer) {
      label.container.style.top = "-20px";
      switch (shape.constructor.name) {
        case "MyCircle":
          break;

        default:
          break;
      }
    }
  };
  return new Autodesk.Edit2D.ShapeLabelRule(edit2dContext.layer, shapeText,
    new LabelFilter(), new LabelStyleRule());
}