;(function() {

    "use strict";
    var root = this, _jp = root.coreTopology, _ju = root.coreTopologyUtil;

    // ------------------------------ BEGIN OverlayCapablecoreTopologyUIComponent --------------------------------------------

    var _internalLabelOverlayId = "__label",
    // this is a shortcut helper method to let people add a label as
    // overlay.
        _makeLabelOverlay = function (component, params) {

            var _params = {
                    cssClass: params.cssClass,
                    labelStyle: component.labelStyle,
                    id: _internalLabelOverlayId,
                    component: component,
                    _coreTopology: component._coreTopology.instance  // TODO not necessary, since the instance can be accessed through the component.
                },
                mergedParams = coreTopology.extend(_params, params);

            return new _jp.Overlays[component._coreTopology.instance.getRenderMode()].Label(mergedParams);
        },
        _processOverlay = function (component, o) {
            var _newOverlay = null;
            if (_ju.isArray(o)) {	// this is for the shorthand ["Arrow", { width:50 }] syntax
                // there's also a three arg version:
                // ["Arrow", { width:50 }, {location:0.7}]
                // which merges the 3rd arg into the 2nd.
                var type = o[0],
                // make a copy of the object so as not to mess up anyone else's reference...
                    p = _jp.extend({component: component, _coreTopology: component._coreTopology.instance}, o[1]);
                if (o.length == 3) _jp.extend(p, o[2]);
                _newOverlay = new _jp.Overlays[component._coreTopology.instance.getRenderMode()][type](p);
            } else if (o.constructor == String) {
                _newOverlay = new _jp.Overlays[component._coreTopology.instance.getRenderMode()][o]({component: component, _coreTopology: component._coreTopology.instance});
            } else {
                _newOverlay = o;
            }

            _newOverlay.id = _newOverlay.id || _ju.uuid();
            component.cacheTypeItem("overlay", _newOverlay, _newOverlay.id);
            //component._coreTopology.overlays.push(_newOverlay);
            component._coreTopology.overlays[_newOverlay.id] = _newOverlay;

            return _newOverlay;
        };

    _jp.OverlayCapableJsPlumbUIComponent = function (params) {

        coreTopologyUIComponent.apply(this, arguments);
        this._coreTopology.overlays = {};
        this._coreTopology.overlayPositions = {};

        if (params.label) {
            this.getDefaultType().overlays[_internalLabelOverlayId] = ["Label", {
                label: params.label,
                location: params.labelLocation || this.defaultLabelLocation || 0.5,
                labelStyle: params.labelStyle || this._coreTopology.instance.Defaults.LabelStyle,
                id:_internalLabelOverlayId
            }];
        }

        this.setListenerComponent = function (c) {
            if (this._coreTopology) {
                for (var i in this._coreTopology.overlays)
                    this._coreTopology.overlays[i].setListenerComponent(c);
            }
        };
    };

    _jp.OverlayCapableJsPlumbUIComponent.applyType = function (component, t) {
        if (t.overlays) {
            // loop through the ones in the type. if already present on the component,
            // dont remove or re-add.
            var keep = {}, i;

            for (i in t.overlays) {

                var existing = component._coreTopology.overlays[t.overlays[i][1].id];
                if (existing) {
                    // maybe update from data, if there were parameterised values for instance.
                    existing.updateFrom(t.overlays[i][1]);
                    keep[t.overlays[i][1].id] = true;
                }
                else {
                    var c = component.getCachedTypeItem("overlay", t.overlays[i][1].id);
                    if (c != null) {
                        c.reattach(component._coreTopology.instance);
                        // maybe update from data, if there were parameterised values for instance.
                        c.updateFrom(t.overlays[i][1]);
                        component._coreTopology.overlays[c.id] = c;
                    }
                    else {
                        c = component.addOverlay(t.overlays[i], true);
                    }
                    keep[c.id] = true;
                }
            }

            // now loop through the full overlays and remove those that we dont want to keep
            for (i in component._coreTopology.overlays) {
                if (keep[component._coreTopology.overlays[i].id] == null)
                    component.removeOverlay(component._coreTopology.overlays[i].id, true); // remove overlay but dont clean it up.
                    // that would remove event listeners etc; overlays are never discarded by the types stuff, they are
                    // just detached/reattached.
            }
        }
    };

    _ju.extend(_jp.OverlayCapableJsPlumbUIComponent, root.coreTopologyUIComponent, {

        setHover: function (hover, ignoreAttachedElements) {
            if (this._coreTopology && !this._coreTopology.instance.isConnectionBeingDragged()) {
                for (var i in this._coreTopology.overlays) {
                    this._coreTopology.overlays[i][hover ? "addClass" : "removeClass"](this._coreTopology.instance.hoverClass);
                }
            }
        },
        addOverlay: function (overlay, doNotRepaint) {
            var o = _processOverlay(this, overlay);
            if (!doNotRepaint) this.repaint();
            return o;
        },
        getOverlay: function (id) {
            return this._coreTopology.overlays[id];
        },
        getOverlays: function () {
            return this._coreTopology.overlays;
        },
        hideOverlay: function (id) {
            var o = this.getOverlay(id);
            if (o) o.hide();
        },
        hideOverlays: function () {
            for (var i in this._coreTopology.overlays)
                this._coreTopology.overlays[i].hide();
        },
        showOverlay: function (id) {
            var o = this.getOverlay(id);
            if (o) o.show();
        },
        showOverlays: function () {
            for (var i in this._coreTopology.overlays)
                this._coreTopology.overlays[i].show();
        },
        removeAllOverlays: function (doNotRepaint) {
            for (var i in this._coreTopology.overlays) {
                if (this._coreTopology.overlays[i].cleanup) this._coreTopology.overlays[i].cleanup();
            }

            this._coreTopology.overlays = {};
            this._coreTopology.overlayPositions = null;
            if (!doNotRepaint)
                this.repaint();
        },
        removeOverlay: function (overlayId, dontCleanup) {
            var o = this._coreTopology.overlays[overlayId];
            if (o) {
                if (!dontCleanup && o.cleanup) o.cleanup();
                delete this._coreTopology.overlays[overlayId];
                if (this._coreTopology.overlayPositions)
                    delete this._coreTopology.overlayPositions[overlayId];
            }
        },
        removeOverlays: function () {
            for (var i = 0, j = arguments.length; i < j; i++)
                this.removeOverlay(arguments[i]);
        },
        moveParent: function (newParent) {
            if (this.bgCanvas) {
                this.bgCanvas.parentNode.removeChild(this.bgCanvas);
                newParent.appendChild(this.bgCanvas);
            }

            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
                newParent.appendChild(this.canvas);

                for (var i in this._coreTopology.overlays) {
                    if (this._coreTopology.overlays[i].isAppendedAtTopLevel) {
                        var el = this._coreTopology.overlays[i].getElement();
                        el.parentNode.removeChild(el);
                        newParent.appendChild(el);
                    }
                }
            }
        },
        getLabel: function () {
            var lo = this.getOverlay(_internalLabelOverlayId);
            return lo != null ? lo.getLabel() : null;
        },
        getLabelOverlay: function () {
            return this.getOverlay(_internalLabelOverlayId);
        },
        setLabel: function (l) {
            var lo = this.getOverlay(_internalLabelOverlayId);
            if (!lo) {
                var params = l.constructor == String || l.constructor == Function ? { label: l } : l;
                lo = _makeLabelOverlay(this, params);
                this._coreTopology.overlays[_internalLabelOverlayId] = lo;
            }
            else {
                if (l.constructor == String || l.constructor == Function) lo.setLabel(l);
                else {
                    if (l.label) lo.setLabel(l.label);
                    if (l.location) lo.setLocation(l.location);
                }
            }

            if (!this._coreTopology.instance.isSuspendDrawing())
                this.repaint();
        },
        cleanup: function (force) {
            for (var i in this._coreTopology.overlays) {
                this._coreTopology.overlays[i].cleanup(force);
                this._coreTopology.overlays[i].destroy(force);
            }
            if (force) {
                this._coreTopology.overlays = {};
                this._coreTopology.overlayPositions = null;
            }
        },
        setVisible: function (v) {
            this[v ? "showOverlays" : "hideOverlays"]();
        },
        setAbsoluteOverlayPosition: function (overlay, xy) {
            this._coreTopology.overlayPositions[overlay.id] = xy;
        },
        getAbsoluteOverlayPosition: function (overlay) {
            return this._coreTopology.overlayPositions ? this._coreTopology.overlayPositions[overlay.id] : null;
        },
        _clazzManip:function(action, clazz, dontUpdateOverlays) {
            if (!dontUpdateOverlays) {
                for (var i in this._coreTopology.overlays) {
                    this._coreTopology.overlays[i][action + "Class"](clazz);
                }
            }
        },
        addClass:function(clazz, dontUpdateOverlays) {
            this._clazzManip("add", clazz, dontUpdateOverlays)
        },
        removeClass:function(clazz, dontUpdateOverlays) {
            this._clazzManip("remove", clazz, dontUpdateOverlays)
        }
    });

// ------------------------------ END OverlayCapablecoreTopologyUIComponent --------------------------------------------

}).call(window);
