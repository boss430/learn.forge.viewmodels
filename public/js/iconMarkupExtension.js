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

function IconMarkupExt(viewer, options) {
    let icons = !!options.icons ? options.icons : [];
    let group = null;
    let button = null;
    let enabled = false;

    const load = () => {
        const updateIconsCallback = () => {
            if (enabled) {
                updateIcons();
            }
        };
        viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, updateIconsCallback);
        viewer.addEventListener(Autodesk.Viewing.ISOLATE_EVENT, updateIconsCallback);
        viewer.addEventListener(Autodesk.Viewing.HIDE_EVENT, updateIconsCallback);
        viewer.addEventListener(Autodesk.Viewing.SHOW_EVENT, updateIconsCallback);
        return true;
    }

    const unload = () => {
        // Clean our UI elements if we added any
        if (group) {
            group.removeControl(button);
            if (group.getNumberOfControls() === 0) {
                viewer.toolbar.removeControl(group);
            }
        }

        return true;
    }

    const onToolbarCreated = () => {
        // Create a new toolbar group if it doesn't exist
        group = viewer.toolbar.getControl('customExtensions');
        if (!group) {
            group = new Autodesk.Viewing.UI.ControlGroup('customExtensions');
            viewer.toolbar.addControl(group);
        }

        // Add a new button to the toolbar group
        button = new Autodesk.Viewing.UI.Button('IconExtension');
        button.onClick = (ev) => {
            enabled = !enabled;
            showIcons(enabled);
            button.setState(enabled ? 0 : 1);

        };
        button.setToolTip(options.button.tooltip);
        button.container.children[0].classList.add('fas', options.button.icon);
        group.addControl(button);
    }

    const showIcons = (show) => {
        const $viewer = $('#' + viewer.clientContainer.id + ' div.adsk-viewing-viewer');

        // remove previous...
        $('#' + viewer.clientContainer.id + ' div.adsk-viewing-viewer label.markup').remove();
        if (!show) return;

        // do we have anything to show?
        if (icons === undefined || icons === null) return;

        // do we have access to the instance tree?
        const tree = viewer.model.getInstanceTree();
        if (tree === undefined) { console.log('Loading tree...'); return; }

        const onClick = (e) => {
            if (options.onClick)
                options.onClick($(e.currentTarget).data('id'));
        };
        frags = {}
        for (var i = 0; i < icons.length; i++) {
            // we need to collect all the fragIds for a given dbId
            const icon = icons[i];
            frags['dbId' + icon.dbId] = []

            // create the label for the dbId
            const $label = $(`
            <label class="markup update" data-id="${icon.dbId}">
                <span> ${icon.label || ''}</span>
            </label>
            `);
            $label.css('display', viewer.isNodeVisible(icon.dbId) ? 'block' : 'none');
            $label.css('position', 'absolute')
            $label.css('color', '#000')
            $label.css('color', '#000')
            $label.css('background-color', '#FFF')
            $label.css('padding', '3px')
            $label.on('click', onClick);
            $viewer.append($label);

            // now collect the fragIds
            tree.enumNodeFragments(icon.dbId, function (fragId) {
                frags['dbId' + icon.dbId].push(fragId);
                updateIcons(); // re-position of each fragId found
            });
        }
    }

    const getModifiedWorldBoundingBox = (dbId) => {
        var fragList = viewer.model.getFragmentList();
        const nodebBox = new THREE.Box3()

        // for each fragId on the list, get the bounding box
        for (const fragId of frags['dbId' + dbId]) {
            const fragbBox = new THREE.Box3();
            fragList.getWorldBounds(fragId, fragbBox);
            nodebBox.union(fragbBox); // create a unifed bounding box
        }

        return nodebBox
    }

    const updateIcons = () => {
        for (const label of $('#' + viewer.clientContainer.id + ' div.adsk-viewing-viewer .update')) {
            const $label = $(label);
            const id = $label.data('id');

            // get the center of the dbId (based on its fragIds bounding boxes)
            // const pos = viewer.worldToClient(getModifiedWorldBoundingBox(id).center());

            const pos = viewer.worldToClient(getModifiedWorldBoundingBox(id).center());

            // position the label center to it
            $label.css('left', Math.floor(pos.x - $label[0].offsetWidth / 2) + 'px');
            $label.css('top', Math.floor(pos.y - $label[0].offsetHeight / 2) + 'px');
            $label.css('display', viewer.isNodeVisible(id) ? 'block' : 'none');
        }
    }

    return {
        viewer: viewer,
        options: options,
        load: load,
        unload: unload,
        onToolbarCreated: onToolbarCreated
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('IconMarkupExtension', IconMarkupExt);