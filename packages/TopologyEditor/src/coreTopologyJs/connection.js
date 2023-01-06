;(function () {

    "use strict";
    var root = this,
        _jp = root.coreTopology,
        _ju = root.coreTopologyUtil;

    var makeConnector = function (_coreTopology, renderMode, connectorName, connectorArgs, forComponent) {
            if (!_coreTopology.Defaults.DoNotThrowErrors && coreTopology.Connectors[renderMode][connectorName] == null)
                throw { msg: "coreTopology: unknown connector type '" + connectorName + "'" };

            return new _jp.Connectors[renderMode][connectorName](connectorArgs, forComponent);
        },
        _makeAnchor = function (anchorParams, elementId, _coreTopology) {
            return (anchorParams) ? _coreTopology.makeAnchor(anchorParams, elementId, _coreTopology) : null;
        },
        _updateConnectedClass = function (conn, element, _coreTopology, remove) {
            if (element != null) {
                element._coreTopologyConnections = element._coreTopologyConnections || {};
                if (remove)
                    delete element._coreTopologyConnections[conn.id];
                else
                    element._coreTopologyConnections[conn.id] = true;

                if (_ju.isEmpty(element._coreTopologyConnections)) {
                    _coreTopology.removeClass(element, _coreTopology.connectedClass);
                }
                else
                    _coreTopology.addClass(element, _coreTopology.connectedClass);
            }
        };

    _jp.Connection = function (params) {
        var _newEndpoint = params.newEndpoint;

        this.id = params.id;
        this.connector = null;
        this.idPrefix = "_coretopology_c_";
        this.defaultLabelLocation = 0.5;
        this.defaultOverlayKeys = ["Overlays", "ConnectionOverlays"];
        // if a new connection is the result of moving some existing connection, params.previousConnection
        // will have that Connection in it. listeners for the coreTopologyConnection event can look for that
        // member and take action if they need to.
        this.previousConnection = params.previousConnection;
        this.source = _jp.getElement(params.source);
        this.target = _jp.getElement(params.target);
        // sourceEndpoint and targetEndpoint override source/target, if they are present. but 
        // source is not overridden if the Endpoint has declared it is not the final target of a connection;
        // instead we use the source that the Endpoint declares will be the final source element.
        if (params.sourceEndpoint) this.source = params.sourceEndpoint.getElement();
        if (params.targetEndpoint) this.target = params.targetEndpoint.getElement();

        _jp.OverlayCapableJsPlumbUIComponent.apply(this, arguments);

        this.sourceId = this._coreTopology.instance.getId(this.source);
        this.targetId = this._coreTopology.instance.getId(this.target);
        this.scope = params.scope; // scope may have been passed in to the connect call. if it wasn't, we will pull it from the source endpoint, after having initialised the endpoints.            
        this.endpoints = [];
        this.endpointStyles = [];

        var _coreTopology = this._coreTopology.instance;

        _coreTopology.manage(this.sourceId, this.source);
        _coreTopology.manage(this.targetId, this.target);

        this._coreTopology.visible = true;
        this._coreTopology.editable = params.editable === true;
        this._coreTopology.params = {
            cssClass: params.cssClass,
            container: params.container,
            "pointer-events": params["pointer-events"],
            editorParams: params.editorParams,
            overlays: params.overlays
        };
        this._coreTopology.lastPaintedAt = null;

        // listen to mouseover and mouseout events passed from the container delegate.
        this.bind("mouseover", function () {
            this.setHover(true);
        }.bind(this));
        this.bind("mouseout", function () {
            this.setHover(false);
        }.bind(this));

        this.editableRequested = params.editable !== false;
        this.setEditable = function(e) {
            return this.connector ? this.connector.setEditable(e) : false;
        };
        this.isEditable = function() { return this.connector ? this.connector.isEditable() : false; };
        this.isEditing = function() { return this.connector ? this.connector.isEditing() : false; };

// INITIALISATION CODE

        this.makeEndpoint = function (isSource, el, elId, ep) {
            elId = elId || this._coreTopology.instance.getId(el);
            return this.prepareEndpoint(_coreTopology, _newEndpoint, this, ep, isSource ? 0 : 1, params, el, elId);
        };

        // if type given, get the endpoint definitions mapping to that type from the coretopology instance, and use those.
        // we apply types at the end of this constructor but endpoints are only honoured in a type definition at
        // create time.
        if (params.type) {
            params.endpoints = this._coreTopology.instance.deriveEndpointAndAnchorSpec(params.type).endpoints;
        }

        var eS = this.makeEndpoint(true, this.source, this.sourceId, params.sourceEndpoint),
            eT = this.makeEndpoint(false, this.target, this.targetId, params.targetEndpoint);

        if (eS) _ju.addToList(params.endpointsByElement, this.sourceId, eS);
        if (eT) _ju.addToList(params.endpointsByElement, this.targetId, eT);
        // if scope not set, set it to be the scope for the source endpoint.
        if (!this.scope) this.scope = this.endpoints[0].scope;

        // if explicitly told to (or not to) delete endpoints on detach, override endpoint's preferences
        if (params.deleteEndpointsOnDetach != null) {
            this.endpoints[0]._deleteOnDetach = params.deleteEndpointsOnDetach;
            this.endpoints[1]._deleteOnDetach = params.deleteEndpointsOnDetach;
        }
        else {
            // otherwise, unless the endpoints say otherwise, mark them for deletion.
            if (!this.endpoints[0]._doNotDeleteOnDetach) this.endpoints[0]._deleteOnDetach = true;
            if (!this.endpoints[1]._doNotDeleteOnDetach) this.endpoints[1]._deleteOnDetach = true;
        }

// -------------------------- DEFAULT TYPE ---------------------------------------------

        // DETACHABLE
        var _detachable = _coreTopology.Defaults.ConnectionsDetachable;
        if (params.detachable === false) _detachable = false;
        if (this.endpoints[0].connectionsDetachable === false) _detachable = false;
        if (this.endpoints[1].connectionsDetachable === false) _detachable = false;
        // REATTACH
        var _reattach = params.reattach || this.endpoints[0].reattachConnections || this.endpoints[1].reattachConnections || _coreTopology.Defaults.ReattachConnections;

        this.appendToDefaultType({
            detachable: _detachable,
            reattach: _reattach,
            paintStyle:this.endpoints[0].connectorStyle || this.endpoints[1].connectorStyle || params.paintStyle || _coreTopology.Defaults.PaintStyle || coreTopology.Defaults.PaintStyle,
            hoverPaintStyle:this.endpoints[0].connectorHoverStyle || this.endpoints[1].connectorHoverStyle || params.hoverPaintStyle || _coreTopology.Defaults.HoverPaintStyle || coreTopology.Defaults.HoverPaintStyle
        });


        var _suspendedAt = _coreTopology.getSuspendedAt();
        if (!_coreTopology.isSuspendDrawing()) {
            // paint the endpoints
            var myInfo = _coreTopology.getCachedData(this.sourceId),
                myOffset = myInfo.o, myWH = myInfo.s,
                otherInfo = _coreTopology.getCachedData(this.targetId),
                otherOffset = otherInfo.o,
                otherWH = otherInfo.s,
                initialTimestamp = _suspendedAt || _coreTopology.timestamp(),
                anchorLoc = this.endpoints[0].anchor.compute({
                    xy: [ myOffset.left, myOffset.top ], wh: myWH, element: this.endpoints[0],
                    elementId: this.endpoints[0].elementId,
                    txy: [ otherOffset.left, otherOffset.top ], twh: otherWH, tElement: this.endpoints[1],
                    timestamp: initialTimestamp
                });

            this.endpoints[0].paint({ anchorLoc: anchorLoc, timestamp: initialTimestamp });

            anchorLoc = this.endpoints[1].anchor.compute({
                xy: [ otherOffset.left, otherOffset.top ], wh: otherWH, element: this.endpoints[1],
                elementId: this.endpoints[1].elementId,
                txy: [ myOffset.left, myOffset.top ], twh: myWH, tElement: this.endpoints[0],
                timestamp: initialTimestamp
            });
            this.endpoints[1].paint({ anchorLoc: anchorLoc, timestamp: initialTimestamp });
        }

        this.getTypeDescriptor = function () {
            return "connection";
        };
        this.getAttachedElements = function () {
            return this.endpoints;
        };

        this.isDetachable = function () {
            return this._coreTopology.detachable === true;
        };
        this.setDetachable = function (detachable) {
            this._coreTopology.detachable = detachable === true;
        };
        this.isReattach = function () {
            return this._coreTopology.reattach === true || this.endpoints[0].reattachConnections === true || this.endpoints[1].reattachConnections === true;
        };
        this.setReattach = function (reattach) {
            this._coreTopology.reattach = reattach === true;
        };

// END INITIALISATION CODE


// COST + DIRECTIONALITY
        // if cost not supplied, try to inherit from source endpoint
        this._coreTopology.cost = params.cost || this.endpoints[0].getConnectionCost();
        this._coreTopology.directed = params.directed;
        // inherit directed flag if set no source endpoint
        if (params.directed == null) this._coreTopology.directed = this.endpoints[0].areConnectionsDirected();
// END COST + DIRECTIONALITY

// PARAMETERS
        // merge all the parameters objects into the connection.  parameters set
        // on the connection take precedence; then source endpoint params, then
        // finally target endpoint params.
        var _p = coreTopology.extend({}, this.endpoints[1].getParameters());
        _jp.extend(_p, this.endpoints[0].getParameters());
        _jp.extend(_p, this.getParameters());
        this.setParameters(_p);
// END PARAMETERS

// PAINTING

        this.setConnector(this.endpoints[0].connector || this.endpoints[1].connector || params.connector || _coreTopology.Defaults.Connector || _jp.Defaults.Connector, true);
        if (params.geometry) {
            this.connector.setGeometry(params.geometry);
        }
        var data = params.data == null || !coreTopologyUtil.isObject(params.data) ? {} : params.data;
        this.getData = function() { return data; };
        this.setData = function(d) { data = d || {}; };
        this.mergeData = function(d) { data = coreTopology.extend(data, d); };

        // the very last thing we do is apply types, if there are any.
        var _types = [ "default", this.endpoints[0].connectionType, this.endpoints[1].connectionType,  params.type ].join(" ");
        if (/[^\s]/.test(_types))
            this.addType(_types, params.data, true);

        this.updateConnectedClass();

// END PAINTING    
    };

    _ju.extend(_jp.Connection, _jp.OverlayCapableJsPlumbUIComponent, {
        applyType: function (t, doNotRepaint, typeMap) {

            // none of these things result in the creation of objects so can be ignored.
            if (t.detachable != null) this.setDetachable(t.detachable);
            if (t.reattach != null) this.setReattach(t.reattach);
            if (t.scope) this.scope = t.scope;

            if (t.cssClass != null && this.canvas) this._coreTopology.instance.addClass(this.canvas, t.cssClass);

            var _anchors = null;
            // this also results in the creation of objects.
            if (t.anchor) {
                // note that even if the param was anchor, we store `anchors`.
                _anchors = this.getCachedTypeItem("anchors", typeMap.anchor);
                if (_anchors == null) {
                    _anchors = [ this._coreTopology.instance.makeAnchor(t.anchor), this._coreTopology.instance.makeAnchor(t.anchor) ];
                    this.cacheTypeItem("anchors", _anchors, typeMap.anchor);
                }
            }
            else if (t.anchors) {
                _anchors = this.getCachedTypeItem("anchors", typeMap.anchors);
                if (_anchors == null) {
                    _anchors = [
                        this._coreTopology.instance.makeAnchor(t.anchors[0]),
                        this._coreTopology.instance.makeAnchor(t.anchors[1])
                    ];
                    this.cacheTypeItem("anchors", _anchors, typeMap.anchors);
                }
            }
            if (_anchors != null) {
                this.endpoints[0].anchor = _anchors[0];
                this.endpoints[1].anchor = _anchors[1];
                if (this.endpoints[1].anchor.isDynamic) this._coreTopology.instance.repaint(this.endpoints[1].elementId);
            }

            _jp.OverlayCapableJsPlumbUIComponent.applyType(this, t);
        },
        addClass: function (c, informEndpoints) {
            if (informEndpoints) {
                this.endpoints[0].addClass(c);
                this.endpoints[1].addClass(c);
                if (this.suspendedEndpoint) this.suspendedEndpoint.addClass(c);
            }
            if (this.connector) {
                this.connector.addClass(c);
            }
        },
        removeClass: function (c, informEndpoints) {
            if (informEndpoints) {
                this.endpoints[0].removeClass(c);
                this.endpoints[1].removeClass(c);
                if (this.suspendedEndpoint) this.suspendedEndpoint.removeClass(c);
            }
            if (this.connector) {
                this.connector.removeClass(c);
            }
        },
        isVisible: function () {
            return this._coreTopology.visible;
        },
        setVisible: function (v) {
            this._coreTopology.visible = v;
            if (this.connector)
                this.connector.setVisible(v);
            this.repaint();
        },
        cleanup: function () {
            this.updateConnectedClass(true);
            this.endpoints = null;
            this.source = null;
            this.target = null;
            if (this.connector != null) {
                this.connector.cleanup(true);
                this.connector.destroy(true);
            }
            this.connector = null;
        },
        updateConnectedClass:function(remove) {
            if (this._coreTopology) {
                _updateConnectedClass(this, this.source, this._coreTopology.instance, remove);
                _updateConnectedClass(this, this.target, this._coreTopology.instance, remove);
            }
        },
        setHover: function (state) {
            if (this.connector && this._coreTopology && !this._coreTopology.instance.isConnectionBeingDragged()) {
                this.connector.setHover(state);
                root.coreTopology[state ? "addClass" : "removeClass"](this.source, this._coreTopology.instance.hoverSourceClass);
                root.coreTopology[state ? "addClass" : "removeClass"](this.target, this._coreTopology.instance.hoverTargetClass);
            }
        },
        getUuids:function() {
            return [ this.endpoints[0].getUuid(), this.endpoints[1].getUuid() ];
        },
        getCost: function () {
            return this._coreTopology ? this._coreTopology.cost : -Infinity;
        },
        setCost: function (c) {
            this._coreTopology.cost = c;
        },
        isDirected: function () {
            return this._coreTopology.directed === true;
        },
        getConnector: function () {
            return this.connector;
        },
        getGeometry : function() { return this.connector ? this.connector.getGeometry() : null; },
        setGeometry : function(g) { if (this.connector) this.connector.setGeometry(g); },
        prepareConnector:function(connectorSpec, typeId) {
            var connectorArgs = {
                    _coreTopology: this._coreTopology.instance,
                    cssClass: (this._coreTopology.params.cssClass || "") + (this.isEditable() ? this._coreTopology.instance.editableConnectorClass : ""),
                    container: this._coreTopology.params.container,
                    "pointer-events": this._coreTopology.params["pointer-events"],
                    editable:this.editableRequested
                },
                renderMode = this._coreTopology.instance.getRenderMode(),
                connector;

            if (_ju.isString(connectorSpec))
                connector = makeConnector(this._coreTopology.instance, renderMode, connectorSpec, connectorArgs, this); // lets you use a string as shorthand.
            else if (_ju.isArray(connectorSpec)) {
                if (connectorSpec.length == 1)
                    connector = makeConnector(this._coreTopology.instance, renderMode, connectorSpec[0], connectorArgs, this);
                else
                    connector = makeConnector(this._coreTopology.instance, renderMode, connectorSpec[0], _ju.merge(connectorSpec[1], connectorArgs), this);
            }
            if (typeId != null) connector.typeId = typeId;
            return connector;
        },
        setPreparedConnector: function(connector, doNotRepaint, doNotChangeListenerComponent, typeId) {

            var previous, previousClasses = "";
            // the connector will not be cleaned up if it was set as part of a type, because `typeId` will be set on it
            // and we havent passed in `true` for "force" here.
            if (this.connector != null) {
                previous = this.connector;
                previousClasses = previous.getClass();
                this.connector.cleanup();
                this.connector.destroy();
            }

            this.connector = connector;
            if (typeId) {
                this.cacheTypeItem("connector", connector, typeId);
            }

            this.canvas = this.connector.canvas;
            this.bgCanvas = this.connector.bgCanvas;

            // put classes from prior connector onto the canvas
            this.addClass(previousClasses);

            // new: instead of binding listeners per connector, we now just have one delegate on the container.
            // so for that handler we set the connection as the '_coreTopology' member of the canvas element, and
            // bgCanvas, if it exists, which it does right now in the VML renderer, so it won't from v 2.0.0 onwards.
            if (this.canvas) this.canvas._coreTopology = this;
            if (this.bgCanvas) this.bgCanvas._coreTopology = this;

            if (previous != null) {
                var o = this.getOverlays();
                for (var i = 0; i < o.length; i++) {
                    if (o[i].transfer) o[i].transfer(this.connector);
                }
            }

            if (!doNotChangeListenerComponent) this.setListenerComponent(this.connector);
            if (!doNotRepaint) this.repaint();
        },
        setConnector: function (connectorSpec, doNotRepaint, doNotChangeListenerComponent, typeId) {
            var connector = this.prepareConnector(connectorSpec, typeId);
            this.setPreparedConnector(connector, doNotRepaint, doNotChangeListenerComponent, typeId);
        },
        paint: function (params) {

            if (!this._coreTopology.instance.isSuspendDrawing() && this._coreTopology.visible) {
                params = params || {};
                var timestamp = params.timestamp,
                // if the moving object is not the source we must transpose the two references.
                    swap = false,
                    tId = swap ? this.sourceId : this.targetId, sId = swap ? this.targetId : this.sourceId,
                    tIdx = swap ? 0 : 1, sIdx = swap ? 1 : 0;

                if (timestamp == null || timestamp != this._coreTopology.lastPaintedAt) {
                    var sourceInfo = this._coreTopology.instance.updateOffset({elId:sId}).o,
                        targetInfo = this._coreTopology.instance.updateOffset({elId:tId}).o,
                        sE = this.endpoints[sIdx], tE = this.endpoints[tIdx];

                    var sAnchorP = sE.anchor.getCurrentLocation({xy: [sourceInfo.left, sourceInfo.top], wh: [sourceInfo.width, sourceInfo.height], element: sE, timestamp: timestamp}),
                        tAnchorP = tE.anchor.getCurrentLocation({xy: [targetInfo.left, targetInfo.top], wh: [targetInfo.width, targetInfo.height], element: tE, timestamp: timestamp});

                    this.connector.resetBounds();

                    this.connector.compute({
                        sourcePos: sAnchorP,
                        targetPos: tAnchorP,
                        sourceEndpoint: this.endpoints[sIdx],
                        targetEndpoint: this.endpoints[tIdx],
                        lineWidth: this._coreTopology.paintStyleInUse.lineWidth,
                        sourceInfo: sourceInfo,
                        targetInfo: targetInfo
                    });

                    var overlayExtents = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

                    // compute overlays. we do this first so we can get their placements, and adjust the
                    // container if needs be (if an overlay would be clipped)
                    for (var i in this._coreTopology.overlays) {
                        if (this._coreTopology.overlays.hasOwnProperty(i)) {
                            var o = this._coreTopology.overlays[i];
                            if (o.isVisible()) {
                                this._coreTopology.overlayPlacements[i] = o.draw(this.connector, this._coreTopology.paintStyleInUse, this.getAbsoluteOverlayPosition(o));
                                overlayExtents.minX = Math.min(overlayExtents.minX, this._coreTopology.overlayPlacements[i].minX);
                                overlayExtents.maxX = Math.max(overlayExtents.maxX, this._coreTopology.overlayPlacements[i].maxX);
                                overlayExtents.minY = Math.min(overlayExtents.minY, this._coreTopology.overlayPlacements[i].minY);
                                overlayExtents.maxY = Math.max(overlayExtents.maxY, this._coreTopology.overlayPlacements[i].maxY);
                            }
                        }
                    }

                    var lineWidth = parseFloat(this._coreTopology.paintStyleInUse.lineWidth || 1) / 2,
                        outlineWidth = parseFloat(this._coreTopology.paintStyleInUse.lineWidth || 0),
                        extents = {
                            xmin: Math.min(this.connector.bounds.minX - (lineWidth + outlineWidth), overlayExtents.minX),
                            ymin: Math.min(this.connector.bounds.minY - (lineWidth + outlineWidth), overlayExtents.minY),
                            xmax: Math.max(this.connector.bounds.maxX + (lineWidth + outlineWidth), overlayExtents.maxX),
                            ymax: Math.max(this.connector.bounds.maxY + (lineWidth + outlineWidth), overlayExtents.maxY)
                        };
                    // paint the connector.
                    this.connector.paint(this._coreTopology.paintStyleInUse, null, extents);
                    // and then the overlays
                    for (var j in this._coreTopology.overlays) {
                        if (this._coreTopology.overlays.hasOwnProperty(j)) {
                            var p = this._coreTopology.overlays[j];
                            if (p.isVisible()) {
                                p.paint(this._coreTopology.overlayPlacements[j], extents);
                            }
                        }
                    }
                }
                this._coreTopology.lastPaintedAt = timestamp;
            }
        },
        repaint: function (params) {
            params = params || {};
            this.paint({ elId: this.sourceId, recalc: !(params.recalc === false), timestamp: params.timestamp});
        },
        prepareEndpoint: function (_coreTopology, _newEndpoint, conn, existing, index, params, element, elementId) {
            var e;
            if (existing) {
                conn.endpoints[index] = existing;
                existing.addConnection(conn);
            } else {
                if (!params.endpoints) params.endpoints = [ null, null ];
                var ep = params.endpoints[index] || params.endpoint || _coreTopology.Defaults.Endpoints[index] || coreTopology.Defaults.Endpoints[index] || _coreTopology.Defaults.Endpoint || coreTopology.Defaults.Endpoint;
                if (!params.endpointStyles) params.endpointStyles = [ null, null ];
                if (!params.endpointHoverStyles) params.endpointHoverStyles = [ null, null ];
                var es = params.endpointStyles[index] || params.endpointStyle || _coreTopology.Defaults.EndpointStyles[index] || coreTopology.Defaults.EndpointStyles[index] || _coreTopology.Defaults.EndpointStyle || coreTopology.Defaults.EndpointStyle;
                // Endpoints derive their fillStyle from the connector's strokeStyle, if no fillStyle was specified.
                if (es.fillStyle == null && params.paintStyle != null)
                    es.fillStyle = params.paintStyle.strokeStyle;

                if (es.outlineColor == null && params.paintStyle != null)
                    es.outlineColor = params.paintStyle.outlineColor;
                if (es.outlineWidth == null && params.paintStyle != null)
                    es.outlineWidth = params.paintStyle.outlineWidth;

                var ehs = params.endpointHoverStyles[index] || params.endpointHoverStyle || _coreTopology.Defaults.EndpointHoverStyles[index] || coreTopology.Defaults.EndpointHoverStyles[index] || _coreTopology.Defaults.EndpointHoverStyle || coreTopology.Defaults.EndpointHoverStyle;
                // endpoint hover fill style is derived from connector's hover stroke style
                if (params.hoverPaintStyle != null) {
                    if (ehs == null) ehs = {};
                    if (ehs.fillStyle == null) {
                        ehs.fillStyle = params.hoverPaintStyle.strokeStyle;
                    }
                }
                var a = params.anchors ? params.anchors[index] :
                        params.anchor ? params.anchor :
                            _makeAnchor(_coreTopology.Defaults.Anchors[index], elementId, _coreTopology) ||
                            _makeAnchor(_jp.Defaults.Anchors[index], elementId, _coreTopology) ||
                            _makeAnchor(_coreTopology.Defaults.Anchor, elementId, _coreTopology) ||
                            _makeAnchor(_jp.Defaults.Anchor, elementId, _coreTopology),
                    u = params.uuids ? params.uuids[index] : null;

                e = _newEndpoint({
                    paintStyle: es, hoverPaintStyle: ehs, endpoint: ep, connections: [ conn ],
                    uuid: u, anchor: a, source: element, scope: params.scope,
                    reattach: params.reattach || _coreTopology.Defaults.ReattachConnections,
                    detachable: params.detachable || _coreTopology.Defaults.ConnectionsDetachable
                });
                conn.endpoints[index] = e;

                if (params.drawEndpoints === false) e.setVisible(false, true, true);

            }
            return e;
        }

    }); // END Connection class            
}).call(window);
